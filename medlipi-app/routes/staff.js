import express from 'express';
import pool from '../db.js';
import verifyToken from '../middleware/auth.js';
import bcrypt from 'bcryptjs';

const router = express.Router();
router.use(verifyToken);

// --- Middleware: Verify user is a DOCTOR ---
const verifyDoctor = (req, res, next) => {
    if (req.user.role !== 'doctor' && !req.user.bmdc) {
        return res.status(403).json({ message: "Only doctors can manage staff." });
    }
    next();
};

// Apply Doctor check to all staff management routes
router.use(verifyDoctor);

// --- 1. GET: List My Staff ---
router.get('/', async (req, res) => {
    try {
        // Find staff linked to this doctor ID
        const [rows] = await pool.query(
            `SELECT staff_id, full_name, username, role, status, created_at 
             FROM clinic_staff 
             WHERE doctor_id = ?`, 
            [req.user.id]
        );
        res.json(rows);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: "Error fetching staff" });
    }
});

// --- 2. POST: Create New Staff ---
router.post('/', async (req, res) => {
    const { full_name, username, password, role } = req.body;

    if (!full_name || !username || !password || !role) {
        return res.status(400).json({ message: "All fields are required" });
    }

    // Validate role enum
    if (!['receptionist', 'assistant'].includes(role)) {
        return res.status(400).json({ message: "Invalid role. Use 'receptionist' or 'assistant'." });
    }

    try {
        // Hash password
        const password_hash = await bcrypt.hash(password, 10);
        
        await pool.query(
            `INSERT INTO clinic_staff (doctor_id, full_name, username, password_hash, role, status)
             VALUES (?, ?, ?, ?, ?, 'active')`,
            [req.user.id, full_name, username, password_hash, role]
        );
        
        res.status(201).json({ message: "Staff created successfully" });

    } catch (e) {
        if (e.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: "Username already taken." });
        }
        console.error(e);
        res.status(500).json({ message: "Creation failed" });
    }
});

// --- 3. DELETE: Remove Staff ---
router.delete('/:id', async (req, res) => {
    try {
        await pool.query(
            `DELETE FROM clinic_staff WHERE staff_id = ? AND doctor_id = ?`,
            [req.params.id, req.user.id]
        );
        res.json({ message: "Staff removed" });
    } catch (e) {
        res.status(500).json({ message: "Delete failed" });
    }
});

// --- 4. PUT: Toggle Status (Suspend/Active) ---
router.put('/:id/status', async (req, res) => {
    const { status } = req.body; // 'active' or 'suspended'
    try {
        await pool.query(
            `UPDATE clinic_staff SET status = ? WHERE staff_id = ? AND doctor_id = ?`,
            [status, req.params.id, req.user.id]
        );
        res.json({ message: "Status updated" });
    } catch (e) {
        res.status(500).json({ message: "Update failed" });
    }
});

export default router;