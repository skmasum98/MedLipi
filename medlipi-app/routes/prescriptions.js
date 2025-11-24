import express from 'express';
import pool from '../db.js';
import PDFDocument from 'pdfkit';
import blobStream from 'blob-stream';
import verifyToken from '../middleware/auth.js'; 

const router = express.Router();
router.use(verifyToken); // All routes in this file are protected


// --- GET Recent Patient Visits (/api/prescriptions/recent) ---
router.get('/recent', async (req, res) => {
    const doctorId = req.doctor.id;
    try {
        // Group by patient and timestamp to find unique "visits"
        // We select the MAX(created_at) to get the latest time for that patient
        const query = `
            SELECT 
                p.patient_id, 
                pt.name, 
                pt.age, 
                pt.gender, 
                MAX(p.created_at) as visit_date,
                MAX(p.diagnosis_text) as diagnosis -- Just pick one diagnosis from the batch
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

// --- POST Create New Prescription (/api/prescriptions) ---
router.post('/', async (req, res) => {
    const { patient, prescriptions, diagnosis_text, general_advice } = req.body;
    const doctorId = req.doctor.id; 
    let connection;

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        let patientId = patient.id; 


        // 1. Insert or Use Existing Patient
        if (!patientId) {
            // New Patient: Insert a new record
            const patientQuery = `INSERT INTO patients (name, age, gender) VALUES (?, ?, ?)`;
            const [patientResult] = await connection.query(patientQuery, [patient.name, patient.age || null, patient.gender]);
            patientId = patientResult.insertId;
        } 

        // 2. Insert all Prescriptions (One row per drug)
        for (const drug of prescriptions) {
            const prescriptionQuery = `
                INSERT INTO prescriptions 
                (doctor_id, patient_id, drug_id, quantity, sig_instruction, duration, diagnosis_text, general_advice)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const prescriptionValues = [
                doctorId, 
                patientId, 
                drug.drug_id, 
                drug.quantity, 
                drug.sig_instruction, 
                drug.duration,
                // Only save the diagnosis/advice once with the first drug (or we can update the schema to separate this)
                diagnosis_text, 
                general_advice
            ];
            await connection.query(prescriptionQuery, prescriptionValues);
        }

        await connection.commit();
        
        // 3. Immediately trigger PDF generation (Step 6.3)
        // Pass essential IDs and data to the PDF function
        generatePrescriptionPDF(res, {
            doctor: req.doctor, // from JWT payload
            patient: { id: patientId, ...patient },
            prescriptions,
            diagnosis_text,
            general_advice,
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Prescription submission failed:', error);
        res.status(500).json({ message: 'Server error during prescription save.' });
    } finally {
        if (connection) connection.release();
    }
});

// --- PDF Generation Function (The magic happens here) ---
const generatePrescriptionPDF = (res, data) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    
    // Set headers for file download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Prescription_${data.patient.name.replace(/\s/g, '_')}_${Date.now()}.pdf"`);
    
    doc.pipe(res); // Pipe the PDF directly to the HTTP response

    // --- Template Design ---

    // 1. Header (Doctor Info - Top Right)
    doc.fontSize(10).text(`Dr. ${data.doctor.name}`, 400, 60, { align: 'right' });
    doc.text(`${data.doctor.bmdc}`, { align: 'right' });
    doc.text(`Email: ${data.doctor.email}`, { align: 'right' });
    doc.moveDown();

    // 2. Patient Info (Top Left)
    doc.fontSize(12).fillColor('#333').text(`Patient: ${data.patient.name}`, 50, 100);
    doc.text(`Age/Gender: ${data.patient.age || 'N/A'} / ${data.patient.gender}`);
    doc.moveDown();
    
    // 3. Diagnosis (If provided)
    if (data.diagnosis_text) {
        doc.fontSize(14).fillColor('#0056b3').text(`Diagnosis: ${data.diagnosis_text}`, 50, doc.y);
        doc.moveDown(0.5);
        doc.lineWidth(1).stroke('#0056b3');
        doc.moveDown(1);
    }
    
    // 4. Rx (Prescription List)
    doc.fontSize(18).fillColor('#000').text('Rx', 50, doc.y);
    doc.moveDown(0.5);

    data.prescriptions.forEach((item, index) => {
        const generic = item.generic_name || 'Generic Name N/A';
        const strength = item.strength || 'Strength N/A';
        const drugLine = `${index + 1}. ${generic} (${item.trade_names || 'N/A'}) - ${strength}`; 
        
        doc.fontSize(12).fillColor('#000').text(drugLine, 70, doc.y, { width: 450 });
        
        // SIG Instruction
        doc.fontSize(10).fillColor('#555').text(`SIG: ${item.sig_instruction}`, 80, doc.y);
        
        // Quantity & Duration
        doc.text(`Qty: ${item.quantity} | Duration: ${item.duration}`, 80, doc.y);
        
        // Counseling Points from Inventory (as a quick note)
        doc.fontSize(8).fillColor('#888').text(`Note: ${item.counseling_points.substring(0, 100)}...`, 80, doc.y + 2);

        doc.moveDown(1.5);
    });

    // 5. Patient Advice/Guide (Bottom Section)
    doc.moveDown(2);
    doc.fontSize(14).fillColor('#0056b3').text('Patient Guide & General Advice', 50, doc.y);
    doc.lineWidth(1).stroke('#0056b3');
    doc.moveDown(0.5);
    
    if (data.general_advice) {
        doc.fontSize(10).fillColor('#333').text(data.general_advice, 50, doc.y);
    } else {
        doc.fontSize(10).fillColor('#888').text('No specific advice provided.', 50, doc.y);
    }

    // 6. Footer (Doctor Signature Line)
    doc.moveDown(4);
    doc.lineWidth(1).lineCap('butt').moveTo(400, doc.y).lineTo(550, doc.y).stroke();
    doc.fontSize(10).text('Physician Signature', 430, doc.y + 5);

    doc.end(); // Finalize the PDF
};

export default router;