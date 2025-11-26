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
    const { 
        patient, 
        prescriptions, 
        diagnosis_text, 
        general_advice, 
        chief_complaint, 
        medical_history, 
        examination_findings, 
        investigations, 
        follow_up_date 
    } = req.body;
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
                (doctor_id, patient_id, 
                drug_id, quantity, sig_instruction, 
                duration, diagnosis_text, general_advice,
                chief_complaint, medical_history, examination_findings, investigations, follow_up_date
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const examString = typeof examination_findings === 'object' 
                ? JSON.stringify(examination_findings) 
                : examination_findings;

            const values = [
                doctorId, patientId, drug.drug_id, drug.quantity, drug.sig_instruction, drug.duration,
                diagnosis_text, general_advice,
                chief_complaint, medical_history, examString, investigations, follow_up_date
            ];            

            // const prescriptionValues = [
            //     doctorId, 
            //     patientId, 
            //     drug.drug_id, 
            //     drug.quantity, 
            //     drug.sig_instruction, 
            //     drug.duration,
            //     // Only save the diagnosis/advice once with the first drug (or we can update the schema to separate this)
            //     diagnosis_text, 
            //     general_advice
            // ];
            await connection.query(prescriptionQuery, values);
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
            chief_complaint,
            medical_history,
            examination_findings: typeof examination_findings === 'object' ? examination_findings : JSON.parse(examination_findings || '{}'),
            investigations,
            follow_up_date
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
    const doc = new PDFDocument({ size: 'A4', margin: 40 }); // Reduced margin
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Prescription_${data.patient.name}.pdf"`);
    doc.pipe(res);

    // --- HEADER (Clinic & Doctor) ---
    // ... (Keep your existing Header Logic from Step 22) ...
    if (data.doctor.clinic_name) {
        doc.fontSize(20).fillColor('#2c3e50').text(data.doctor.clinic_name, 40, 40);
        doc.fontSize(10).fillColor('#555').text(data.doctor.chamber_address || '', 40, 65);
        doc.text(`Phone: ${data.doctor.phone_number || ''}`, 40, 80);
    }
    // Doctor Right Side
    const startX = 350;
    doc.fontSize(14).fillColor('#000').text(`Dr. ${data.doctor.full_name}`, startX, 40, { align: 'right' });
    doc.fontSize(10).fillColor('#333').text(data.doctor.degree || '', startX, 60, { align: 'right' });
    doc.fontSize(9).fillColor('#666').text(data.doctor.specialist_title || '', startX, 75, { align: 'right' });
    doc.text(`BMDC: ${data.doctor.bmdc_reg}`, startX, 90, { align: 'right' });

    // Separator
    doc.moveDown(1.5);
    doc.lineWidth(1).strokeColor('#ccc').moveTo(40, 110).lineTo(555, 110).stroke();

    // --- PATIENT INFO BAR ---
    doc.y = 115;
    doc.fontSize(10).fillColor('#000');
    doc.text(`Name: ${data.patient.name}`, 40, 120);
    doc.text(`Age: ${data.patient.age || '--'}    Sex: ${data.patient.gender}`, 250, 120);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 450, 120, { align: 'right' });
    
    doc.lineWidth(2).strokeColor('#2c3e50').moveTo(40, 140).lineTo(555, 140).stroke();

    // --- MAIN LAYOUT: TWO COLUMNS ---
    // Left Column: Width 30% (x: 40 to 190)
    // Right Column: Width 70% (x: 210 to 555)
    // Divider Line at x: 200
    
    const leftColX = 40;
    const leftColWidth = 150;
    const rightColX = 210;
    const rightColWidth = 345;
    const startY = 160;
    let leftY = startY;
    let rightY = startY;

    // --- LEFT COLUMN (Clinical Findings) ---
    
    const printLeftSection = (title, content) => {
        if (!content) return;
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#2c3e50').text(title, leftColX, leftY, { width: leftColWidth });
        leftY += 12;
        doc.fontSize(9).font('Helvetica').fillColor('#333').text(content, leftColX, leftY, { width: leftColWidth });
        leftY = doc.y + 10; // Update Y
    };

    // 1. Chief Complaint (CC) / Symptoms
    printLeftSection('Chief Complaint (C/C)', data.chief_complaint);

    // 2. Examination Findings (O/E)
    // Construct readable string from object
    const ef = data.examination_findings || {};
    let findingsText = '';
    if (ef.bp) findingsText += `BP: ${ef.bp} mmHg\n`;
    if (ef.pulse) findingsText += `Pulse: ${ef.pulse} bpm\n`;
    if (ef.temp) findingsText += `Temp: ${ef.temp} F\n`;
    if (ef.weight) findingsText += `Wt: ${ef.weight} kg\n`;
    if (ef.height) findingsText += `Ht: ${ef.height}\n`;
    if (ef.bmi) findingsText += `BMI: ${ef.bmi}\n`;
    if (ef.spo2) findingsText += `SpO2: ${ef.spo2} %\n`;
    if (ef.other) findingsText += `\n${ef.other}`;
    
    printLeftSection('On Examination (O/E)', findingsText);

    // 3. Medical History
    printLeftSection('History', data.medical_history);

    // 4. Investigations (Ix)
    printLeftSection('Investigations (Ix)', data.investigations);

    // 5. Diagnosis (Dx) - Moved to Left side as per standard Pad
    printLeftSection('Diagnosis (Dx)', data.diagnosis_text);


    // --- RIGHT COLUMN (Rx & Advice) ---
    doc.y = rightY;

    // 1. Rx Symbol
    doc.fontSize(18).font('Helvetica-Bold').fillColor('#000').text('Rx', rightColX, rightY);
    rightY += 30;

    // 2. Medicine List
    data.prescriptions.forEach((item, index) => {
        doc.y = rightY; // Sync Y
        const generic = item.generic_name || '';
        const brand = item.trade_names || 'Brand N/A';
        const strength = item.strength || '';
        
        // Line 1: Brand + Strength
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#000')
           .text(`${index + 1}. ${brand} ${strength}`, rightColX, rightY);
        
        // Line 2: Generic (Smaller)
        doc.fontSize(8).font('Helvetica').fillColor('#555')
           .text(`(${generic})`, rightColX + 15, doc.y + 2);
        
        // Line 3: SIG (Instruction) - Bold/Emphasis
        doc.fontSize(10).font('Helvetica').fillColor('#000')
           .text(`${item.sig_instruction} -- ${item.duration}`, rightColX + 15, doc.y + 2);
        
        // Line 4: Counseling (if any)
        if (item.counseling_points) {
            doc.fontSize(8).font('Helvetica-Oblique').fillColor('#666')
               .text(`Note: ${item.counseling_points}`, rightColX + 15, doc.y + 2);
        }

        rightY = doc.y + 12; // Spacer
    });

    rightY += 20;

    // 3. Advice
    if (data.general_advice) {
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#2c3e50').text('Advice / Upodesh', rightColX, rightY);
        rightY += 15;
        doc.fontSize(10).font('Helvetica').fillColor('#333').text(data.general_advice, rightColX, rightY, { width: rightColWidth });
        rightY = doc.y + 20;
    }

    // 4. Follow Up
    if (data.follow_up_date) {
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#2c3e50').text('Follow-up', rightColX, rightY);
        rightY += 15;
        doc.fontSize(10).font('Helvetica').fillColor('#333').text(data.follow_up_date, rightColX, rightY);
    }

    // --- VERTICAL DIVIDER LINE ---
    // Draw line from startY down to the bottom of the content
    const maxY = Math.max(leftY, rightY, 700); // Ensure it goes down nicely
    doc.lineWidth(0.5).strokeColor('#ddd').moveTo(200, startY).lineTo(200, maxY).stroke();

    // --- FOOTER ---
    doc.y = 750;
    doc.fontSize(8).fillColor('#999').text('Generated by MedLipi - Open Source Healthcare', 40, 750, { align: 'center' });

    doc.end();
};

export default router;