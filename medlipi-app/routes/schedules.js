import express from 'express';
import pool from '../db.js';
import verifyToken from '../middleware/auth.js'; 

const router = express.Router();

// Middleware to verify User (Doc or Patient)
// (Reuse the 'verifyAnyUser' logic from appointments.js or import it)
// For brevity, I'm redefining a simple one here or assume you import it.
import jwt from 'jsonwebtoken';

const verifyAnyUser = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token' });
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ message: 'Invalid token' });
        req.user = decoded;
        next();
    });
};

router.use(verifyAnyUser);

// --- DOCTOR: GET MY OWN SESSIONS (All: Past & Future) ---
router.get('/my-sessions', async (req, res) => {
    // 1. Security Check
    if (req.user.role !== 'doctor' && !req.user.bmdc) {
        return res.status(403).json({ message: "Access denied" });
    }

    try {
        const query = `
            SELECT 
                s.*, 
                COUNT(a.appointment_id) as booked_count
            FROM doctor_schedules s
            LEFT JOIN appointments a ON s.schedule_id = a.schedule_id AND a.status != 'Cancelled'
            WHERE s.doctor_id = ? 
            GROUP BY s.schedule_id
            ORDER BY s.date DESC, s.start_time ASC
        `;
        // Use req.user.id (from token)
        const [rows] = await pool.query(query, [req.user.id]);
        res.json(rows);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error fetching my sessions' });
    }
});

// --- DOCTOR: DELETE SESSION ---
router.delete('/:id', async (req, res) => {
    if (req.user.role !== 'doctor') return res.status(403).json({ message: "Unauthorized" });
    
    const scheduleId = req.params.id;

     try {
        await pool.query('DELETE FROM doctor_schedules WHERE schedule_id = ? AND doctor_id = ?', [scheduleId, req.user.id]);
        res.json({ message: 'Session deleted' });
    } catch (e) {
        // --- Critical for Debugging ---
        // 'ER_ROW_IS_REFERENCED_2' = Constraint Error (Patients have booked)
        if (e.code === 'ER_ROW_IS_REFERENCED_2' || e.errno === 1451) {
            return res.status(400).json({ message: 'This session has active appointments. Please cancel them first in the Schedule page.' });
        }
        res.status(500).json({ message: 'Delete failed (Server Error)' });
    }
});

// --- DOCTOR: CREATE SESSION ---
router.post('/create', async (req, res) => {
    if (req.user.role === 'patient') return res.status(403).json({message: "Patients cannot create schedules"});

    const { date, session_name, start_time, end_time, max_patients } = req.body;
    const doctorId = req.user.id;

    try {
        await pool.query(
            `INSERT INTO doctor_schedules (doctor_id, date, session_name, start_time, end_time, max_patients)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [doctorId, date, session_name, start_time, end_time, max_patients]
        );
        res.status(201).json({ message: 'Session Created' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error creating session' });
    }
});

// --- PUBLIC/PATIENT: GET AVAILABLE SESSIONS ---
router.get('/available', async (req, res) => {
    try {
        // Fetch sessions where date >= today and status is Open
        // ALSO count how many appointments are already booked for each
        const query = `
            SELECT 
                s.*, 
                COUNT(a.appointment_id) as booked_count
            FROM doctor_schedules s
            LEFT JOIN appointments a ON s.schedule_id = a.schedule_id AND a.status != 'Cancelled'
            WHERE s.date >= CURDATE()
            GROUP BY s.schedule_id
            ORDER BY s.date ASC, s.start_time ASC
        `;
        const [rows] = await pool.query(query);
        res.json(rows);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error fetching schedules' });
    }
});

// --- PATIENT: BOOK A SERIAL ---
router.post('/book-serial', async (req, res) => {
    const { schedule_id, patient_id } = req.body;
    const actualPatientId = req.user.role === 'patient' ? req.user.id : patient_id;

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 0. PREVENT DUPLICATE: Check if patient already booked this session
        const [existing] = await connection.query(
            `SELECT appointment_id FROM appointments 
             WHERE schedule_id = ? AND patient_id = ? AND status != 'Cancelled'`,
            [schedule_id, actualPatientId]
        );

        if (existing.length > 0) {
            throw new Error('You have already booked a serial for this session.');
        }

        // 1. Check if Slot is Full
        const [schedule] = await connection.query(
            `SELECT * FROM doctor_schedules WHERE schedule_id = ? FOR UPDATE`, 
            [schedule_id]
        );
        
        if (schedule.length === 0) throw new Error('Schedule not found');
        const session = schedule[0];

        // 2. Count current bookings
        const [countRes] = await connection.query(
            `SELECT COUNT(*) as count FROM appointments WHERE schedule_id = ? AND status != 'Cancelled'`,
            [schedule_id]
        );
        
        if (countRes[0].count >= session.max_patients) {
            throw new Error('Sorry, this session is full.');
        }

        // 3. Generate Next Serial
        const nextSerial = countRes[0].count + 1;

        // 4. Calculate Approximate Time (Bonus Feature)
        // If Session starts at 09:00:00, and avg time is 15 mins
        // We can actually insert a tentative 'visit_time' here!
        // Start Time + (Serial-1 * 15 mins)
        // But for now, keeping it simple (Time is NULL until confirmed)

        await connection.query(
            `INSERT INTO appointments 
            (doctor_id, patient_id, schedule_id, visit_date, serial_number, source, status, reason)
            VALUES (?, ?, ?, ?, ?, ?, 'Confirmed', 'Portal Request')`,
            [session.doctor_id, actualPatientId, schedule_id, session.date, nextSerial, 'Online']
        );

        await connection.commit();
        res.status(201).json({ message: 'Booking Successful', serial: nextSerial });

    } catch (e) {
        if (connection) await connection.rollback();
        // Send the specific error message (e.g. "Already booked")
        res.status(400).json({ message: e.message || 'Booking failed' });
    } finally {
        if (connection) connection.release();
    }
});

export default router;