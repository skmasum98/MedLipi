import express from 'express';
import pool from '../db.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// --- AUTH MIDDLEWARE (Inline version tailored for Schedules) ---
const verifyAnyUser = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No token' });
    
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ message: 'Invalid token' });
        req.user = decoded; 
        
        // Helper: Determine the "Operating Doctor ID"
        // If I am a doctor -> My ID.
        // If I am Staff -> My Boss's ID (parentId).
        // If I am Patient -> Undefined (patients don't manage schedules).
        if (req.user.role === 'doctor') {
            req.operatingDoctorId = req.user.id;
        } else if (['receptionist', 'assistant'].includes(req.user.role)) {
            req.operatingDoctorId = req.user.parentId;
        }

        next();
    });
};

router.use(verifyAnyUser);


// --- 1. GET SESSIONS (Management View) ---
// Returns schedules for the specific doctor (past & future)
router.get('/my-sessions', async (req, res) => {
    // Only Doctor or Staff can see this management list
    if (req.user.role === 'patient') return res.status(403).json({ message: "Access denied" });

    try {
        const query = `
            SELECT 
                s.*, 
                d.full_name as doctor_name, 
                COUNT(a.appointment_id) as booked_count
            FROM doctor_schedules s
            JOIN doctors d ON s.doctor_id = d.doctor_id -- <--- JOIN DOCTOR TABLE
            LEFT JOIN appointments a ON s.schedule_id = a.schedule_id AND a.status != 'Cancelled'
            WHERE s.doctor_id = ? 
            GROUP BY s.schedule_id
            ORDER BY s.date DESC, s.start_time ASC
        `;
        
        // Use the calculated Operating ID (Works for Doc & Receptionist)
        const [rows] = await pool.query(query, [req.operatingDoctorId]);
        res.json(rows);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error fetching sessions' });
    }
});


// --- 2. DELETE SESSION ---
router.delete('/:id', async (req, res) => {
    if (req.user.role === 'patient') return res.status(403).json({ message: "Unauthorized" });
    
    const scheduleId = req.params.id;

     try {
        // Only delete if the schedule belongs to the operating doctor
        await pool.query(
            'DELETE FROM doctor_schedules WHERE schedule_id = ? AND doctor_id = ?', 
            [scheduleId, req.operatingDoctorId]
        );
        res.json({ message: 'Session deleted' });
    } catch (e) {
        // FK Constraint Handling
        if (e.code === 'ER_ROW_IS_REFERENCED_2' || e.errno === 1451) {
            return res.status(400).json({ message: 'This session has active appointments. Cancel them first via the Schedule page.' });
        }
        res.status(500).json({ message: 'Delete failed (Server Error)' });
    }
});


// --- 3. CREATE SESSION ---
router.post('/create', async (req, res) => {
    if (req.user.role === 'patient') return res.status(403).json({ message: "Forbidden" });

    const { date, session_name, start_time, end_time, max_patients } = req.body;
    
    // Automatically assigned to the correct doctor
    const doctorId = req.operatingDoctorId; 

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


// --- 4. PUBLIC: GET AVAILABLE SESSIONS (Used by Booking Modal) ---
router.get('/available', async (req, res) => {
    try {
        if (!req.operatingDoctorId) {
            return res.status(403).json({ message: 'Doctor context missing' });
        }

        const query = `
            SELECT 
                s.*, 
                COUNT(a.appointment_id) AS booked_count
            FROM doctor_schedules s
            LEFT JOIN appointments a 
                ON s.schedule_id = a.schedule_id 
               AND a.status != 'Cancelled'
            WHERE s.doctor_id = ?
              AND s.date >= CURDATE()
            GROUP BY s.schedule_id
            ORDER BY s.date ASC, s.start_time ASC
        `;

        const [rows] = await pool.query(query, [req.operatingDoctorId]);
        res.json(rows);

    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error fetching schedules' });
    }
});



// --- 5. BOOK A SERIAL (Transaction) ---
router.post('/book-serial', async (req, res) => {
    const { schedule_id, patient_id } = req.body;
    
    // If Patient is booking -> use their own ID
    // If Staff is booking -> use the passed 'patient_id'
    const actualPatientId = req.user.role === 'patient' ? req.user.id : patient_id;

    if (!actualPatientId) {
         return res.status(400).json({ message: "Patient ID missing." });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // A. Prevent Duplicate Booking
        const [existing] = await connection.query(
            `SELECT appointment_id FROM appointments 
             WHERE schedule_id = ? AND patient_id = ? AND status != 'Cancelled'`,
            [schedule_id, actualPatientId]
        );

        if (existing.length > 0) {
            throw new Error('This patient already has a booking for this session.');
        }

        // B. Check Capacity
        const [schedule] = await connection.query(
            `SELECT * FROM doctor_schedules WHERE schedule_id = ? FOR UPDATE`, 
            [schedule_id]
        );
        if (schedule.length === 0) throw new Error('Schedule not found');
        
        const session = schedule[0];

        const [countRes] = await connection.query(
            `SELECT COUNT(*) as count FROM appointments WHERE schedule_id = ? AND status != 'Cancelled'`,
            [schedule_id]
        );
        
        if (countRes[0].count >= session.max_patients) {
            throw new Error('Sorry, this session is full.');
        }

        // C. Calculate Serial & Status
        const nextSerial = countRes[0].count + 1;
        // Staff bookings are auto-confirmed; Patient bookings are Pending
        const status = req.user.role === 'patient' ? 'Pending_Confirmation' : 'Confirmed';
        const source = req.user.role === 'patient' ? 'Online' : 'Reception';

        // D. Insert
        await connection.query(
            `INSERT INTO appointments 
            (doctor_id, patient_id, schedule_id, visit_date, serial_number, source, status, reason)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [session.doctor_id, actualPatientId, schedule_id, session.date, nextSerial, source, status, 'Standard Appointment']
        );

        await connection.commit();
        res.status(201).json({ message: 'Booking Successful', serial: nextSerial });

    } catch (e) {
        if (connection) await connection.rollback();
        console.error(e);
        res.status(400).json({ message: e.message || 'Booking failed' });
    } finally {
        if (connection) connection.release();
    }
});

export default router;