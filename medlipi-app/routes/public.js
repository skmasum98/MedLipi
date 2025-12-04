import express from 'express';
import pool from '../db.js';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode'; // <--- Ensure this is imported

const router = express.Router();

// --- GET Public Prescription by UUID ---
router.get('/prescription/:uid', async (req, res) => {
    const { uid } = req.params;

    try {
        // 1. Find the prescription batch by Public UID
        const query = `
            SELECT 
                pr.*, d.generic_name, d.trade_names, d.strength, d.counseling_points as drug_counseling,
                pt.name as patient_name, pt.age, pt.gender, pt.patient_id as db_patient_id,
                doc.full_name as doc_name, doc.bmdc_reg, doc.degree, doc.clinic_name, doc.chamber_address, doc.phone_number
            FROM prescriptions pr
            LEFT JOIN drug_inventory d ON pr.drug_id = d.drug_id
            JOIN patients pt ON pr.patient_id = pt.patient_id
            JOIN doctors doc ON pr.doctor_id = doc.doctor_id
            WHERE pr.public_uid = ?
        `;
        
        const [rows] = await pool.query(query, [uid]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Prescription link invalid or expired.' });
        }

        const base = rows[0];

        // 2. Generate QR Code (Re-create it for the PDF)
        const publicLink = `${process.env.DOMAIN || 'http://localhost:5173'}/p/${uid}`; 
        const qrCodeDataUrl = await QRCode.toDataURL(publicLink);

        // 3. Prepare Data for PDF
        const pdfData = {
            doctor: {
                full_name: base.doc_name,
                bmdc_reg: base.bmdc_reg,
                degree: base.degree,
                clinic_name: base.clinic_name,
                chamber_address: base.chamber_address,
                phone_number: base.phone_number
            },
            patient: {
                name: base.patient_name,
                age: base.age,
                gender: base.gender,
                id: base.db_patient_id // Explicitly mapped
            },
            diagnosis_text: base.diagnosis_text,
            general_advice: base.general_advice,
            chief_complaint: base.chief_complaint,
            medical_history: base.medical_history,
            investigations: base.investigations,
            follow_up_date: base.follow_up_date,
            // Safe parse JSON
            examination_findings: (() => {
                try { return JSON.parse(base.examination_findings || '{}') } 
                catch { return {} }
            })(),
            prescriptions: rows.map(r => ({
                trade_names: r.trade_names,
                generic_name: r.generic_name,
                strength: r.strength,
                quantity: r.quantity,
                sig_instruction: r.sig_instruction,
                duration: r.duration,
                counseling_points: r.drug_counseling 
            })),
            qrCodeDataUrl // Pass the generated QR
        };

        // 4. Generate PDF Stream
        const doc = new PDFDocument({ size: 'A4', margin: 40 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="Prescription_${base.patient_name}.pdf"`); 
        doc.pipe(res);

        // --- PDF LAYOUT (Using 'pdfData' variable now) ---
        
        // Header
        if (pdfData.doctor.clinic_name) {
            doc.fontSize(20).fillColor('#2c3e50').text(pdfData.doctor.clinic_name, 40, 40);
            doc.fontSize(10).fillColor('#555').text(pdfData.doctor.chamber_address || '', 40, 65);
            doc.text(`Phone: ${pdfData.doctor.phone_number || ''}`, 40, 80);
        }
        const startX = 350;
        doc.fontSize(14).fillColor('#000').text(`Dr. ${pdfData.doctor.full_name}`, startX, 40, { align: 'right' });
        doc.fontSize(10).fillColor('#333').text(pdfData.doctor.degree || '', startX, 60, { align: 'right' });
        doc.fontSize(9).fillColor('#666').text(pdfData.doctor.specialist_title || '', startX, 75, { align: 'right' });
        doc.text(`BMDC: ${pdfData.doctor.bmdc_reg}`, startX, 90, { align: 'right' });

        doc.moveDown(1.5);
        doc.lineWidth(1).strokeColor('#ccc').moveTo(40, 110).lineTo(555, 110).stroke();

        // Patient Info
        doc.y = 115;
        doc.fontSize(10).fillColor('#000');
        // Use pdfData here!
        doc.text(`Name: ${pdfData.patient.name}   [ID: ${pdfData.patient.id}]`, 40, 120); 
        doc.text(`Age: ${pdfData.patient.age || '--'}    Sex: ${pdfData.patient.gender}`, 320, 120);
        
        // Use current date or fetch creation date from 'base.created_at' if you want static date
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

        printLeftSection('Chief Complaint', pdfData.chief_complaint);
        
        const ef = pdfData.examination_findings || {};
        let findingsText = '';
        if (ef.bp) findingsText += `BP: ${ef.bp} mmHg\n`;
        if (ef.pulse) findingsText += `Pulse: ${ef.pulse} bpm\n`;
        if (ef.temp) findingsText += `Temp: ${ef.temp} F\n`;
        if (ef.weight) findingsText += `Wt: ${ef.weight} kg\n`;
        if (ef.height) findingsText += `Ht: ${ef.height}\n`;
        if (ef.bmi) findingsText += `BMI: ${ef.bmi}\n`;
        if (ef.spo2) findingsText += `SpO2: ${ef.spo2} %\n`;
        if (ef.other) findingsText += `\n${ef.other}`;

        printLeftSection('O/E', findingsText);
        printLeftSection('History', pdfData.medical_history);
        printLeftSection('Investigations', pdfData.investigations);
        printLeftSection('Diagnosis', pdfData.diagnosis_text);

        // RIGHT COL
        doc.y = rightY;
        doc.fontSize(18).font('Helvetica-Bold').fillColor('#000').text('Rx', rightColX, rightY);
        rightY += 30;

        pdfData.prescriptions.forEach((item, index) => {
            doc.y = rightY;
            const brand = item.trade_names || item.generic_name || 'Medicine'; 
            const strength = item.strength || '';
            
            doc.fontSize(11).font('Helvetica-Bold').fillColor('#000')
            .text(`${index + 1}. ${brand} ${strength}`, rightColX, rightY);
            
            doc.fontSize(8).font('Helvetica').fillColor('#555')
            .text(`(${item.generic_name})`, rightColX + 15, doc.y + 2);
            
            doc.fontSize(10).font('Helvetica').fillColor('#000')
            .text(`${item.sig_instruction} -- ${item.duration}`, rightColX + 15, doc.y + 2);
            
            if (item.counseling_points) {
                doc.fontSize(8).font('Helvetica-Oblique').fillColor('#666')
                .text(`Note: ${item.counseling_points}`, rightColX + 15, doc.y + 2);
            }

            rightY = doc.y + 12; 
        });

        rightY += 20;
        if (pdfData.general_advice) {
            doc.fontSize(11).font('Helvetica-Bold').fillColor('#2c3e50').text('Advice', rightColX, rightY);
            rightY += 15;
            doc.fontSize(10).font('Helvetica').fillColor('#333').text(pdfData.general_advice, rightColX, rightY, { width: rightColWidth });
            rightY = doc.y + 20;
        }
        
        if (pdfData.follow_up_date) {
            doc.fontSize(11).font('Helvetica-Bold').fillColor('#2c3e50').text('Follow-up', rightColX, rightY);
            rightY += 15;
            doc.fontSize(10).font('Helvetica').fillColor('#333').text(pdfData.follow_up_date, rightColX, rightY);
        }

        // Divider Line
        const maxY = Math.max(leftY, rightY, 680); 
        doc.lineWidth(0.5).strokeColor('#ddd').moveTo(200, 160).lineTo(200, maxY).stroke();

        // Footer with QR
        const bottomY = 730;
        if (pdfData.qrCodeDataUrl) {
            doc.image(pdfData.qrCodeDataUrl, 500, bottomY, { width: 50 });
            doc.fontSize(8).fillColor('#555').text('Scan for e-copy', 430, bottomY + 50, { align: 'right' });
        }
        
        doc.text('Powered by MedLipi', 40, bottomY + 30, { align: 'left' });

        doc.end();

    } catch (error) {
        console.error(error);
        res.status(500).send('Error generating prescription');
    }
});

export default router;