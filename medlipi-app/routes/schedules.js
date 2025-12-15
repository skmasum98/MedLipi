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



// --- 1. GET SESSIONS (Scalable View) ---
router.get('/my-sessions', async (req, res) => {
    // Only Doctor or Staff
    if (req.user.role === 'patient') return res.status(403).json({ message: "Access denied" });

    // Optional Query Params: limit, offset, view (upcoming vs history)
    const limit = parseInt(req.query.limit) || 30; // Default 30 sessions
    const view = req.query.view || 'current'; // 'current' or 'history'
    
    try {
        let dateCondition = '';
        
        // Show Today + Future by default. 'history' shows older.
        if (view === 'current') {
            dateCondition = `AND s.date >= DATE_SUB(CURDATE(), INTERVAL 1 DAY)`; // Show yesterday + future
        } else if (view === 'history') {
            dateCondition = `AND s.date < CURDATE()`;
        }

        const query = `
            SELECT 
                s.*, 
                d.full_name as doctor_name, 
                COUNT(a.appointment_id) as booked_count
            FROM doctor_schedules s
            JOIN doctors d ON s.doctor_id = d.doctor_id
            LEFT JOIN appointments a ON s.schedule_id = a.schedule_id AND a.status != 'Cancelled'
            WHERE s.doctor_id = ? 
            ${dateCondition}
            GROUP BY s.schedule_id
            ORDER BY s.date DESC, s.start_time ASC
            LIMIT ?
        `;
        
        // Use the calculated Operating ID
        const [rows] = await pool.query(query, [req.operatingDoctorId, limit]);
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
        const { doctor_id } = req.query; // IMPORTANT for filtering by doctor
        
        // This is a safety check in case the client doesn't pass it, 
        // but for walk-in usage, we default to the operating user's context.
        const targetDoctorId = doctor_id || req.operatingDoctorId; 

        if (!targetDoctorId) {
             // If we don't know which doctor, we can't filter their schedules accurately
             // But technically we could return nothing.
             // Let's assume frontend passes doctor_id or we use logged-in user context.
             return res.status(400).json({ message: "Doctor context required." });
        }

        // --- SQL TIME LOGIC EXPLAINED ---
        // 1. Get Sessions for Doctor
        // 2. Count Bookings
        // 3. Filter:
        //    (Date is in Future) 
        //    OR 
        //    (Date is TODAY AND End Time > Current Time in Bangladesh)
        
        // Note: IF your DB server is UTC, you might need DATE_ADD(NOW(), INTERVAL 6 HOUR)
        // Assuming your node connection has dateStrings:true, let's use JS to filter strictly if needed, 
        // OR rely on SQL if the server is configured.
        
        // Safer Hybrid Approach: Fetch "Today and Future", then filter "Expired Time" in JS loop.
        
        let query = `
            SELECT 
                s.*, 
                COUNT(a.appointment_id) as booked_count
            FROM doctor_schedules s
            LEFT JOIN appointments a ON s.schedule_id = a.schedule_id AND a.status != 'Cancelled'
            WHERE s.doctor_id = ? 
            AND s.date >= CURDATE() -- Get everything from today onwards
            GROUP BY s.schedule_id
            ORDER BY s.date ASC, s.start_time ASC
        `;
        
        const [rows] = await pool.query(query, [targetDoctorId]);

        // --- POST-PROCESSING FILTER (Timezone Safe) ---
        const now = new Date(); // Server local time (usually UTC or System Time)
        // Adjust 'now' to BD Time if server is remote (e.g. Render)
        // Render/AWS use UTC. BD is UTC+6.
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const bdNow = new Date(utc + (3600000 * 6)); // Create strict BD Time Object

        const validSessions = rows.filter(s => {
            // Convert session date string '2025-12-14' to BD Time Date object
            const sDate = new Date(s.date); // '2025-12-14T00:00:00'
            const sDateStr = sDate.toISOString().split('T')[0];
            const todayStr = bdNow.toISOString().split('T')[0];

            if (sDateStr > todayStr) return true; // Future dates are always valid
            
            if (sDateStr === todayStr) {
                // Same Day Check: Is End Time passed?
                const [endH, endM] = s.end_time.split(':').map(Number);
                const currentH = bdNow.getHours();
                const currentM = bdNow.getMinutes();

                // If (Current Hour > End Hour) OR (Same Hour AND Current Min > End Min) -> Expired
                if (currentH > endH || (currentH === endH && currentM >= endM)) {
                    return false; // Expired today
                }
                return true; // Still time left today
            }

            return false; // Past date (shouldn't happen due to SQL but good for safety)
        });

        res.json(validSessions);
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