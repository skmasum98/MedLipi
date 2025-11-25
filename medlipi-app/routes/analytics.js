import express from 'express';
import pool from '../db.js';
import verifyToken from '../middleware/auth.js'; 

const router = express.Router();
router.use(verifyToken);

// --- GET Summary Cards Data ---
router.get('/summary', async (req, res) => {
    const doctorId = req.doctor.id;
    try {
        const [rows] = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM prescriptions WHERE doctor_id = ?) AS total_prescriptions,
                (SELECT COUNT(*) FROM prescriptions WHERE doctor_id = ? AND DATE(created_at) = CURDATE()) AS today_prescriptions,
                (SELECT COUNT(DISTINCT patient_id) FROM prescriptions WHERE doctor_id = ?) AS total_unique_patients
        `, [doctorId, doctorId, doctorId]);
        
        res.json(rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching summary' });
    }
});

// --- GET Activity (Last 7 Days) ---
router.get('/activity', async (req, res) => {
    const doctorId = req.doctor.id;
    try {
        // Get count of prescriptions per day for the last 7 days
        const query = `
            SELECT DATE(created_at) as date, COUNT(*) as count 
            FROM prescriptions 
            WHERE doctor_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `;
        const [rows] = await pool.query(query, [doctorId]);
        
        // Format for Recharts (ensure we send a clean date string)
        const data = rows.map(row => ({
            date: new Date(row.date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
            patients: row.count
        }));
        
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching activity' });
    }
});

export default router;