import express from 'express';
import pool from '../db.js';
import verifyToken from '../middleware/auth.js'; 

const router = express.Router();

// Middleware: Check if user is Doctor OR Patient
// For now, let's allow the existing verifyToken (Doctor) and make a new one for Patients later,
// or just make this route handle both if token payload differs. 
// For this step, let's focus on DOCTOR/ADMIN access first.
router.use(verifyToken);

// --- GET Appointments for a Specific Date ---
router.get('/', async (req, res) => {
    const { date } = req.query; // Format: YYYY-MM-DD
    const doctorId = req.doctor.id;

    if (!date) return res.status(400).json({ message: 'Date required' });

    try {
        const query = `
            SELECT 
                a.*, 
                p.name as patient_name, p.mobile, p.age, p.gender
            FROM appointments a
            JOIN patients p ON a.patient_id = p.patient_id
            WHERE a.doctor_id = ? AND a.visit_date = ?
            ORDER BY a.visit_time ASC
        `;
        const [rows] = await pool.query(query, [doctorId, date]);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// --- POST Create Appointment (Manual) ---
router.post('/', async (req, res) => {
    const { patient_id, visit_date, visit_time, reason, source } = req.body;
    const doctorId = req.doctor.id;

    try {
        await pool.query(
            `INSERT INTO appointments (doctor_id, patient_id, visit_date, visit_time, reason, source) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [doctorId, patient_id, visit_date, visit_time || null, reason || 'Routine Checkup', source || 'Reception']
        );
        res.status(201).json({ message: 'Appointment booked' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Booking failed' });
    }
});

// --- PUT Update Status (Check-in / Cancel) ---
router.put('/:id/status', async (req, res) => {
    const { status } = req.body;
    const { id } = req.params;
    
    try {
        await pool.query('UPDATE appointments SET status = ? WHERE appointment_id = ?', [status, id]);
        res.json({ message: 'Status updated' });
    } catch (error) {
        res.status(500).json({ message: 'Update failed' });
    }
});

export default router;