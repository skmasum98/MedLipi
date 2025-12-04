import express from 'express';
import axios from 'axios';
import qs from 'qs'; // Ensure you ran: npm install qs
import verifyToken from '../middleware/auth.js'; 

const router = express.Router();
router.use(verifyToken);

// In-memory cache for token
let cachedToken = null;
let tokenExpiry = null;

// --- Helper: Get Valid WHO Token ---
const getWhoToken = async () => {
    // 1. Check if we have a valid cached token
    if (cachedToken && tokenExpiry && new Date() < tokenExpiry) {
        return cachedToken;
    }

    console.log("Requesting new WHO Token...");

    try {
        // 2. Format data using qs.stringify (Required for x-www-form-urlencoded)
        const data = qs.stringify({
            'grant_type': 'client_credentials',
            'client_id': process.env.ICD_CLIENT_ID,
            'client_secret': process.env.ICD_CLIENT_SECRET,
            'scope': 'icdapi_access'
        });

        // 3. Make request
        const response = await axios.post(process.env.ICD_AUTH_URL, data, {
            headers: { 
                'Content-Type': 'application/x-www-form-urlencoded' 
            }
        });

        console.log("WHO Token Received successfully.");

        // 4. Cache token
        cachedToken = response.data.access_token;
        const expiresIn = response.data.expires_in - 120; // Reduce 2 mins for safety buffer
        tokenExpiry = new Date(new Date().getTime() + expiresIn * 1000);

        return cachedToken;
    } catch (error) {
        console.error("CRITICAL: Error getting WHO Token:", error.response?.data || error.message);
        throw new Error("Failed to authenticate with WHO API. Check Client ID/Secret.");
    }
};

// --- GET /api/icd/search?q=query ---
router.get('/search', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.json([]);

    try {
        const token = await getWhoToken();

        // Call WHO API
        // NOTE: release/11/2024-01/mms is the standard stable endpoint
        const response = await axios.get(`${process.env.ICD_API_BASE}/search`, {
            params: {
                q: query,
                useFlexisearch: 'true',
                flatResults: 'true'
            },
            headers: {
                'Authorization': `Bearer ${token}`,
                'API-Version': 'v2',
                'Accept-Language': 'en'
            }
        });

        const results = response.data.destinationEntities.map(entity => ({
            code: entity.theCode, 
            title: entity.title.replace(/<[^>]*>?/gm, ''), // Clean HTML
            uri: entity.id
        }));

        res.json(results);

    } catch (error) {
        // Detailed error logging for debugging on Render
        console.error("ICD Search Error Payload:", error.response?.data);
        console.error("ICD Search Error Status:", error.response?.status);
        res.status(500).json({ 
            message: "Error searching ICD database", 
            detail: error.message 
        });
    }
});

export default router;