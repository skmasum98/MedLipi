import express from 'express';
import pool from '../db.js';
import jwt from 'jsonwebtoken'; 

const router = express.Router();

// --- HYBRID AUTH MIDDLEWARE ---
const verifyAnyUser = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No token' });

    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ message: 'Invalid token' });
        req.user = decoded; 
        next();
    });
};

router.use(verifyAnyUser);

// --- GET Appointments (Doctor View) ---
router.get('/', async (req, res) => {
    const { date, type } = req.query; // type='upcoming'

    // Security: Only Doctors (or authorized staff)
    if (req.user.role !== 'doctor' && !req.user.bmdc) {
         return res.status(403).json({ message: 'Access denied.' });
    }

    const doctorId = req.user.id; 

    try {
        // FIX: Changed 'const' to 'let' so we can append string conditions
        let query = `
            SELECT 
                a.*, 
                p.name as patient_name, p.mobile, p.age, p.gender,
                ds.start_time as session_start -- <--- THIS LINE IS REQUIRED
            FROM appointments a
            JOIN patients p ON a.patient_id = p.patient_id
            LEFT JOIN doctor_schedules ds ON a.schedule_id = ds.schedule_id -- <--- JOIN REQUIRED
            WHERE a.doctor_id = ?
        `;
        
        const params = [doctorId];

        if (type === 'upcoming') {
            query += ` AND a.visit_date >= CURDATE() ORDER BY a.visit_date ASC, a.visit_time ASC LIMIT 50`;
        } else if (date) {
            query += ` AND a.visit_date = ? ORDER BY a.visit_time ASC`;
            params.push(date);
        } else {
             // Default: Today
             query += ` AND a.visit_date = CURDATE() ORDER BY a.visit_time ASC`;
        }

        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error("GET Appointment Error:", error);
        res.status(500).json({ message: 'Server error' });
    }
});

// --- POST Create Appointment ---
router.post('/', async (req, res) => {
    const { patient_id, visit_date, visit_time, reason, source } = req.body;
    
    let doctorId, finalPatientId, finalSource;

    if (req.user.role === 'patient') {
        doctorId = req.body.doctor_id || 1; 
        finalPatientId = req.user.id; 
        finalSource = 'Online';
    } else {
        doctorId = req.user.id;
        finalPatientId = patient_id;
        finalSource = source || 'Reception';
    }

    try {
        await pool.query(
            `INSERT INTO appointments (doctor_id, patient_id, visit_date, visit_time, reason, source, status) 
             VALUES (?, ?, ?, ?, ?, ?, 'Scheduled')`,
            [doctorId, finalPatientId, visit_date, visit_time || null, reason || 'Online Booking', finalSource]
        );
        res.status(201).json({ message: 'Appointment booked successfully' });
    } catch (error) {
        console.error("POST Appointment Error:", error);
        res.status(500).json({ message: 'Booking failed' });
    }
});

// --- PUT Update Details ---
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { visit_date, visit_time, reason, status } = req.body;

    try {
        await pool.query(
            `UPDATE appointments 
             SET visit_date = ?, visit_time = ?, reason = ?, status = ?
             WHERE appointment_id = ?`,
            [visit_date, visit_time, reason, status, id]
        );
        res.json({ message: 'Appointment updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Update failed' });
    }
});

// --- PUT Update Status ---
router.put('/:id/status', async (req, res) => {
    const { status } = req.body;
    const { id } = req.params;
    
    if (req.user.role === 'patient') return res.status(403).json({message: "Unauthorized"});

    try {
        await pool.query('UPDATE appointments SET status = ? WHERE appointment_id = ?', [status, id]);
        res.json({ message: 'Status updated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Update failed' });
    }
});

// --- DELETE Appointment ---
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM appointments WHERE appointment_id = ?', [id]);
        res.json({ message: 'Appointment deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Delete failed' });
    }
});

export default router;