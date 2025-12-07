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
const fontPath = path.join(__dirname, '../fonts/NotoSerifBengali-Regular.ttf');

const calculateFollowUpDate = (text) => {
    if (!text) return null;
    const today = new Date();
    
    // Regex to find number of days/weeks/months
    // Matches: "7 days", "1 month", "2 weeks"
    const match = text.toLowerCase().match(/(\d+)\s*(day|week|month)/);
    
    if (match) {
        const num = parseInt(match[1]);
        const unit = match[2];
        
        if (unit.includes('day')) today.setDate(today.getDate() + num);
        if (unit.includes('week')) today.setDate(today.getDate() + (num * 7));
        if (unit.includes('month')) today.setMonth(today.getMonth() + num);
        
        return today.toISOString().split('T')[0]; // Return YYYY-MM-DD
    }
    return null; // Could not parse
};

const router = express.Router();
router.use(verifyToken);

// --- GET Recent Patient Visits ---
router.get('/recent', async (req, res) => {
    const doctorId = req.doctor.id;
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
        console.error('Error fetching recent prescriptions:', error);
        res.status(500).json({ message: 'Server error fetching recent activity.' });
    }
});

// --- POST Create New Prescription ---
router.post('/', async (req, res) => {
    const { 
        patient, prescriptions, diagnosis_text, general_advice, 
        chief_complaint, medical_history, examination_findings, 
        investigations, follow_up_date 
    } = req.body;
    
    const doctorId = req.doctor.id; 
    
    // Generate Metadata
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

        // 2.5 Auto-create Appointment if Follow-up is parsed
        if (follow_up_date) {
            const nextVisitDate = calculateFollowUpDate(follow_up_date);
            
            if (nextVisitDate) {
                // Check if one already exists to avoid duplicates
                const [exists] = await connection.query(
                    `SELECT appointment_id FROM appointments WHERE patient_id = ? AND visit_date = ?`,
                    [patientId, nextVisitDate]
                );

                if (exists.length === 0) {
                    await connection.query(
                        `INSERT INTO appointments (doctor_id, patient_id, visit_date, status, source, reason)
                        VALUES (?, ?, ?, 'Pending_Followup', 'Auto-Followup', 'Prescribed Follow-up')`,
                        [doctorId, patientId, nextVisitDate]
                    );
                }
            }
        }

        await connection.commit();

            // --- AUTOMATIC APPOINTMENT CREATION ---
        // If follow_up_date is provided (It will be YYYY-MM-DD from the frontend input)
        if (follow_up_date) {
            try {
                // Check for valid date format roughly
                const nextVisitDate = new Date(follow_up_date);
                
                if (!isNaN(nextVisitDate.getTime())) {
                    const dateString = nextVisitDate.toISOString().split('T')[0];

                    // Check duplicates
                    const [exists] = await pool.query(
                        `SELECT appointment_id FROM appointments WHERE patient_id = ? AND visit_date = ?`,
                        [patientId, dateString]
                    );

                    if (exists.length === 0) {
                        await pool.query(
                            `INSERT INTO appointments (doctor_id, patient_id, visit_date, status, source, reason)
                            VALUES (?, ?, ?, 'Pending_Followup', 'Auto-Followup', 'Prescribed Follow-up')`,
                            [doctorId, patientId, dateString]
                        );
                        console.log("Auto-appointment created for:", dateString);
                    }
                }
            } catch (err) {
                console.error("Auto-appointment error:", err);
                // Don't fail the whole request just for this
            }
        }

        // 3. Generate QR Code
        const publicLink = `${process.env.DOMAIN || 'http://localhost:5173'}/p/${publicUid}`; 
        const qrCodeDataUrl = await QRCode.toDataURL(publicLink);

        // 4. Generate PDF
        const [docRows] = await pool.query('SELECT * FROM doctors WHERE doctor_id = ?', [doctorId]);
        
        // Pass "patientId" explicitly
        const patientDataForPdf = { ...patient, id: patientId };

        generatePrescriptionPDF(res, {
            doctor: docRows[0], 
            patient: patientDataForPdf,
            prescriptions,
            diagnosis_text, general_advice, chief_complaint, medical_history,
            examination_findings: typeof examination_findings === 'object' ? examination_findings : JSON.parse(examination_findings || '{}'),
            investigations, follow_up_date,
            qrCodeDataUrl, 
            publicLink,
            date: batchDate // Pass creation date
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Submission failed:', error);
        res.status(500).json({ message: 'Server error.' });
    } finally {
        if (connection) connection.release();
    }
});

// --- PUT Update/Edit Prescription ---
router.put('/update', async (req, res) => {
    const { 
        original_date,
        patient, prescriptions, diagnosis_text, general_advice, 
        chief_complaint, medical_history, examination_findings, 
        investigations, follow_up_date 
    } = req.body;
    
    const doctorId = req.doctor.id;
    const batchDate = new Date(); 
    
    // FIX: Generate NEW public_uid for the updated version
    const publicUid = uuidv4(); 

    let connection;

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. DELETE OLD
        const deleteQuery = `DELETE FROM prescriptions WHERE patient_id = ? AND doctor_id = ? AND created_at = ?`;
        await connection.query(deleteQuery, [patient.id, doctorId, original_date]);

        // 2. INSERT NEW
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
        
        // 3. GENERATE QR & PDF
        const publicLink = `${process.env.DOMAIN || 'http://localhost:5173'}/p/${publicUid}`; 
        const qrCodeDataUrl = await QRCode.toDataURL(publicLink);

        const [docRows] = await pool.query('SELECT * FROM doctors WHERE doctor_id = ?', [doctorId]);
        
        generatePrescriptionPDF(res, {
            doctor: docRows[0],
            patient: patient, 
            prescriptions,
            diagnosis_text, general_advice, chief_complaint, medical_history,
            examination_findings: typeof examination_findings === 'object' ? examination_findings : JSON.parse(examination_findings || '{}'),
            investigations, follow_up_date,
            qrCodeDataUrl,
            date: batchDate // New update date
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Update failed:', error);
        res.status(500).json({ message: 'Update failed' });
    } finally {
        if (connection) connection.release();
    }
});

// --- POST Reprint ---
router.post('/reprint/:patientId', async (req, res) => {
    const { date } = req.body; 
    const patientId = req.params.patientId;
    const doctorId = req.doctor.id;

    try {
        const targetDate = new Date(date);

        // Fetch prescription by fuzzy time match
        const query = `
            SELECT 
                pr.*, d.generic_name, d.trade_names, d.strength, d.counseling_points as drug_counseling
            FROM prescriptions pr
            LEFT JOIN drug_inventory d ON pr.drug_id = d.drug_id
            WHERE pr.patient_id = ? 
            AND pr.doctor_id = ? 
            AND pr.created_at BETWEEN DATE_SUB(?, INTERVAL 2 SECOND) AND DATE_ADD(?, INTERVAL 2 SECOND)
        `;
        
        const [rows] = await pool.query(query, [patientId, doctorId, targetDate, targetDate]);

        if (rows.length === 0) return res.status(404).json({ message: 'Prescription not found.' });

        const [ptRows] = await pool.query('SELECT * FROM patients WHERE patient_id = ?', [patientId]);
        const [docRows] = await pool.query('SELECT * FROM doctors WHERE doctor_id = ?', [doctorId]);

        const base = rows[0]; 
        
        // Regenerate QR using stored UID
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
            examination_findings: JSON.parse(base.examination_findings || '{}'),
            qrCodeDataUrl,
            date: base.created_at, // Use ORIGINAL date for reprint
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

        generatePrescriptionPDF(res, pdfData);

    } catch (error) {
        console.error("Reprint Error:", error);
        res.status(500).json({ message: 'Reprint failed' });
    }
});

// --- PDF Generator Helper ---
const generatePrescriptionPDF = (res, data) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });

    // 1. REGISTER FONTS
    doc.registerFont('Bangla', fontPath);       
    doc.registerFont('Bold', 'Helvetica-Bold'); 
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Prescription_${data.patient.name}.pdf"`);
    doc.pipe(res);

    // 2. HEADER
    if (data.doctor.clinic_name) {
        doc.fontSize(20).font('Bold').fillColor('#2c3e50').text(data.doctor.clinic_name, 40, 40);
        doc.fontSize(10).fillColor('#555').text(data.doctor.chamber_address || '', 40, 65);
        doc.font('Helvetica').text(`Phone: ${data.doctor.phone_number || ''}`, 40, 80);
    }
    const startX = 350;
    doc.fontSize(14).font('Bold').fillColor('#000').text(`Dr. ${data.doctor.full_name}`, startX, 40, { align: 'right' });
    doc.fontSize(10).font('Helvetica').fillColor('#333').text(data.doctor.degree || '', startX, 60, { align: 'right' });
    doc.fontSize(9).fillColor('#666').text(data.doctor.specialist_title || '', startX, 75, { align: 'right' });
    doc.text(`BMDC: ${data.doctor.bmdc_reg}`, startX, 90, { align: 'right' });

    doc.moveDown(1.5);
    doc.lineWidth(1).strokeColor('#ccc').moveTo(40, 110).lineTo(555, 110).stroke();

    // 3. PATIENT INFO
    doc.y = 115;
    doc.fontSize(10).fillColor('#000');
    doc.font('Helvetica').text(`Name: ${data.patient.name}   [ID: ${data.patient.id || data.patient.patient_id}]`, 40, 120); 
    doc.font('Helvetica').text(`Age: ${data.patient.age || '--'}    Sex: ${data.patient.gender}`, 320, 120);
    
    // FIX: Use provided date or fallback to today
    const dateToPrint = data.date ? new Date(data.date).toLocaleDateString() : new Date().toLocaleDateString();
    doc.font('Helvetica').text(`Date: ${dateToPrint}`, 450, 120, { align: 'right' });
    
    doc.lineWidth(2).strokeColor('#2c3e50').moveTo(40, 140).lineTo(555, 140).stroke();

    // 4. COLUMNS LAYOUT
    const leftColX = 40; const leftColWidth = 150;
    const rightColX = 210; const rightColWidth = 345;
    const startY = 160;
    let leftY = startY; let rightY = startY;

    // Helper: Left Section
    const printLeftSection = (title, content) => {
        if (!content) return;
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#2c3e50').text(title, leftColX, leftY, { width: leftColWidth });
        leftY += 12;
        doc.fontSize(9).font('Helvetica').fillColor('#333').text(content, leftColX, leftY, { width: leftColWidth });
        leftY = doc.y + 10;
    };

    printLeftSection('Chief Complaint', data.chief_complaint);
    
    // Parse findings
    const ef = data.examination_findings || {};
    let findingsText = '';
    if (ef.bp) findingsText += `BP: ${ef.bp} mmHg\n`;
    if (ef.pulse) findingsText += `Pulse: ${ef.pulse} bpm\n`;
    if (ef.temp) findingsText += `Temp: ${ef.temp} F\n`;
    if (ef.weight) findingsText += `Wt: ${ef.weight} kg\n`;
    if (ef.bmi) findingsText += `BMI: ${ef.bmi}\n`;
    if (ef.spo2) findingsText += `SpO2: ${ef.spo2} %\n`;
    if (ef.other) findingsText += `\n${ef.other}`;

    printLeftSection('O/E', findingsText);
    printLeftSection('History', data.medical_history);
    printLeftSection('Investigations', data.investigations);
    printLeftSection('Diagnosis', data.diagnosis_text);

    // 5. RIGHT COLUMN (RX)
    doc.y = rightY;
    doc.fontSize(18).font('Helvetica-Bold').fillColor('#000').text('Rx', rightColX, rightY);
    rightY += 30;

    data.prescriptions.forEach((item, index) => {
        doc.y = rightY;
        const brand = item.trade_names || item.generic_name || 'Medicine'; 
        const strength = item.strength || '';
        
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#000')
           .text(`${index + 1}. ${brand} ${strength}`, rightColX, rightY);
        
        doc.fontSize(8).font('Helvetica').fillColor('#555')
           .text(`(${item.generic_name})`, rightColX + 15, doc.y + 2);
        
        // FIX: Use 'Bangla' font here for SIG as it often contains local language
        doc.fontSize(10).font('Helvetica').fillColor('#000')
           .text(`${item.sig_instruction} -- ${item.duration}`, rightColX + 15, doc.y + 2);
        
        if (item.counseling_points) {
            // FIX: Use 'Bangla' font here for notes
            doc.fontSize(8).font('Helvetica').fillColor('#666')
               .text(`Note: ${item.counseling_points}`, rightColX + 15, doc.y + 2);
        }

        rightY = doc.y + 12; 
    });

    rightY += 20;
    
    // 6. ADVICE (Bangla Supported)
    if (data.general_advice) {
        doc.fontSize(11).font('Bold').fillColor('#2c3e50').text('Advice', rightColX, rightY);
        rightY += 15;
        doc.fontSize(7).font('Bangla').fillColor('#333').text(data.general_advice, rightColX, rightY, { width: rightColWidth });
        rightY = doc.y + 20;
    }
    
    if (data.follow_up_date) {
        const formattedDate = new Date(data.follow_up_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
         
         doc.fontSize(11).font('Bold').fillColor('#2c3e50').text('Follow-up', rightColX, rightY);
         rightY += 15;
         doc.fontSize(10).font('Helvetica').fillColor('#333').text(formattedDate, rightColX, rightY);
    }

    // Divider Line
    const maxY = Math.max(leftY, rightY, 680); 
    doc.lineWidth(0.5).strokeColor('#ddd').moveTo(200, 160).lineTo(200, maxY).stroke();

    // 7. FOOTER (QR CODE)
    const bottomY = 730;
    if (data.qrCodeDataUrl) {
        doc.image(data.qrCodeDataUrl, 500, bottomY, { width: 50 });
        doc.fontSize(8).font('Helvetica').fillColor('#555').text('Scan for e-copy', 430, bottomY + 50, { align: 'right' });
    }
    
    doc.font('Helvetica').text('Powered by MedLipi', 40, bottomY + 30, { align: 'left' });

    doc.end();
};

export default router;