import express from 'express';
import pool from '../db.js';
import verifyToken from '../middleware/auth.js'; 

const router = express.Router();

// --- GET Doctor Profile (/api/doctors/profile) ---
router.get('/profile', verifyToken, async (req, res) => {
    const doctorId = req.doctor.id;
    try {
        // Update query to fetch new columns
        const query = `
            SELECT doctor_id, full_name, bmdc_reg, email, degree, 
                   clinic_name, chamber_address, phone_number, specialist_title 
            FROM doctors WHERE doctor_id = ?`;
        
        const [rows] = await pool.query(query, [doctorId]);
        const profile = rows[0];

        if (!profile) return res.status(404).json({ message: 'Doctor profile not found.' });
        res.json(profile);
    } catch (error) {
        console.error('Error fetching doctor profile:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});


// --- PUT Update Doctor Profile ---
router.put('/profile', verifyToken, async (req, res) => {
    const doctorId = req.doctor.id;
    const { full_name, degree, clinic_name, chamber_address, phone_number, specialist_title } = req.body;

    try {
        const query = `
            UPDATE doctors 
            SET full_name = ?, degree = ?, clinic_name = ?, chamber_address = ?, phone_number = ?, specialist_title = ?
            WHERE doctor_id = ?
        `;
        
        await pool.query(query, [full_name, degree, clinic_name, chamber_address, phone_number, specialist_title, doctorId]);
        
        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ message: 'Server error updating profile.' });
    }
});


export default router;