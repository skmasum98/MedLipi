import express from 'express';
import pool from '../db.js';
import verifyToken from '../middleware/auth.js'; 

const router = express.Router();
router.use(verifyToken);

// --- GET Search Templates by Category & Query ---
router.get('/search', async (req, res) => {
    const { category, q } = req.query;
    const doctorId = req.doctor.id;
    const searchTerm = q ? `%${q}%` : '';

    try {
        // If no search term, return recent 10. If search term, find matches.
        let query = `SELECT template_id, content FROM clinical_templates WHERE doctor_id = ? AND category = ?`;
        const params = [doctorId, category];

        if (searchTerm) {
            query += ` AND content LIKE ?`;
            params.push(searchTerm);
        }
        
        query += ` ORDER BY content ASC LIMIT 10`;

        const [results] = await pool.query(query, params);
        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// --- POST Create Template ---
router.post('/', async (req, res) => {
    const { category, content } = req.body;
    const doctorId = req.doctor.id;

    if (!content || !category) return res.status(400).json({ message: 'Content required' });

    try {
        // Check for duplicates to avoid clutter
        const [existing] = await pool.query(
            'SELECT template_id FROM clinical_templates WHERE doctor_id = ? AND category = ? AND content = ?',
            [doctorId, category, content]
        );
        if (existing.length > 0) return res.json({ message: 'Template already exists', id: existing[0].template_id });

        const [result] = await pool.query(
            'INSERT INTO clinical_templates (doctor_id, category, content) VALUES (?, ?, ?)',
            [doctorId, category, content]
        );
        res.status(201).json({ message: 'Saved', id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// --- DELETE Template ---
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const doctorId = req.doctor.id;
    try {
        await pool.query('DELETE FROM clinical_templates WHERE template_id = ? AND doctor_id = ?', [id, doctorId]);
        res.json({ message: 'Deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;