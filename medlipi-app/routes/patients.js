import express from 'express';
import pool from '../db.js';
import verifyToken from '../middleware/auth.js'; 

const router = express.Router();
router.use(verifyToken); // All patient routes require the doctor to be logged in

// --- GET All Patients (Paginated Search) ---
router.get('/', async (req, res) => {
    const { q, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const doctorId = req.doctor.id;
    const searchTerm = q ? `%${q}%` : '%';

    try {
        // Get Patients linked to this doctor
        // Includes 'Last Visit' calculation
        const query = `
            SELECT 
                p.patient_id, p.name, p.age, p.gender,
                MAX(pr.created_at) as last_visit
            FROM patients p
            JOIN prescriptions pr ON p.patient_id = pr.patient_id
            WHERE pr.doctor_id = ? AND p.name LIKE ?
            GROUP BY p.patient_id
            ORDER BY last_visit DESC
            LIMIT ? OFFSET ?
        `;
        
        // Get Total Count for Pagination
        const countQuery = `
            SELECT COUNT(DISTINCT p.patient_id) as total
            FROM patients p
            JOIN prescriptions pr ON p.patient_id = pr.patient_id
            WHERE pr.doctor_id = ? AND p.name LIKE ?
        `;

        const [patients] = await pool.query(query, [doctorId, searchTerm, parseInt(limit), parseInt(offset)]);
        const [countResult] = await pool.query(countQuery, [doctorId, searchTerm]);

        res.json({
            data: patients,
            pagination: {
                total: countResult[0].total,
                page: parseInt(page),
                pages: Math.ceil(countResult[0].total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching patients:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});

// --- GET Single Patient Full Profile ---
// We can reuse or expand the existing '/:id/history', but let's make a dedicated profile fetch
router.get('/:id/profile', async (req, res) => {
    const patientId = req.params.id;
    const doctorId = req.doctor.id;

    try {
        // 1. Patient Demographics
        const [patientRows] = await pool.query(
            'SELECT * FROM patients WHERE patient_id = ?', 
            [patientId]
        );
        
        if (patientRows.length === 0) return res.status(404).json({ message: 'Patient not found' });

        // 2. Visit History (Grouped)
        // This reuses logic similar to the history endpoint but formatted for a timeline
        const historyQuery = `
            SELECT 
                pr.prescription_id, pr.created_at, pr.diagnosis_text, pr.general_advice,
                d.generic_name, d.trade_names, d.strength, pr.sig_instruction, pr.duration
            FROM prescriptions pr
            LEFT JOIN drug_inventory d ON pr.drug_id = d.drug_id
            WHERE pr.patient_id = ? AND pr.doctor_id = ?
            ORDER BY pr.created_at DESC
        `;
        const [historyRows] = await pool.query(historyQuery, [patientId, doctorId]);

        // Grouping Logic
        const timeline = historyRows.reduce((acc, row) => {
            const date = new Date(row.created_at).toLocaleDateString();
            const time = new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const key = `${date}_${row.diagnosis_text}`; // Group by date + diagnosis context
            
            if (!acc[key]) {
                acc[key] = {
                    date, time,
                    diagnosis: row.diagnosis_text,
                    advice: row.general_advice,
                    drugs: []
                };
            }
            acc[key].drugs.push({
                name: row.generic_name,
                brand: row.trade_names,
                strength: row.strength,
                sig: row.sig_instruction,
                duration: row.duration
            });
            return acc;
        }, {});

        res.json({
            patient: patientRows[0],
            timeline: Object.values(timeline)
        });

    } catch (error) {
        console.error('Error fetching patient profile:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});

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
            SELECT DISTINCT 
                p.patient_id, p.name, p.age, p.gender, 
                p.dob, p.mobile, p.email, p.address, p.referred_by -- Select new columns
            FROM patients p
            JOIN prescriptions pr ON p.patient_id = pr.patient_id
            WHERE pr.doctor_id = ? AND (p.name LIKE ? OR p.mobile LIKE ?)
            LIMIT 20
        `;
        
        const [patients] = await pool.query(query, [doctorId, searchTerm,  searchTerm]);
        
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
            di.drug_id,
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
                drug_id: item.drug_id,
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