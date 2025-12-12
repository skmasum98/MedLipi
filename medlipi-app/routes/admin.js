import express from 'express';
import pool from '../db.js';
import verifyToken from '../middleware/auth.js'; 

const router = express.Router();

// Middleware: Check if Super Admin
const verifyAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'super_admin') {
        next();
    } else {
        return res.status(403).json({ message: "Admin Access Only" });
    }
};

router.use(verifyToken);
router.use(verifyAdmin); // Apply to all routes below

// --- GET Platform Stats ---
router.get('/stats', async (req, res) => {
    try {
        const queries = [
            'SELECT COUNT(*) as count FROM doctors',
            'SELECT COUNT(*) as count FROM patients',
            'SELECT COUNT(*) as count FROM prescriptions'
        ];
        
        const [docs] = await pool.query(queries[0]);
        const [pts] = await pool.query(queries[1]);
        const [rxs] = await pool.query(queries[2]);

        res.json({
            doctors: docs[0].count,
            patients: pts[0].count,
            prescriptions: rxs[0].count
        });
    } catch (e) { res.status(500).json({ message: "Error" }); }
});

// --- GET All Doctors List ---
router.get('/doctors', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT doctor_id, full_name, email, bmdc_reg, degree, status, created_at
            FROM doctors ORDER BY created_at DESC
        `);
        res.json(rows);
    } catch (e) { res.status(500).json({ message: "Error" }); }
});

// --- PUT Update Doctor Status (Ban/Suspend) ---
router.put('/doctors/:id/status', async (req, res) => {
    const { status } = req.body; // 'active', 'suspended'
    try {
        await pool.query('UPDATE doctors SET status = ? WHERE doctor_id = ?', [status, req.params.id]);
        res.json({ message: "Status updated" });
    } catch (e) { res.status(500).json({ message: "Update failed" }); }
});

export default router;