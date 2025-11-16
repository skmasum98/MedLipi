import express from 'express';
import pool from '../db.js';
import verifyToken from '../middleware/auth.js'; 

const router = express.Router();
router.use(verifyToken);

// --- GET All Templates for the Doctor (/api/templates/sig) ---
router.get('/sig', async (req, res) => {
    const doctorId = req.doctor.id;
    try {
        const query = 'SELECT template_id, title, instruction FROM sig_templates WHERE doctor_id = ? ORDER BY title';
        const [templates] = await pool.query(query, [doctorId]);
        res.json(templates);
    } catch (error) {
        console.error('Error fetching SIG templates:', error);
        res.status(500).json({ message: 'Server error fetching templates.' });
    }
});

// --- POST Create a New Template (/api/templates/sig) ---
router.post('/sig', async (req, res) => {
    const { title, instruction } = req.body;
    const doctorId = req.doctor.id;

    if (!title || !instruction) {
        return res.status(400).json({ message: 'Title and instruction are required.' });
    }

    try {
        const query = 'INSERT INTO sig_templates (doctor_id, title, instruction) VALUES (?, ?, ?)';
        const [result] = await pool.query(query, [doctorId, title, instruction]);
        res.status(201).json({ 
            message: 'Template saved successfully', 
            templateId: result.insertId 
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'A template with this title already exists.' });
        }
        console.error('Error saving SIG template:', error);
        res.status(500).json({ message: 'Server error saving template.' });
    }
});

export default router;