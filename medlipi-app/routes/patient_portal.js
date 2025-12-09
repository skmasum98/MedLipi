import express from 'express';
import pool from '../db.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// --- 0. PATIENT REGISTRATION ---
router.post('/register', async (req, res) => {
    const { name, mobile, age, gender, address } = req.body;

    // 1. Basic Validation
    if (!name || !mobile || !gender) {
        return res.status(400).json({ message: 'Name, Mobile, and Gender are required.' });
    }

    try {
        // 2. Check if Mobile already exists (Prevent duplicates)
        // In a real app, you might use OTP to verify, but for now, we enforce unique mobile numbers.
        const [existing] = await pool.query('SELECT patient_id FROM patients WHERE mobile = ?', [mobile]);
        
        if (existing.length > 0) {
            return res.status(409).json({ message: 'This mobile number is already registered. Please login.' });
        }

        // 3. Insert New Patient
        // We use "0" as doctor_id or handle it logically. In your schema, patients table doesn't enforce doctor_id, 
        // prescriptions map patients to doctors. So a patient can exist independently.
        const query = `
            INSERT INTO patients (name, mobile, age, gender, address, created_at) 
            VALUES (?, ?, ?, ?, ?, NOW())
        `;
        
        const [result] = await pool.query(query, [name, mobile, age, gender, address]);
        const newPatientId = result.insertId;

        // 4. Generate Token (Auto-Login)
        const token = jwt.sign(
            { id: newPatientId, role: 'patient', name: name },
            process.env.JWT_SECRET,
            { expiresIn: '30d' } 
        );

        res.status(201).json({ 
            message: 'Registration Successful', 
            token,
            patient: { id: newPatientId, name, mobile }
        });

    } catch (error) {
        console.error("Registration Error:", error);
        res.status(500).json({ message: 'Server error during registration' });
    }
});


// --- 1. PATIENT LOGIN (ID + Mobile) ---
router.post('/login', async (req, res) => {
    const { patient_id, mobile } = req.body;

    if (!patient_id || !mobile) {
        return res.status(400).json({ message: 'Patient ID and Mobile are required.' });
    }

    try {
        // Verify User exists matching BOTH ID and Mobile
        const [rows] = await pool.query(
            'SELECT * FROM patients WHERE patient_id = ? AND mobile = ?', 
            [patient_id, mobile]
        );

        if (rows.length === 0) {
            return res.status(401).json({ message: 'Invalid Credentials. Check the ID on your prescription.' });
        }

        const patient = rows[0];

        // Generate Patient-Specific Token
        // distinct secret or same secret is fine, but we tag role='patient'
        const token = jwt.sign(
            { id: patient.patient_id, role: 'patient', name: patient.name },
            process.env.JWT_SECRET,
            { expiresIn: '30d' } 
        );

        res.json({ 
            token,
            patient: { id: patient.patient_id, name: patient.name, mobile: patient.mobile }
        });

    } catch (error) {
        console.error("Patient Login Error:", error);
        res.status(500).json({ message: 'Login error' });
    }
});

// --- Middleware: Verify PATIENT Token ---
const verifyPatientToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No token provided' });

    const token = authHeader.split(' ')[1];
    
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ message: 'Invalid token' });
        if (decoded.role !== 'patient') return res.status(403).json({ message: 'Not authorized as patient' });
        
        req.patientId = decoded.id;
        next();
    });
};

// --- 2. GET MY HISTORY ---
router.get('/my-history', verifyPatientToken, async (req, res) => {
    try {
        // We group by public_uid to show unique visits
        // We link to public_uid for the download link
        const query = `
            SELECT 
                p.public_uid, 
                MAX(p.created_at) as visit_date, 
                MAX(p.diagnosis_text) as diagnosis,
                MAX(d.clinic_name) as clinic,
                MAX(d.full_name) as doctor_name
            FROM prescriptions p
            JOIN doctors d ON p.doctor_id = d.doctor_id
            WHERE p.patient_id = ?
            GROUP BY p.public_uid
            ORDER BY visit_date DESC
        `;
        const [rows] = await pool.query(query, [req.patientId]);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});


// --- 3. GET MY ACTIVE APPOINTMENTS ---
router.get('/my-appointments', verifyPatientToken, async (req, res) => {
    try {
        const query = `
            SELECT 
                a.appointment_id, a.visit_date, a.visit_time, a.status, a.serial_number,
                d.clinic_name,
                d.full_name as doctor_name
            FROM appointments a
            JOIN doctors d ON a.doctor_id = d.doctor_id
            WHERE a.patient_id = ? 
            AND a.visit_date >= CURDATE() -- Only future or today
            AND a.status != 'Cancelled'
            ORDER BY a.visit_date ASC
        `;
        const [rows] = await pool.query(query, [req.patientId]);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;