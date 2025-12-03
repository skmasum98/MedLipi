import express from 'express';
import pool from '../db.js';
import verifyToken from '../middleware/auth.js'; 

const router = express.Router();
router.use(verifyToken); 

// --- GET All Patients (Paginated Search) ---
// router.get('/', async (req, res) => {
//     const { q, page = 1, limit = 20 } = req.query;
//     const offset = (page - 1) * limit;
//     const doctorId = req.doctor.id;
//     const searchTerm = q ? `%${q}%` : '%';

//     try {
//         const query = `
//             SELECT 
//                 p.patient_id, p.name, p.age, p.gender,
//                 MAX(pr.created_at) as last_visit
//             FROM patients p
//             JOIN prescriptions pr ON p.patient_id = pr.patient_id
//             WHERE pr.doctor_id = ? AND p.name LIKE ?
//             GROUP BY p.patient_id
//             ORDER BY last_visit DESC
//             LIMIT ? OFFSET ?
//         `;
        
//         const countQuery = `
//             SELECT COUNT(DISTINCT p.patient_id) as total
//             FROM patients p
//             JOIN prescriptions pr ON p.patient_id = pr.patient_id
//             WHERE pr.doctor_id = ? AND p.name LIKE ?
//         `;

//         const [patients] = await pool.query(query, [doctorId, searchTerm, parseInt(limit), parseInt(offset)]);
//         const [countResult] = await pool.query(countQuery, [doctorId, searchTerm]);

//         res.json({
//             data: patients,
//             pagination: {
//                 total: countResult[0].total,
//                 page: parseInt(page),
//                 pages: Math.ceil(countResult[0].total / limit)
//             }
//         });
//     } catch (error) {
//         console.error('Error fetching patients:', error);
//         res.status(500).json({ message: 'Server error.' });
//     }
// });

// --- GET All Patients (Search + Filter + Pagination) ---
router.get('/', async (req, res) => {
    const { 
        q, page = 1, limit = 10, 
        gender, address, diagnosis, 
        startDate, endDate // <--- New Params
    } = req.query;

    const offset = (page - 1) * limit;
    const doctorId = req.doctor.id;
    const searchTerm = q ? `%${q}%` : '%';

    try {
        // Base Query Logic
        let whereClause = `
            WHERE pr.doctor_id = ? 
            AND (p.name LIKE ? OR p.mobile LIKE ?)
        `;
        const params = [doctorId, searchTerm, searchTerm];

        // --- DYNAMIC FILTERS ---
        if (gender) { whereClause += ` AND p.gender = ?`; params.push(gender); }
        if (address) { whereClause += ` AND p.address LIKE ?`; params.push(`%${address}%`); }
        if (diagnosis) { whereClause += ` AND pr.diagnosis_text LIKE ?`; params.push(`%${diagnosis}%`); }
        
        // --- DATE FILTERS (NEW) ---
        if (startDate) { 
            whereClause += ` AND DATE(pr.created_at) >= ?`; 
            params.push(startDate); 
        }
        if (endDate) { 
            whereClause += ` AND DATE(pr.created_at) <= ?`; 
            params.push(endDate); 
        }

        // --- 1. DATA QUERY ---
        const sql = `
            SELECT 
                p.patient_id, p.name, p.age, p.gender, p.mobile, p.address,
                MAX(pr.created_at) as last_visit
            FROM patients p
            LEFT JOIN prescriptions pr ON p.patient_id = pr.patient_id
            ${whereClause}
            GROUP BY p.patient_id
            ORDER BY last_visit DESC
            LIMIT ? OFFSET ?
        `;
        
        // --- 2. COUNT QUERY ---
        const countSql = `
            SELECT COUNT(DISTINCT p.patient_id) as total
            FROM patients p
            LEFT JOIN prescriptions pr ON p.patient_id = pr.patient_id
            ${whereClause}
        `;

        // Add limit/offset to params ONLY for the data query
        const dataParams = [...params, parseInt(limit), parseInt(offset)];
        const countParams = [...params];

        const [patients] = await pool.query(sql, dataParams);
        const [countResult] = await pool.query(countSql, countParams);

        res.json({
            data: patients,
            pagination: {
                total: countResult[0].total,
                currentPage: parseInt(page),
                totalPages: Math.ceil(countResult[0].total / limit),
                limit: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Error fetching patients:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});

// --- GET Single Patient Full Profile (Timeline & Edit Data) ---
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
        // FIX: Added all the clinical fields (chief_complaint, etc.) to the SELECT
        const historyQuery = `
            SELECT 
                pr.prescription_id, pr.created_at, 
                pr.diagnosis_text, pr.general_advice,
                pr.chief_complaint, pr.medical_history, pr.examination_findings, 
                pr.investigations, pr.follow_up_date,
                pr.drug_id, pr.quantity, pr.sig_instruction, pr.duration,
                d.generic_name, d.trade_names, d.strength, d.counseling_points
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
            // Use exact timestamp string for grouping to allow precision editing
            const key = row.created_at.toISOString(); 
            
            if (!acc[key]) {
                acc[key] = {
                    date, time,
                    raw_date: row.created_at, // Critical for Edit/Update identification
                    diagnosis: row.diagnosis_text,
                    advice: row.general_advice,
                    // Map new clinical fields so they appear in Edit Form
                    chief_complaint: row.chief_complaint,
                    medical_history: row.medical_history,
                    examination_findings: row.examination_findings,
                    investigations: row.investigations,
                    follow_up_date: row.follow_up_date,
                    drugs: []
                };
            }
            // Only add drug if it exists (in case of manual row insertion errors)
            if (row.drug_id) {
                acc[key].drugs.push({
                    drug_id: row.drug_id,
                    name: row.generic_name,
                    brand: row.trade_names,
                    strength: row.strength,
                    sig: row.sig_instruction,
                    duration: row.duration,
                    quantity: row.quantity,
                    counseling_points: row.counseling_points
                });
            }
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

// --- GET Search Patients ---
router.get('/search', async (req, res) => {
    const searchTerm = req.query.q ? `%${req.query.q}%` : '';
    const doctorId = req.doctor.id;
    
    if (!searchTerm) {
        return res.status(400).json({ message: 'Search term (q) is required.' });
    }

    try {
        const query = `
            SELECT DISTINCT 
                p.patient_id, p.name, p.age, p.gender, 
                p.dob, p.mobile, p.email, p.address, p.referred_by 
            FROM patients p
            JOIN prescriptions pr ON p.patient_id = pr.patient_id
            WHERE pr.doctor_id = ? AND (p.name LIKE ? OR p.mobile LIKE ?)
            LIMIT 20
        `;
        
        const [patients] = await pool.query(query, [doctorId, searchTerm, searchTerm]);
        
        res.json(patients);
    } catch (error) {
        console.error('Error searching patients:', error);
        res.status(500).json({ message: 'Server error during patient search.' });
    }
});

// --- GET Mini History (For Prescription Form) ---
router.get('/:patientId/history', async (req, res) => {
    const patientId = req.params.patientId;
    const doctorId = req.doctor.id;

    try {
        const query = `
            SELECT 
                pr.prescription_id, pr.created_at, pr.diagnosis_text, pr.general_advice,
                pr.drug_id, pr.sig_instruction, pr.quantity, pr.duration,
                di.generic_name, di.trade_names, di.strength, di.counseling_points
            FROM prescriptions pr
            JOIN drug_inventory di ON pr.drug_id = di.drug_id
            WHERE pr.patient_id = ? AND pr.doctor_id = ?
            ORDER BY pr.created_at DESC;
        `;
        
        const [history] = await pool.query(query, [patientId, doctorId]);

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
                counseling_points: item.counseling_points
            });
            return acc;
        }, {});
        
        res.json(Object.values(groupedHistory));

    } catch (error) {
        console.error('Error fetching patient history:', error);
        res.status(500).json({ message: 'Server error fetching history.' });
    }
});

export default router;