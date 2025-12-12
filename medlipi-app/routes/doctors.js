import express from 'express';
import pool from '../db.js';
import verifyToken from '../middleware/auth.js'; 

const router = express.Router();
router.use(verifyToken);

// --- GET Doctor Profile ---
router.get('/profile', async (req, res) => {
    // FIX 1: Safety check for role
    if (req.user.role !== 'doctor' && !req.user.bmdc) {
        return res.status(403).json({ message: "Access denied. Not a doctor account." });
    }

    // FIX 2: Use 'req.user.id' which is guaranteed by verifyToken
    // (In our token, id is the doctor_id for doctors)
    const doctorId = req.user.id; 

    try {
        const query = `
            SELECT doctor_id, full_name, bmdc_reg, email, degree, 
                   clinic_name, chamber_address, phone_number, specialist_title 
            FROM doctors WHERE doctor_id = ?`;
        
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

// --- PUT Update Doctor Profile ---
router.put('/profile', async (req, res) => {
    if (req.user.role !== 'doctor' && !req.user.bmdc) return res.status(403).json({message: "Unauthorized"});

    const doctorId = req.user.id; // FIX 3: Use req.user.id here too
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