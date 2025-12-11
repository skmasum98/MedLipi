import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db.js'; // The database pool
import 'dotenv/config';

const router = express.Router();
const saltRounds = 10;

// --- 1. Registration Route (/api/auth/register) ---
router.post('/register', async (req, res) => {
    const { bmdc_reg, email, password, full_name, degree } = req.body;

    if (!bmdc_reg || !email || !password || !full_name) {
        return res.status(400).json({ message: 'All required fields must be provided.' });
    }

    try {
        // 1. Hash the password
        const password_hash = await bcrypt.hash(password, saltRounds);
        
        // 2. Insert the new doctor into the database
        const query = `INSERT INTO doctors (bmdc_reg, email, password_hash, full_name, degree) 
                       VALUES (?, ?, ?, ?, ?)`;
        const [result] = await pool.query(query, [bmdc_reg, email, password_hash, full_name, degree || null]);

        // 3. Respond with success
        res.status(201).json({ 
            message: 'Doctor registered successfully!', 
            doctorId: result.insertId 
        });

    } catch (error) {
        // 4. Handle unique constraint error (e.g., duplicate email/BMDC)
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Email or BMDC Registration number already exists.' });
        }
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error during registration.' });
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
        // 1. Find the doctor by email
        const [rows] = await pool.query('SELECT * FROM doctors WHERE email = ?', [email]);
        const doctor = rows[0];

        if (!doctor) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        // 2. Compare the provided password with the stored hash
        const isMatch = await bcrypt.compare(password, doctor.password_hash);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        // 3. Generate a JSON Web Token (JWT)
        const payload = {
            id: doctor.doctor_id,
            bmdc: doctor.bmdc_reg,
            name: doctor.full_name,
            email: doctor.email,
            role: "doctor" 
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

        // 4. Respond with the token and profile data
        res.json({ 
            message: 'Login successful!', 
            token,
            doctor: {
                id: doctor.doctor_id,
                email: doctor.email,
                full_name: doctor.full_name,
                bmdc_reg: doctor.bmdc_reg,
                degree: doctor.degree
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login.' });
    }
});

export default router;