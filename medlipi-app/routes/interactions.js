import express from 'express';
import pool from '../db.js';
import verifyToken from '../middleware/auth.js'; 

const router = express.Router();
router.use(verifyToken);

// --- POST Check Interactions (/api/interactions/check) ---
router.post('/check', async (req, res) => {
    // Expects an array of drug IDs: [1, 5, 12, ...]
    const { drugIds } = req.body; 

    if (!Array.isArray(drugIds) || drugIds.length < 2) {
        return res.json([]); // No interactions possible with less than 2 drugs
    }

    try {
        const interactions = [];
        
        // --- N^2 Comparison Loop (Simple/Open-Source Check) ---
        // This loops through all unique pairs in the list
        for (let i = 0; i < drugIds.length; i++) {
            for (let j = i + 1; j < drugIds.length; j++) {
                const drug1 = drugIds[i];
                const drug2 = drugIds[j];

                // The query checks both (drug1, drug2) AND (drug2, drug1) for the pair
                const query = `
                    SELECT 
                        di.severity, di.warning_message, 
                        d1.generic_name AS drug1_name, d2.generic_name AS drug2_name
                    FROM drug_interactions di
                    JOIN drug_inventory d1 ON di.drug1_id = d1.drug_id
                    JOIN drug_inventory d2 ON di.drug2_id = d2.drug_id
                    WHERE (drug1_id = ? AND drug2_id = ?) OR (drug1_id = ? AND drug2_id = ?)
                `;
                
                const [result] = await pool.query(query, [drug1, drug2, drug2, drug1]);
                
                if (result.length > 0) {
                    interactions.push(result[0]);
                }
            }
        }

        res.json(interactions);
    } catch (error) {
        console.error('Interaction check failed:', error);
        res.status(500).json({ message: 'Server error during interaction check.' });
    }
});

export default router;