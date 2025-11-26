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
            const patientQuery = `
                INSERT INTO patients (name, age, gender, dob, mobile, email, address, referred_by) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const [patientResult] = await connection.query(patientQuery, [
                patient.name, 
                patient.age || null, 
                patient.gender,
                patient.dob || null, // NEW: Date of Birth
                patient.mobile,      // NEW
                patient.email,       // NEW
                patient.address,     // NEW
                patient.referred_by  // NEW
            ]);
            patientId = patientResult.insertId;
        } else {
            // OPTIONAL: Update existing patient contact info if it changed
            const updateQuery = `
                UPDATE patients 
                SET dob = ?, mobile = ?, email = ?, address = ?, referred_by = ? 
                WHERE patient_id = ?
            `;
            await connection.query(updateQuery, [
                patient.dob || null, patient.mobile, patient.email, patient.address, patient.referred_by, patientId
            ]);
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

         const [docRows] = await pool.query(
            'SELECT full_name, bmdc_reg, email, degree, clinic_name, chamber_address, phone_number, specialist_title FROM doctors WHERE doctor_id = ?', 
            [doctorId]
        );
        const doctorDetails = docRows[0];
        
        // 3. Immediately trigger PDF generation (Step 6.3)
        // Pass essential IDs and data to the PDF function
        generatePrescriptionPDF(res, {
            doctor: doctorDetails, 
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
    // Clinic Name (Left Aligned, Large)
    if (data.doctor.clinic_name) {
        doc.fontSize(20).fillColor('#2c3e50').text(data.doctor.clinic_name, 50, 50);
        doc.fontSize(10).fillColor('#555').text(data.doctor.chamber_address || '', 50, 75);
        doc.text(`Appt: ${data.doctor.phone_number || ''}`, 50, 90);
    }

    // Doctor Details (Right Aligned)
    const startX = 350;
    doc.fontSize(14).fillColor('#000').text(`Dr. ${data.doctor.full_name}`, startX, 50, { align: 'right' });
    doc.fontSize(10).fillColor('#333').text(data.doctor.degree || '', startX, 70, { align: 'right' });
    doc.fontSize(9).fillColor('#666').text(data.doctor.specialist_title || '', startX, 85, { align: 'right' });
    doc.text(`BMDC Reg: ${data.doctor.bmdc_reg}`, startX, 100, { align: 'right' });

    // Divider Line
    doc.moveDown(2);
    doc.lineWidth(2).strokeColor('#2c3e50').moveTo(50, 120).lineTo(550, 120).stroke();

    // 2. Patient Info (Top Left)
    // Reset Y position to below the line
    doc.y = 130; 
    
    doc.fontSize(11).fillColor('#000');
    doc.text(`Name: ${data.patient.name}`, 50, 130);
    doc.text(`Age: ${data.patient.age || '--'}   Gender: ${data.patient.gender}`, 350, 130, { align: 'right' });
    
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 50, 145);
    
    doc.moveDown(2); // Add space before Rx
    
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