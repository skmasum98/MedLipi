import express from 'express';
import axios from 'axios';
import qs from 'qs';
import verifyToken from '../middleware/auth.js'; 

const router = express.Router();
router.use(verifyToken);

// Cache the token in memory so we don't request it every time
let cachedToken = null;
let tokenExpiry = null;

// --- Helper: Get Valid WHO Token ---
const getWhoToken = async () => {
    // Return cached token if valid (with 1 min buffer)
    if (cachedToken && tokenExpiry && new Date() < tokenExpiry) {
        return cachedToken;
    }

    try {
        const data = qs.stringify({
            'grant_type': 'client_credentials',
            'client_id': process.env.ICD_CLIENT_ID,
            'client_secret': process.env.ICD_CLIENT_SECRET,
            'scope': 'icdapi_access'
        });

        const response = await axios.post(process.env.ICD_AUTH_URL, data, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        cachedToken = response.data.access_token;
        // Set expiry (expires_in is usually 3600 seconds)
        const expiresIn = response.data.expires_in - 60; 
        tokenExpiry = new Date(new Date().getTime() + expiresIn * 1000);

        return cachedToken;
    } catch (error) {
        console.error("Error getting WHO Token:", error.response?.data || error.message);
        throw new Error("Failed to authenticate with WHO API");
    }
};

// --- GET /api/icd/search?q=dengue ---
router.get('/search', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.json([]);

    try {
        const token = await getWhoToken();

        // Call WHO API v2.5
        const response = await axios.get(`${process.env.ICD_API_BASE}/search`, {
            params: {
                q: query,
                useFlexisearch: 'true', // Better fuzzy matching
                flatResults: 'true'     // Easier to parse
            },
            headers: {
                'Authorization': `Bearer ${token}`,
                'API-Version': 'v2',
                'Accept-Language': 'en'
            }
        });

        // Transform results for frontend
        const results = response.data.destinationEntities.map(entity => ({
            code: entity.theCode, // The ICD-11 Code (e.g., 1G40)
            title: entity.title.replace(/<[^>]*>?/gm, ''), // Remove HTML tags if any
            uri: entity.id
        }));

        res.json(results);

    } catch (error) {
        console.error("ICD Search Error:", error.response?.data || error.message);
        res.status(500).json({ message: "Error searching ICD database" });
    }
});

export default router;