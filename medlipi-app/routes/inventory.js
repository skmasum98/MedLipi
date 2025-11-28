import express from 'express';
import pool from '../db.js';
import verifyToken from '../middleware/auth.js'; 

const router = express.Router();
router.use(verifyToken);

// --- GET Search (Existing) ---
router.get('/search', async (req, res) => {
    const searchTerm = req.query.q ? `%${req.query.q}%` : '';
    if (!searchTerm) return res.json([]); 
    try {
        const query = `
            SELECT drug_id, generic_name, trade_names, strength, counseling_points, manufacturer
            FROM drug_inventory 
            WHERE generic_name LIKE ? OR trade_names LIKE ?
            LIMIT 20`; 
        const [drugs] = await pool.query(query, [searchTerm, searchTerm]);
        res.json(drugs);
    } catch (error) {
        console.error('Error searching inventory:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});

// --- POST Add New Drug (NEW) ---
router.post('/', async (req, res) => {
    const { generic_name, trade_names, strength, counseling_points, manufacturer } = req.body;
    
    if (!generic_name || !trade_names) {
        return res.status(400).json({ message: 'Generic Name and Trade Name are required.' });
    }

    try {
        const query = `INSERT INTO drug_inventory (generic_name, trade_names, strength, counseling_points, manufacturer) VALUES (?, ?, ?, ?, ?)`;
        const [result] = await pool.query(query, [generic_name, trade_names, strength, counseling_points, manufacturer]);
        res.status(201).json({ message: 'Drug added successfully', drugId: result.insertId });
    } catch (error) {
        console.error('Error adding drug:', error);
        res.status(500).json({ message: 'Server error adding drug.' });
    }
});

// --- PUT Update Drug (NEW) ---
router.put('/:id', async (req, res) => {
    const { generic_name, trade_names, strength, counseling_points, manufacturer } = req.body;
    const drugId = req.params.id;

    try {
        const query = `
            UPDATE drug_inventory 
            SET generic_name = ?, trade_names = ?, strength = ?, counseling_points = ?, manufacturer = ?
            WHERE drug_id = ?`;
        await pool.query(query, [generic_name, trade_names, strength, counseling_points, manufacturer, drugId]);
        res.json({ message: 'Drug updated successfully' });
    } catch (error) {
        console.error('Error updating drug:', error);
        res.status(500).json({ message: 'Server error updating drug.' });
    }
});

// --- DELETE Drug (NEW) ---
router.delete('/:id', async (req, res) => {
    const drugId = req.params.id;
    try {
        // Note: This might fail if the drug is used in past prescriptions due to Foreign Key constraints.
        // In a real app, you might 'soft delete' (set is_active = 0). For MVP, we try hard delete.
        await pool.query('DELETE FROM drug_inventory WHERE drug_id = ?', [drugId]);
        res.json({ message: 'Drug deleted successfully' });
    } catch (error) {
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ message: 'Cannot delete: This drug is part of past prescriptions.' });
        }
        console.error('Error deleting drug:', error);
        res.status(500).json({ message: 'Server error deleting drug.' });
    }
});

export default router;