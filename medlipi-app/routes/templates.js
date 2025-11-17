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

// --- PUT Update SIG Template (/api/templates/sig/:id) - (U) ---
router.put('/sig/:id', async (req, res) => {
    const templateId = req.params.id;
    const { title, instruction } = req.body;
    const doctorId = req.doctor.id;

    if (!title || !instruction) {
        return res.status(400).json({ message: 'Title and instruction are required.' });
    }

    try {
        const query = `
            UPDATE sig_templates 
            SET title = ?, instruction = ? 
            WHERE template_id = ? AND doctor_id = ?
        `;
        const [result] = await pool.query(query, [title, instruction, templateId, doctorId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Template not found or you do not have permission to edit.' });
        }
        res.json({ message: 'Template updated successfully' });
    } catch (error) {
        console.error('Error updating SIG template:', error);
        res.status(500).json({ message: 'Server error updating template.' });
    }
});


// --- DELETE SIG Template (/api/templates/sig/:id) - (D) ---
router.delete('/sig/:id', async (req, res) => {
    const templateId = req.params.id;
    const doctorId = req.doctor.id;

    try {
        const query = 'DELETE FROM sig_templates WHERE template_id = ? AND doctor_id = ?';
        const [result] = await pool.query(query, [templateId, doctorId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Template not found or you do not have permission to delete.' });
        }
        res.json({ message: 'Template deleted successfully' });
    } catch (error) {
        console.error('Error deleting SIG template:', error);
        res.status(500).json({ message: 'Server error deleting template.' });
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
     let { drug1_id, drug2_id, severity, warning_message } = req.body;
     if (drug1_id > drug2_id) {
        [drug1_id, drug2_id] = [drug2_id, drug1_id]; // Swap the values
    }
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

// --- PUT Update Instruction Block (/api/templates/instruction/:id) - (U) ---
router.put('/instruction/:id', async (req, res) => {
    const blockId = req.params.id;
    const { title, content } = req.body;
    const doctorId = req.doctor.id;

    if (!title || !content) {
        return res.status(400).json({ message: 'Title and content are required.' });
    }

    try {
        // Only allow update if doctor_id is NOT NULL (i.e., not a 'Global' template)
        const query = `
            UPDATE instruction_blocks 
            SET title = ?, content = ? 
            WHERE block_id = ? AND doctor_id = ?
        `;
        const [result] = await pool.query(query, [title, content, blockId, doctorId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Block not found or you do not have permission to edit.' });
        }
        res.json({ message: 'Block updated successfully' });
    } catch (error) {
        console.error('Error updating instruction block:', error);
        res.status(500).json({ message: 'Server error updating block.' });
    }
});


// --- DELETE Instruction Block (/api/templates/instruction/:id) - (D) ---
router.delete('/instruction/:id', async (req, res) => {
    const blockId = req.params.id;
    const doctorId = req.doctor.id;

    try {
        // Only allow delete if doctor_id is NOT NULL (i.e., not a 'Global' template)
        const query = 'DELETE FROM instruction_blocks WHERE block_id = ? AND doctor_id = ?';
        const [result] = await pool.query(query, [blockId, doctorId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Block not found or you do not have permission to delete.' });
        }
        res.json({ message: 'Block deleted successfully' });
    } catch (error) {
        console.error('Error deleting instruction block:', error);
        res.status(500).json({ message: 'Server error deleting block.' });
    }
});

export default router;