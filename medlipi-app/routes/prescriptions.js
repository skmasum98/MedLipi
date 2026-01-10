import express from 'express';
import pool from '../db.js';
import PDFDocument from 'pdfkit';
import verifyToken from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid'; 
import QRCode from 'qrcode';
import path from 'path';
import { fileURLToPath } from 'url';

// Define __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Ensure this path matches where you put the TTF file
const fontPath = path.join(__dirname, '../fonts/HindSiliguri-Regular.ttf'); 
const fontBoldPath = path.join(__dirname, '../fonts/HindSiliguri-SemiBold.ttf');

const router = express.Router();
router.use(verifyToken);

// --- GET Recent Patient Visits ---
router.get('/recent', async (req, res) => {
    const doctorId = req.user.role === 'doctor' ? req.user.id : req.user.parentId;
    try {
        const query = `
            SELECT 
                p.patient_id, p.name, p.age, p.gender, 
                MAX(pr.created_at) as visit_date,
                MAX(pr.diagnosis_text) as diagnosis
            FROM prescriptions pr
            JOIN patients p ON pr.patient_id = p.patient_id
            WHERE pr.doctor_id = ?
            GROUP BY p.patient_id, p.name, p.age, p.gender, DATE(pr.created_at) 
            ORDER BY visit_date DESC
            LIMIT 10
        `;
        const [recent] = await pool.query(query, [doctorId]);
        res.json(recent);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// --- POST Create New Prescription ---
router.post('/', async (req, res) => {
    const { 
        patient, prescriptions, diagnosis_text, general_advice, 
        chief_complaint, medical_history, examination_findings, 
        investigations, follow_up_date 
    } = req.body;
    
    // Safety for Staff creating RX
    const doctorId = req.user.role === 'doctor' ? req.user.id : req.user.parentId;
    
    const batchDate = new Date(); 
    const publicUid = uuidv4(); 

    let connection;

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        let patientId = patient.id; 

        // 1. Insert or Update Patient
        if (!patientId) {
            const patientQuery = `INSERT INTO patients (name, age, gender, dob, mobile, email, address, referred_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
            const [patientResult] = await connection.query(patientQuery, [
                patient.name, patient.age || null, patient.gender,
                patient.dob || null, patient.mobile, patient.email, patient.address, patient.referred_by
            ]);
            patientId = patientResult.insertId;
        } else {
            const updateQuery = `UPDATE patients SET dob = ?, mobile = ?, email = ?, address = ?, referred_by = ? WHERE patient_id = ?`;
            await connection.query(updateQuery, [patient.dob || null, patient.mobile, patient.email, patient.address, patient.referred_by, patientId]);
        }

        // 2. Insert Prescriptions
        for (const drug of prescriptions) {
             if (!drug.drug_id) continue;

            const prescriptionQuery = `
                INSERT INTO prescriptions 
                (doctor_id, patient_id, drug_id, quantity, sig_instruction, duration, 
                 diagnosis_text, general_advice, chief_complaint, medical_history, 
                 examination_findings, investigations, follow_up_date, created_at, public_uid)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const examString = typeof examination_findings === 'object' ? JSON.stringify(examination_findings) : examination_findings;

            await connection.query(prescriptionQuery, [
                doctorId, patientId, drug.drug_id, drug.quantity, drug.sig_instruction, drug.duration,
                diagnosis_text, general_advice, chief_complaint, medical_history, 
                examString, investigations, follow_up_date, batchDate, publicUid
            ]);
        }

        // 2.5 Auto-Appointment logic... (removed for brevity, keep your previous implementation if needed, but not strictly required for PDF flow)

        await connection.commit();

        res.status(200).json({ 
            message: 'Prescription Saved', 
            success: true,
            patientId,
            timestamp: batchDate,
            publicUid 
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Submission failed:', error);
        res.status(500).json({ message: 'Server error.' });
    } finally {
        if (connection) connection.release();
    }
});

// --- PUT Update Prescription ---
router.put('/update', async (req, res) => {
    const { original_date, patient, prescriptions, diagnosis_text, general_advice, chief_complaint, medical_history, examination_findings, investigations, follow_up_date } = req.body;
    
    const doctorId = req.user.role === 'doctor' ? req.user.id : req.user.parentId;
    const batchDate = new Date(); 
    const publicUid = uuidv4(); 

    let connection;

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        await connection.query('DELETE FROM prescriptions WHERE patient_id = ? AND doctor_id = ? AND created_at = ?', [patient.id, doctorId, original_date]);

        for (const drug of prescriptions) {
            if (!drug.drug_id) continue;
            const insertQuery = `
                INSERT INTO prescriptions 
                (doctor_id, patient_id, drug_id, quantity, sig_instruction, duration, 
                 diagnosis_text, general_advice, chief_complaint, medical_history, 
                 examination_findings, investigations, follow_up_date, created_at, public_uid)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const examString = typeof examination_findings === 'object' ? JSON.stringify(examination_findings) : examination_findings;
            await connection.query(insertQuery, [
                doctorId, patient.id, drug.drug_id, drug.quantity, drug.sig_instruction, drug.duration,
                diagnosis_text, general_advice, chief_complaint, medical_history, 
                examString, investigations, follow_up_date, batchDate, publicUid
            ]);
        }
        await connection.commit();
        
        res.status(200).json({ 
            message: 'Updated', 
            success: true,
            patientId: patient.id,
            timestamp: batchDate 
        });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error(error);
        res.status(500).json({ message: 'Update failed' });
    } finally {
        if (connection) connection.release();
    }
});

// --- POST Reprint ---
router.post('/reprint/:patientId', async (req, res) => {
    const { date } = req.body; 
    // FIX: Read Query Param for Header Toggle
    const printHeader = req.query.header !== 'false'; 
    
    const patientId = req.params.patientId;
    const doctorId = req.user.role === 'doctor' ? req.user.id : req.user.parentId;

    try {
        const targetDate = new Date(date);

        const query = `
            SELECT 
                pr.*, d.generic_name, d.trade_names, d.strength, d.counseling_points as drug_counseling
            FROM prescriptions pr
            LEFT JOIN drug_inventory d ON pr.drug_id = d.drug_id
            WHERE pr.patient_id = ? 
            AND pr.doctor_id = ? 
            AND pr.created_at BETWEEN DATE_SUB(?, INTERVAL 5 SECOND) AND DATE_ADD(?, INTERVAL 5 SECOND)
        `;
        // Relaxed time check slightly to 5 seconds
        const [rows] = await pool.query(query, [patientId, doctorId, targetDate, targetDate]);

        if (rows.length === 0) return res.status(404).json({ message: 'Prescription not found.' });

        const [ptRows] = await pool.query('SELECT * FROM patients WHERE patient_id = ?', [patientId]);
        const [docRows] = await pool.query('SELECT * FROM doctors WHERE doctor_id = ?', [doctorId]);

        const base = rows[0]; 
        
        let qrCodeDataUrl = null;
        if (base.public_uid) {
             const publicLink = `${process.env.DOMAIN || 'http://localhost:5173'}/p/${base.public_uid}`;
             qrCodeDataUrl = await QRCode.toDataURL(publicLink);
        }

        const pdfData = {
            doctor: docRows[0],
            patient: ptRows[0],
            diagnosis_text: base.diagnosis_text,
            general_advice: base.general_advice,
            chief_complaint: base.chief_complaint,
            medical_history: base.medical_history,
            investigations: base.investigations,
            follow_up_date: base.follow_up_date,
            examination_findings: (() => { try { return JSON.parse(base.examination_findings) } catch{ return {} } })(),
            qrCodeDataUrl,
            date: base.created_at, 
            prescriptions: rows.map(r => ({
                trade_names: r.trade_names,
                generic_name: r.generic_name,
                strength: r.strength,
                quantity: r.quantity,
                sig_instruction: r.sig_instruction,
                duration: r.duration,
                counseling_points: r.drug_counseling 
            }))
        };

        // FIX: Pass printHeader inside the options object
        generatePrescriptionPDF(res, pdfData, { printHeader });

    } catch (error) {
        console.error("Reprint Error:", error);
        res.status(500).json({ message: 'Reprint failed' });
    }
});

// --- PDF GENERATOR HELPER ---
const generatePrescriptionPDF = (res, data, options = { printHeader: true }) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });

    // 1. FONTS (Global)
    doc.registerFont('Bangla', fontPath);       
    doc.registerFont('Bold', fontBoldPath); 
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Prescription_${data.patient.name}.pdf"`);
    doc.pipe(res);

    // 2. HEADER LOGIC (Conditional)
    if (options.printHeader) {
        if (data.doctor.clinic_name) {
            doc.fontSize(22).font('Bold').fillColor('#1a365d').text(data.doctor.clinic_name, 40, 40);
            doc.fontSize(10).font('Bangla').fillColor('#555').text(data.doctor.chamber_address || '', 40, 68);
            doc.font('Bangla').text(`Mobile: ${data.doctor.phone_number || ''}`, 40, 82);
        }
        
        // Right Side (Doctor)
        const startX = 320;
        doc.fontSize(16).font('Bold').fillColor('#000').text(`Dr. ${data.doctor.full_name}`, startX, 40, { align: 'right' });
        doc.fontSize(11).font('Bangla').fillColor('#333').text(data.doctor.degree || '', startX, 65, { align: 'right' });
        doc.fontSize(10).font('Bangla').fillColor('#555').text(data.doctor.specialist_title || '', startX, 82, { align: 'right' });
        doc.font('Bold').text(`BMDC Reg: ${data.doctor.bmdc_reg}`, startX, 100, { align: 'right' });

        doc.moveDown(1.5);
        doc.lineWidth(1).strokeColor('#ccc').moveTo(40, 115).lineTo(555, 115).stroke();
        doc.y = 125;
    } else {
        // Space for Letterhead
        doc.moveDown(8);
        doc.y = 125; 
    }

    // 3. PATIENT INFO
    doc.rect(40, doc.y, 515, 25).fill('#f8f9fa'); // Light grey background strip
    
    const infoY = doc.y + 7;
    doc.fillColor('#000').fontSize(11);
    
    doc.font('Bangla').text(`Name: ${data.patient.name}`, 50, infoY);
    
    // Calculate Widths to space evenly
    // (Age 200px from left, Gender 320px from left)
    doc.text(`Age: ${data.patient.age || '-'}`, 230, infoY);
    doc.text(`Sex: ${data.patient.gender}`, 330, infoY);
    doc.text(`ID: #${data.patient.id || data.patient.patient_id}`, 420, infoY);

    const dateToPrint = data.date ? new Date(data.date).toLocaleDateString() : new Date().toLocaleDateString();
    doc.font('Helvetica').text(dateToPrint, 500, infoY, { align: 'right', width: 40 });

    doc.moveDown(2); // Spacing before content

    // 4. COLUMNS SETUP
    const startContentY = doc.y + 20;
    const dividerX = 180;
    const leftX = 40;
    const rightX = 200;
    const rightWidth = 350;

    let leftY = startContentY;
    let rightY = startContentY;

    // --- LEFT COLUMN ---
    const printLeft = (title, text) => {
        if(!text) return;
        doc.fontSize(11).font('Bold').fillColor('#2d3748').text(title, leftX, leftY);
        leftY += 14;
        doc.fontSize(10).font('Bangla').fillColor('#4a5568').text(text, leftX, leftY, { width: dividerX - 50 });
        leftY = doc.y + 15;
    }

    printLeft('Chief Complaint', data.chief_complaint);
    
    // Exam Findings Map
    const ef = data.examination_findings;
    if(ef && Object.keys(ef).length > 0 && (ef.bp || ef.weight || ef.pulse || ef.temp)) {
        doc.fontSize(11).font('Bold').fillColor('#2d3748').text('O/E', leftX, leftY);
        leftY += 14;
        doc.font('Helvetica').fontSize(10).fillColor('#4a5568');
        
        if(ef.bp) doc.text(`BP: ${ef.bp} mmHg`, leftX, leftY);
        if(ef.pulse) doc.text(`Pulse: ${ef.pulse} /min`);
        if(ef.weight) doc.text(`Wt: ${ef.weight} kg`);
        if(ef.temp) doc.text(`Temp: ${ef.temp} F`);
        
        leftY = doc.y + 10;
        if(ef.other) printLeft('Other Findings', ef.other); // "Bangla" used in helper
    }

    printLeft('History', data.medical_history);
    printLeft('Investigations', data.investigations);
    printLeft('Diagnosis', data.diagnosis_text);


    // --- RIGHT COLUMN ---
    doc.y = rightY;
    doc.font('Bold').fontSize(24).text('Rx', rightX, rightY - 5);
    rightY += 35;

    data.prescriptions.forEach((rx, i) => {
        doc.y = rightY;

        // 1. Medicine Name
        const medName = `${i+1}. ${rx.trade_names || rx.generic_name}`;
        doc.font('Bold').fontSize(12).fillColor('#000').text(medName, rightX, rightY);
        
        // 2. Generic Name (Subtext)
        if(rx.trade_names) {
            const widthName = doc.widthOfString(medName);
            doc.font('Helvetica').fontSize(9).fillColor('#666').text(` (${rx.generic_name})`, rightX + widthName + 2, rightY + 2);
        }

        // 3. Strength (Right aligned relative to Name or inline)
        const strX = rightX + 300; 
        if(rx.strength) doc.font('Bold').fontSize(11).text(rx.strength, strX, rightY, {align: 'right', width: 50});

        // 4. Instructions (The Main Part)
        // Switch to Bangla font immediately for SIG
        doc.moveDown(0.2);
        doc.font('Bangla').fontSize(11).fillColor('#2d3748')
           .text(`${rx.sig_instruction}  --  ${rx.duration || ''}`, rightX + 15);
        
        // 5. Notes
        if(rx.counseling_points) {
            doc.fontSize(9).fillColor('#718096').text(`Note: ${rx.counseling_points}`, rightX + 15);
        }

        rightY = doc.y + 15; // Spacer
    });

    // --- ADVICE ---
    if(data.general_advice) {
        rightY += 10;
        doc.y = rightY;
        doc.font('Bold').fontSize(12).fillColor('#2c3e50').text('Advice / উপদেশ', rightX);
        doc.moveDown(0.3);
        doc.font('Bangla').fontSize(10).fillColor('#333').text(data.general_advice, { width: rightWidth });
        rightY = doc.y + 20;
    }

    // --- FOLLOW UP ---
    if(data.follow_up_date) {
        // Safe Parse
        let fDate = data.follow_up_date;
        if(!fDate.includes('Next')) { // If it's a date string
             const d = new Date(data.follow_up_date);
             if(!isNaN(d)) fDate = d.toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'});
        }
        
        doc.font('Bold').fontSize(12).text('Follow-up', rightX, rightY);
        doc.font('Helvetica').fontSize(11).text(fDate, rightX, doc.y);
    }

    // --- DRAW DIVIDER ---
    // Calculate bottom of page to stop line
    const pageBottom = 720;
    const lineEnd = Math.max(leftY, rightY, 500); 
    doc.lineWidth(0.5).strokeColor('#e2e8f0').moveTo(dividerX, 160).lineTo(dividerX, Math.min(lineEnd, pageBottom)).stroke();

    // --- FOOTER & QR ---
    const footerY = 740;
    
    // QR Code (Bottom Right)
    if(data.qrCodeDataUrl) {
        doc.image(data.qrCodeDataUrl, 500, footerY - 20, { width: 55 });
    }
    
    // Slogan (Center/Left)
    doc.font('Helvetica').fontSize(8).fillColor('#cbd5e0').text('Generated by MedLipi - Open Source EMR', 40, footerY + 10);
    
    doc.end();
};

export default router;