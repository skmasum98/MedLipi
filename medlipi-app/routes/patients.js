import express from 'express';
import pool from '../db.js';
import verifyToken from '../middleware/auth.js'; 

const router = express.Router();
router.use(verifyToken); // All patient routes require the doctor to be logged in

// --- GET Search Patients by Name (/api/patients/search?q=) ---
router.get('/search', async (req, res) => {
    const searchTerm = req.query.q ? `%${req.query.q}%` : '';
    const doctorId = req.doctor.id;
    
    if (!searchTerm) {
        return res.status(400).json({ message: 'Search term (q) is required.' });
    }

    try {
        // Search patients linked to *this* doctor's prescriptions
        // This query finds patients whose names match and who have an existing prescription record by this doctor
        const query = `
            SELECT DISTINCT p.patient_id, p.name, p.age, p.gender
            FROM patients p
            JOIN prescriptions pr ON p.patient_id = pr.patient_id
            WHERE pr.doctor_id = ? AND p.name LIKE ?
            LIMIT 20
        `;
        
        const [patients] = await pool.query(query, [doctorId, searchTerm]);
        
        res.json(patients);
    } catch (error) {
        console.error('Error searching patients:', error);
        res.status(500).json({ message: 'Server error during patient search.' });
    }
});

// --- GET Patient History by ID (/api/patients/:patientId/history) ---
router.get('/:patientId/history', async (req, res) => {
    const patientId = req.params.patientId;
    const doctorId = req.doctor.id;

    try {
        // Fetch all prescriptions for a patient by this specific doctor
        const query = `
            SELECT 
                pr.prescription_id, pr.created_at, pr.diagnosis_text, pr.general_advice,
                di.generic_name, di.trade_names, di.strength, pr.sig_instruction, pr.quantity, pr.duration
            FROM prescriptions pr
            JOIN drug_inventory di ON pr.drug_id = di.drug_id
            WHERE pr.patient_id = ? AND pr.doctor_id = ?
            ORDER BY pr.created_at DESC;
        `;
        
        const [history] = await pool.query(query, [patientId, doctorId]);

        // Group the drugs by prescription_id to format the history nicely
        const groupedHistory = history.reduce((acc, item) => {
            const date = new Date(item.created_at).toLocaleDateString();
            if (!acc[date]) {
                acc[date] = {
                    date: date,
                    diagnosis: item.diagnosis_text,
                    advice: item.general_advice,
                    prescriptions: []
                };
            }
            acc[date].prescriptions.push({
                generic_name: item.generic_name,
                trade_names: item.trade_names,
                strength: item.strength,
                sig: item.sig_instruction,
                quantity: item.quantity,
                duration: item.duration,
            });
            return acc;
        }, {});
        
        // Convert the grouped object back to an array
        res.json(Object.values(groupedHistory));

    } catch (error) {
        console.error('Error fetching patient history:', error);
        res.status(500).json({ message: 'Server error fetching history.' });
    }
});

export default router;