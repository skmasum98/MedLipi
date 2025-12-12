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


// --- STAFF LOGIN ---
router.post('/staff/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const [rows] = await pool.query('SELECT * FROM clinic_staff WHERE username = ?', [username]);
        if (rows.length === 0) return res.status(401).json({ message: 'Staff user not found' });
        
        const staff = rows[0];

        if (staff.status === 'suspended') return res.status(403).json({ message: 'Account suspended by Doctor' });

        const isMatch = await bcrypt.compare(password, staff.password_hash);
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

        const token = jwt.sign(
            { 
                id: staff.staff_id, 
                role: staff.role,     // 'receptionist' or 'assistant'
                parentId: staff.doctor_id, // Link to the Doctor they work for
                name: staff.full_name 
            }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1d' }
        );

        res.json({ token, user: { name: staff.full_name, role: staff.role, doctorId: staff.doctor_id } });

    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Login Error' });
    }
});


// Admin Login
router.post('/admin/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const [rows] = await pool.query('SELECT * FROM admins WHERE username = ?', [username]);
        if (rows.length === 0) return res.status(401).json({ message: 'Admin not found' });
        
        const admin = rows[0];
        const isMatch = await bcrypt.compare(password, admin.password_hash);
        
        if (!isMatch) return res.status(401).json({ message: 'Invalid Password' });

        const token = jwt.sign(
            { id: admin.admin_id, role: 'super_admin', name: admin.username }, 
            process.env.JWT_SECRET, 
            { expiresIn: '12h' }
        );

        res.json({ 
            token,
            admin: { id: admin.admin_id, username: admin.username, role: 'super_admin' }
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Server error' });
    }
});


// --- DOCTOR: CREATE STAFF (Moved here or in doctor settings) ---
router.post('/doctor/create-staff', async (req, res) => {
    // Requires Doctor Token manually or passed via body? 
    // Usually this should be in a protected route using verifyToken.
    // We will build this in Step 4.
});


// --- GET CURRENT USER (Generic Check) ---
// This allows useAuth to verify the token is valid for ANY role
router.get('/me', (req, res) => {
    // Determine who we are checking based on header or a shared middleware
    // We must manually verify the token here since this route needs to be generic
    // OR ideally, use a shared VerifyToken middleware on this route
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No token' });
    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Success! Return minimal info to keep session alive
        res.json({ 
            id: decoded.id, 
            role: decoded.role, 
            name: decoded.name 
        });
    } catch (e) {
        return res.status(403).json({ message: 'Invalid token' });
    }
});

// --- TEMP ADMIN REGISTRATION (Use Postman) ---
// router.post('/admin/register-seed', async (req, res) => {
//     const { username, password, email } = req.body;

//     if (!username || !password) return res.status(400).json({message: "Missing fields"});

//     try {
//         const hashedPassword = await bcrypt.hash(password, 10);
        
//         // Ensure table exists (Schema step from earlier)
//         // role defaults to 'super_admin' based on SQL default
//         const [result] = await pool.query(
//             `INSERT INTO admins (username, password_hash, email) VALUES (?, ?, ?)`,
//             [username, hashedPassword, email]
//         );

//         res.json({ message: "Super Admin Created!", id: result.insertId });
//     } catch (e) {
//         console.error(e);
//         res.status(500).json({ message: "Creation Failed", error: e.message });
//     }
// });

export default router;