import express from 'express';
import pool from '../db.js';
import PDFDocument from 'pdfkit';
import verifyToken from '../middleware/auth.js'; 

const router = express.Router();
router.use(verifyToken);

// --- GET Recent Patient Visits ---
router.get('/recent', async (req, res) => {
    const doctorId = req.doctor.id;
    try {
        const query = `
            SELECT 
                p.patient_id, pt.name, pt.age, pt.gender, 
                MAX(p.created_at) as visit_date,
                MAX(p.diagnosis_text) as diagnosis
            FROM prescriptions p
            JOIN patients pt ON p.patient_id = pt.patient_id
            WHERE p.doctor_id = ?
            GROUP BY p.patient_id, pt.name, pt.age, pt.gender, DATE(p.created_at) 
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
    
    // FIX 1: Generate ONE timestamp for the whole batch so they group perfectly
    const batchDate = new Date(); 

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
             if (!drug.drug_id) continue; // Skip invalid

            const prescriptionQuery = `
                INSERT INTO prescriptions 
                (doctor_id, patient_id, drug_id, quantity, sig_instruction, duration, 
                 diagnosis_text, general_advice, chief_complaint, medical_history, 
                 examination_findings, investigations, follow_up_date, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const examString = typeof examination_findings === 'object' ? JSON.stringify(examination_findings) : examination_findings;

            // FIX 1 APPLIED: Pass batchDate as the last parameter
            await connection.query(prescriptionQuery, [
                doctorId, patientId, drug.drug_id, drug.quantity, drug.sig_instruction, drug.duration,
                diagnosis_text, general_advice, chief_complaint, medical_history, 
                examString, investigations, follow_up_date, batchDate
            ]);
        }

        await connection.commit();

        // 3. Generate PDF
        const [docRows] = await pool.query('SELECT * FROM doctors WHERE doctor_id = ?', [doctorId]);
        
        generatePrescriptionPDF(res, {
            doctor: docRows[0], 
            patient: { id: patientId, ...patient },
            prescriptions,
            diagnosis_text, general_advice, chief_complaint, medical_history,
            examination_findings: typeof examination_findings === 'object' ? examination_findings : JSON.parse(examination_findings || '{}'),
            investigations, follow_up_date
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
        original_date, // Timestamp of the old batch
        patient, prescriptions, diagnosis_text, general_advice, 
        chief_complaint, medical_history, examination_findings, 
        investigations, follow_up_date 
    } = req.body;
    
    const doctorId = req.doctor.id;
    const batchDate = new Date(); // New timestamp for the updated batch
    let connection;

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. DELETE OLD ENTRIES (Using exact original timestamp)
        // Note: Use string format if needed, but usually Date object works with mysql2
        const deleteQuery = `DELETE FROM prescriptions WHERE patient_id = ? AND doctor_id = ? AND created_at = ?`;
        await connection.query(deleteQuery, [patient.id, doctorId, original_date]);

        // 2. INSERT NEW ENTRIES
        for (const drug of prescriptions) {
            if (!drug.drug_id) continue;

            const insertQuery = `
                INSERT INTO prescriptions 
                (doctor_id, patient_id, drug_id, quantity, sig_instruction, duration, 
                 diagnosis_text, general_advice, chief_complaint, medical_history, 
                 examination_findings, investigations, follow_up_date, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const examString = typeof examination_findings === 'object' ? JSON.stringify(examination_findings) : examination_findings;
            
            await connection.query(insertQuery, [
                doctorId, patient.id, drug.drug_id, drug.quantity, drug.sig_instruction, drug.duration,
                diagnosis_text, general_advice, chief_complaint, medical_history, 
                examString, investigations, follow_up_date, batchDate
            ]);
        }

        await connection.commit();
        
        // 3. FETCH DETAILS & GENERATE PDF (FIX 2: Actually return the PDF)
        const [docRows] = await pool.query('SELECT * FROM doctors WHERE doctor_id = ?', [doctorId]);
        
        generatePrescriptionPDF(res, {
            doctor: docRows[0],
            patient: patient, 
            prescriptions,
            diagnosis_text, general_advice, chief_complaint, medical_history,
            examination_findings: typeof examination_findings === 'object' ? examination_findings : JSON.parse(examination_findings || '{}'),
            investigations, follow_up_date
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Update failed:', error);
        res.status(500).json({ message: 'Update failed' });
    } finally {
        if (connection) connection.release();
    }
});

// --- POST Reprint Old Prescription ---
router.post('/reprint/:patientId', async (req, res) => {
    const { date } = req.body; // Incoming ISO String (e.g., 2025-12-03T10:00:00.000Z)
    const patientId = req.params.patientId;
    const doctorId = req.doctor.id;

    try {
        // Convert the incoming ISO string to a JavaScript Date object
        const targetDate = new Date(date);

        // FIX: Use a time range check (+/- 2 seconds) instead of exact '='
        // This handles timezone conversions and slight format differences safely
        const query = `
            SELECT 
                pr.*, d.generic_name, d.trade_names, d.strength, d.counseling_points as drug_counseling
            FROM prescriptions pr
            LEFT JOIN drug_inventory d ON pr.drug_id = d.drug_id
            WHERE pr.patient_id = ? 
            AND pr.doctor_id = ? 
            AND pr.created_at BETWEEN DATE_SUB(?, INTERVAL 2 SECOND) AND DATE_ADD(?, INTERVAL 2 SECOND)
        `;
        
        // Pass the Date object 3 times (PatientID, DoctorID, Date, Date)
        const [rows] = await pool.query(query, [patientId, doctorId, targetDate, targetDate]);

        if (rows.length === 0) {
            console.log("Reprint debug: No rows found for date:", targetDate);
            return res.status(404).json({ message: 'Prescription not found (Date mismatch).' });
        }

        // 2. Fetch Patient & Doctor details
        const [ptRows] = await pool.query('SELECT * FROM patients WHERE patient_id = ?', [patientId]);
        const [docRows] = await pool.query('SELECT full_name, bmdc_reg, email, degree, clinic_name, chamber_address, phone_number, specialist_title FROM doctors WHERE doctor_id = ?', [doctorId]);

        // 3. Format Data for PDF
        const base = rows[0];
        
        // Safely parse JSON findings
        let parsedFindings = {};
        try {
            parsedFindings = typeof base.examination_findings === 'object' 
                ? base.examination_findings 
                : JSON.parse(base.examination_findings || '{}');
        } catch (e) { console.error("JSON parse error", e); }

        const pdfData = {
            doctor: docRows[0],
            patient: ptRows[0],
            diagnosis_text: base.diagnosis_text,
            general_advice: base.general_advice,
            chief_complaint: base.chief_complaint,
            medical_history: base.medical_history,
            investigations: base.investigations,
            follow_up_date: base.follow_up_date,
            examination_findings: parsedFindings,
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
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Prescription_${data.patient.name}.pdf"`);
    doc.pipe(res);

    // ... (Paste your existing PDF layout code here) ...
    // ... (Header, Patient Info, Columns, etc.) ...
    
    // --- HEADER (Clinic & Doctor) ---
    if (data.doctor.clinic_name) {
        doc.fontSize(20).fillColor('#2c3e50').text(data.doctor.clinic_name, 40, 40);
        doc.fontSize(10).fillColor('#555').text(data.doctor.chamber_address || '', 40, 65);
        doc.text(`Phone: ${data.doctor.phone_number || ''}`, 40, 80);
    }
    const startX = 350;
    doc.fontSize(14).fillColor('#000').text(`Dr. ${data.doctor.full_name}`, startX, 40, { align: 'right' });
    doc.fontSize(10).fillColor('#333').text(data.doctor.degree || '', startX, 60, { align: 'right' });
    doc.text(`BMDC: ${data.doctor.bmdc_reg}`, startX, 90, { align: 'right' });

    doc.moveDown(1.5);
    doc.lineWidth(1).strokeColor('#ccc').moveTo(40, 110).lineTo(555, 110).stroke();

    // Patient Info
    doc.y = 115;
    doc.fontSize(10).fillColor('#000');
    doc.text(`Name: ${data.patient.name}`, 40, 120);
    doc.text(`Age: ${data.patient.age || '--'}    Sex: ${data.patient.gender}`, 250, 120);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 450, 120, { align: 'right' });
    doc.lineWidth(2).strokeColor('#2c3e50').moveTo(40, 140).lineTo(555, 140).stroke();

    // Layout Columns
    const leftColX = 40; const leftColWidth = 150;
    const rightColX = 210; const rightColWidth = 345;
    const startY = 160;
    let leftY = startY; let rightY = startY;

    // LEFT COL
    const printLeftSection = (title, content) => {
        if (!content) return;
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#2c3e50').text(title, leftColX, leftY, { width: leftColWidth });
        leftY += 12;
        doc.fontSize(9).font('Helvetica').fillColor('#333').text(content, leftColX, leftY, { width: leftColWidth });
        leftY = doc.y + 10;
    };

    printLeftSection('Chief Complaint', data.chief_complaint);
    
    const ef = data.examination_findings || {};
    let findingsText = '';
    if (ef.bp) findingsText += `BP: ${ef.bp}\n`;
    if (ef.weight) findingsText += `Wt: ${ef.weight} kg\n`;
    // ... add other vitals
    printLeftSection('O/E', findingsText);
    printLeftSection('History', data.medical_history);
    printLeftSection('Diagnosis', data.diagnosis_text);

    // RIGHT COL
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
        
        doc.fontSize(10).font('Helvetica').fillColor('#000')
           .text(`${item.sig_instruction} -- ${item.duration}`, rightColX + 15, doc.y + 2);
        
        rightY = doc.y + 12; 
    });

    rightY += 20;
    if (data.general_advice) {
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#2c3e50').text('Advice', rightColX, rightY);
        rightY += 15;
        doc.fontSize(10).font('Helvetica').fillColor('#333').text(data.general_advice, rightColX, rightY, { width: rightColWidth });
    }

    doc.end();
};

export default router;