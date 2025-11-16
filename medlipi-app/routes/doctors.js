import express from 'express';
import pool from '../db.js';
import verifyToken from '../middleware/auth.js'; 

const router = express.Router();

// --- GET Doctor Profile (/api/doctors/profile) ---
// This route is protected by verifyToken
router.get('/profile', verifyToken, async (req, res) => {
    // We already have the doctor's ID from the JWT payload attached in the middleware
    const doctorId = req.doctor.id;

    try {
        // Fetch the full profile from the database (excluding the password hash)
        const query = 'SELECT doctor_id, full_name, bmdc_reg, email, degree FROM doctors WHERE doctor_id = ?';
        const [rows] = await pool.query(query, [doctorId]);
        
        const profile = rows[0];

        if (!profile) {
            return res.status(404).json({ message: 'Doctor profile not found.' });
        }

        res.json(profile);
    } catch (error) {
        console.error('Error fetching doctor profile:', error);
        res.status(500).json({ message: 'Server error while fetching profile.' });
    }
});

export default router;