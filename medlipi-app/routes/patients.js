import express from 'express';
import pool from '../db.js';
import verifyToken from '../middleware/auth.js'; 

import { formatInTimeZone } from 'date-fns-tz'; 

const router = express.Router();
router.use(verifyToken); 

// Helper function to get correct doctor ID
const getOperatingDoctorId = (req) => {
    return (req.user.role === 'doctor') ? req.user.id : req.user.parentId;
};


// --- GET All Patients (Search + Filter + Pagination) ---
router.get('/', async (req, res) => {
    const { q, page = 1, limit = 10, gender, address, diagnosis, startDate, endDate } = req.query;

    const offset = (page - 1) * limit;
    const doctorId = getOperatingDoctorId(req);

    if (!doctorId) return res.status(403).json({ message: "No doctor association found" });
    
    const searchTerm = q ? `%${q}%` : '%';

    try {
        let whereClause = `
            WHERE pr.doctor_id = ? 
            AND (p.name LIKE ? OR p.mobile LIKE ?)
        `;
        const params = [doctorId, searchTerm, searchTerm];

        if (gender) { whereClause += ` AND p.gender = ?`; params.push(gender); }
        if (address) { whereClause += ` AND p.address LIKE ?`; params.push(`%${address}%`); }
        if (diagnosis) { whereClause += ` AND pr.diagnosis_text LIKE ?`; params.push(`%${diagnosis}%`); }
        
        if (startDate) { 
            whereClause += ` AND DATE(pr.created_at) >= ?`; 
            params.push(startDate); 
        }
        if (endDate) { 
            whereClause += ` AND DATE(pr.created_at) <= ?`; 
            params.push(endDate); 
        }

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
        
        const countSql = `
            SELECT COUNT(DISTINCT p.patient_id) as total
            FROM patients p
            LEFT JOIN prescriptions pr ON p.patient_id = pr.patient_id
            ${whereClause}
        `;

        const dataParams = [...params, parseInt(limit), parseInt(offset)];
        const [patients] = await pool.query(sql, dataParams);
        const [countResult] = await pool.query(countSql, params);

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

// --- GET Single Patient Full Profile ---
router.get('/:id/profile', async (req, res) => {
    const patientId = req.params.id;
    // FIX: Use Helper
    const doctorId = getOperatingDoctorId(req); 

    try {
        const [patientRows] = await pool.query('SELECT * FROM patients WHERE patient_id = ?', [patientId]);
        if (patientRows.length === 0) return res.status(404).json({ message: 'Patient not found' });

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

        const timeline = historyRows.reduce((acc, row) => {
            // Safe Date Formatting
            const dateObj = new Date(row.created_at);
            const date = dateObj.toLocaleDateString();
            const time = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            const key = row.created_at; // Raw string
            
            if (!acc[key]) {
                acc[key] = {
                    date, time,
                    raw_date: row.created_at, 
                    diagnosis: row.diagnosis_text,
                    advice: row.general_advice,
                    chief_complaint: row.chief_complaint,
                    medical_history: row.medical_history,
                    examination_findings: row.examination_findings,
                    investigations: row.investigations,
                    follow_up_date: row.follow_up_date,
                    drugs: []
                };
            }
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

// --- GET Search Patients (Mini Search) ---
router.get('/search', async (req, res) => {
    const searchTerm = req.query.q ? `%${req.query.q}%` : '';
    // FIX: Use Helper
    const doctorId = getOperatingDoctorId(req);
    
    if (!searchTerm) return res.status(400).json({ message: 'Search term (q) is required.' });

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

// --- GET Mini History ---
router.get('/:patientId/history', async (req, res) => {
    const patientId = req.params.patientId;
    // FIX: Use Helper
    const doctorId = getOperatingDoctorId(req);

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
            const dateObj = new Date(item.created_at);
            const date = dateObj.toLocaleDateString();
            const key = item.created_at;

            if (!acc[key]) {
                acc[key] = {
                    date: date,
                    diagnosis: item.diagnosis_text,
                    advice: item.general_advice,
                    prescriptions: []
                };
            }
            acc[key].prescriptions.push({
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