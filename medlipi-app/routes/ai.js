import express from 'express';
// 1. Import the NEW SDK
import { GoogleGenAI } from "@google/genai";
import verifyToken from '../middleware/auth.js'; 

const router = express.Router();
router.use(verifyToken);

// 2. Initialize the Client
// It automatically looks for GEMINI_API_KEY in .env, but we pass it explicitly to be safe
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// --- POST /api/ai/generate-advice ---
router.post('/generate-advice', async (req, res) => {
    const { diagnosis, medicines } = req.body;

    if (!diagnosis && (!medicines || medicines.length === 0)) {
        return res.status(400).json({ message: 'Diagnosis or medicines required for AI generation.' });
    }

    try {
        const prompt = `
            Act as a professional doctor in Bangladesh.
            Patient Diagnosis: ${diagnosis || 'Not specified'}.
            Prescribed Medicines: ${medicines?.map(m => m.generic_name).join(', ') || 'None'}.
            
            Generate a short, clear list of "General Advice" (Upodesh) for this patient.
            
            Rules:
            1. Suggest diet restrictions or foods to eat.
            2. Suggest lifestyle changes (rest, hygiene, etc).
            3. Mention warning signs (when to visit hospital immediately).
            4. Keep it concise (max 6-8 bullet points).
            5. Language: English. Plain text only. no special formatting like ** or __ or #.
        `;

        // 3. Use the NEW Method signature
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash", // Using the latest model
            contents: prompt,
        });

        // 4. Send response
        // The new SDK usually returns the text directly in response.text
        res.json({ advice: response.text });

    } catch (error) {
        console.error('AI SDK Error:', error);
        res.status(500).json({ message: 'Failed to generate advice. Please try again.' });
    }
});

export default router;