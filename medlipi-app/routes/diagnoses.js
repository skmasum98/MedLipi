import express from 'express';
import pool from '../db.js';
import verifyToken from '../middleware/auth.js'; 

const router = express.Router();
router.use(verifyToken);

// --- GET Search Diagnosis Codes (/api/diagnoses/search?q=) ---
router.get('/search', async (req, res) => {
    const searchTerm = req.query.q ? `%${req.query.q}%` : '';

    if (!searchTerm) {
        return res.json([]);
    }

    try {
        // Search by code, description, or simplified name
        const query = `
            SELECT code_id, code, description, simplified_name 
            FROM diagnosis_codes 
            WHERE code LIKE ? OR description LIKE ? OR simplified_name LIKE ?
            LIMIT 30`; 
        
        const [results] = await pool.query(query, [searchTerm, searchTerm, searchTerm]);
        
        res.json(results);
    } catch (error) {
        console.error('Error searching diagnosis codes:', error);
        res.status(500).json({ message: 'Server error during diagnosis search.' });
    }
});

export default router;