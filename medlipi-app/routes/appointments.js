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
        
        // Helper: Who is the "Operating Doctor"?
        if (req.user.role === 'doctor') req.operatingDoctorId = req.user.id;
        else if (req.user.role === 'receptionist' || req.user.role === 'assistant') req.operatingDoctorId = req.user.parentId;
        
        next();
    });
};

router.use(verifyAnyUser);

// --- GET Appointments (Doctor OR Staff View) ---
router.get('/', async (req, res) => {
    const { date, type } = req.query; // type='upcoming'

    // FIX 1: Allow Receptionists and Assistants to see the schedule too!
    if (req.user.role === 'patient') {
         return res.status(403).json({ message: 'Access denied for patients.' });
    }

    // Use the derived Doctor ID (Doctor's Own ID or Staff's Boss ID)
    const doctorId = req.operatingDoctorId; 

    try {
        let query = `
            SELECT 
                a.*, 
                p.name as patient_name, 
                p.mobile, 
                p.age, 
                p.gender,
                p.dob,          
                p.address,      
                p.email,        
                p.referred_by,  
                ds.start_time as session_start
            FROM appointments a
            JOIN patients p ON a.patient_id = p.patient_id
            LEFT JOIN doctor_schedules ds ON a.schedule_id = ds.schedule_id
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

// --- POST Create Appointment (Legacy / Manual) ---
// Note: This is for manual bookings without Serial/Session logic
router.post('/', async (req, res) => {
    const { patient_id, visit_date, visit_time, reason, source } = req.body;
    
    let doctorId, finalPatientId, finalSource;

    if (req.user.role === 'patient') {
        // Patients should ideally use the 'book-serial' route for new system
        // But for fallback compatibility:
        doctorId = req.body.doctor_id || 1; 
        finalPatientId = req.user.id; 
        finalSource = 'Online';
    } else {
        // Doctor or Staff
        doctorId = req.operatingDoctorId; // Using helper set in middleware
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
    
    if (req.user.role === 'patient') return res.status(403).json({message: "Unauthorized"});

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
    if (req.user.role === 'patient') return res.status(403).json({message: "Unauthorized"});
    
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