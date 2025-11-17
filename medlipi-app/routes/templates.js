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


// --- GET All Instruction Templates (Global and Doctor's Own) ---
router.get('/instruction', async (req, res) => {
    const doctorId = req.doctor.id;
    try {
        const query = `
            SELECT block_id, title, content 
            FROM instruction_blocks 
            WHERE doctor_id IS NULL OR doctor_id = ? 
            ORDER BY is_global DESC, title ASC
        `;
        const [templates] = await pool.query(query, [doctorId]);
        res.json(templates);
    } catch (error) {
        console.error('Error fetching instruction templates:', error);
        res.status(500).json({ message: 'Server error fetching instruction templates.' });
    }
});

// --- POST Create a New Instruction Block ---
router.post('/instruction', async (req, res) => {
    const { title, content } = req.body;
    const doctorId = req.doctor.id;

    if (!title || !content) {
        return res.status(400).json({ message: 'Title and content are required.' });
    }

    try {
        const query = 'INSERT INTO instruction_blocks (doctor_id, title, content) VALUES (?, ?, ?)';
        const [result] = await pool.query(query, [doctorId, title, content]);
        res.status(201).json({ 
            message: 'Instruction block saved successfully', 
            blockId: result.insertId 
        });
    } catch (error) {
        console.error('Error saving instruction block:', error);
        res.status(500).json({ message: 'Server error saving instruction block.' });
    }
});

export default router;