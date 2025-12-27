import express from 'express';
import pool from '../db.js';
import verifyToken from '../middleware/auth.js'; 

const router = express.Router();
router.use(verifyToken); 

// Helper function to get correct doctor ID from TOKEN
const getOperatingDoctorId = (req) => {
    // If 'global_receptionist' calls without params, they have no implicit doctor context
    if (req.user.role === 'global_receptionist') return null;
    return (req.user.role === 'doctor') ? req.user.id : req.user.parentId;
};

// --- GET All Patients (Search + Filter + Pagination) ---
router.get('/', async (req, res) => {
    const { 
        q, page = 1, limit = 10, 
        gender, address, diagnosis, 
        startDate, endDate, 
        doctor_id // Explicit param from frontend
    } = req.query;

    const offset = (page - 1) * limit;
    
    // 1. DETERMINE SEARCH SCOPE (TARGET DOCTOR ID)
    let searchDoctorId = null;

    if (doctor_id) {
        // A. Frontend Explicitly Requests a Doctor Context
        
        // Security: Who can override doctor_id?
        // 1. Global Receptionist -> YES
        // 2. Doctor/Staff -> ONLY if it matches their own ID/Boss ID (Safety check)
        const myContext = getOperatingDoctorId(req);
        
        if (req.user.role === 'global_receptionist') {
            searchDoctorId = doctor_id;
        } else {
             // For regular staff, ensure they aren't peeking at other clinics
             if (String(doctor_id) !== String(myContext)) {
                  return res.status(403).json({ message: "Cross-clinic search forbidden." });
             }
             searchDoctorId = myContext;
        }

    } else {
        // B. Implicit Context from Token (Regular Staff Workflow)
        searchDoctorId = getOperatingDoctorId(req);
    }

    if (!searchDoctorId) return res.status(403).json({ message: "No doctor context. Please select a doctor first." });
    
    // ... Prepare Query ...
    const searchTerm = q ? `%${q}%` : '%';

    try {
        // Base Condition
        let whereClause = `
            WHERE pr.doctor_id = ? 
            AND (p.name LIKE ? OR p.mobile LIKE ?)
        `;
        const params = [searchDoctorId, searchTerm, searchTerm];

        // --- Dynamic Filters ---
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
    // We assume doctorId is either implicit or should be checked. 
    // Usually for a single patient profile, security is looser if patient ID is known, 
    // but ideally we check if patient belongs to doctor context.
    const doctorId = getOperatingDoctorId(req);
    
    // For Global Receptionist who might access ANY patient ID:
    // This part requires complex logic (join patient-prescription-doctor).
    // For now, let's keep basic security: only operating doc sees profile.

    try {
        const [patientRows] = await pool.query('SELECT * FROM patients WHERE patient_id = ?', [patientId]);
        if (patientRows.length === 0) return res.status(404).json({ message: 'Patient not found' });

        // IMPORTANT: If user is Global, we might need to skip doctor_id check or fetch based on query params.
        // Assuming strict clinic walls for profile details:
        
        let historyQuery = `
            SELECT 
                pr.prescription_id, pr.created_at, 
                pr.diagnosis_text, pr.general_advice,
                pr.chief_complaint, pr.medical_history, pr.examination_findings, 
                pr.investigations, pr.follow_up_date,
                pr.drug_id, pr.quantity, pr.sig_instruction, pr.duration,
                d.generic_name, d.trade_names, d.strength, d.counseling_points
            FROM prescriptions pr
            LEFT JOIN drug_inventory d ON pr.drug_id = d.drug_id
            WHERE pr.patient_id = ?
        `;
        const historyParams = [patientId];

        // Restrict history to doctor if NOT global
        if (req.user.role !== 'global_receptionist' && doctorId) {
             historyQuery += ` AND pr.doctor_id = ?`;
             historyParams.push(doctorId);
        }
        
        historyQuery += ` ORDER BY pr.created_at DESC`;
        
        const [historyRows] = await pool.query(historyQuery, historyParams);

        const timeline = historyRows.reduce((acc, row) => {
            const key = row.created_at; 
            
            // Re-creating Date Object for formatting
            const d = new Date(row.created_at);
            const date = d.toLocaleDateString();
            const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            if (!acc[key]) {
                acc[key] = {
                    date, time,
                    raw_date: key, 
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

// ... Keep your Search and Mini History (ensure getOperatingDoctorId is used if needed)

// --- GET Search Patients (Mini Typeahead) ---
router.get('/search', async (req, res) => {
    // Standardize handling like GET / (root)
    // Extract ID logic
    const { q, doctor_id } = req.query;
    
    let searchDoctorId = null;
    if (req.user.role === 'global_receptionist' && doctor_id) searchDoctorId = doctor_id;
    else searchDoctorId = getOperatingDoctorId(req);

    if (!searchDoctorId || !q) return res.json([]); 

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
        const searchTerm = `%${q}%`;
        const [patients] = await pool.query(query, [searchDoctorId, searchTerm, searchTerm]);
        res.json({ data: patients }); // Ensuring unified response format
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});


// --- GET Search Patients (Mini Search) ---
router.get('/search-patient', async (req, res) => {
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