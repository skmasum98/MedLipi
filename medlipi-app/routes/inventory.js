import express from 'express';
import pool from '../db.js';
import verifyToken from '../middleware/auth.js'; 

const router = express.Router();
// All drug inventory routes require the doctor to be logged in
router.use(verifyToken);

// --- GET Search Drug Inventory (/api/inventory/search?q=) ---
router.get('/search', async (req, res) => {
    const searchTerm = req.query.q ? `%${req.query.q}%` : '';

    if (!searchTerm) {
        return res.status(400).json({ message: 'Search term (q) is required.' });
    }

    try {
        // Search generic_name and trade_names for the term
        const query = `
            SELECT drug_id, generic_name, trade_names, strength, counseling_points 
            FROM drug_inventory 
            WHERE generic_name LIKE ? OR trade_names LIKE ?
            LIMIT 20`; // Limit results for performance
        
        const [drugs] = await pool.query(query, [searchTerm, searchTerm]);
        
        res.json(drugs);
    } catch (error) {
        console.error('Error searching inventory:', error);
        res.status(500).json({ message: 'Server error during inventory search.' });
    }
});

// NOTE: For MVP, the initial data will be loaded via SQL/CSV directly.
// In V1.0, we will add an API for administration/submission.

export default router;