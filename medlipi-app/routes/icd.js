import express from 'express';
import axios from 'axios';
import qs from 'qs';
import verifyToken from '../middleware/auth.js';

const router = express.Router();
router.use(verifyToken);

let cachedToken = null;
let tokenExpiry = null;

const getWhoToken = async () => {
    // Check cache
    if (cachedToken && tokenExpiry && new Date() < tokenExpiry) {
        return cachedToken; // <--- RETURNS INSTANTLY
    }

    // Only hit WHO Auth Server if token is missing or expired
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
        // Expire in 55 minutes (tokens usually last 1 hour)
        const expiresIn = response.data.expires_in - 300; 
        tokenExpiry = new Date(new Date().getTime() + expiresIn * 1000);

        return cachedToken;
    } catch (error) {
        throw new Error("Auth Failed");
    }
};

router.get('/search', async (req, res) => {
    const query = req.query.q;

    if (!query || query.trim().length < 2) {
        return res.json([]);
    }

    try {
        const token = await getWhoToken();

        const response = await axios.get(`${process.env.ICD_API_BASE}/search`, {
            params: {
                q: query,
                useFlexisearch: query.length > 3 ? 'true' : 'false',
                flatResults: 'true'
            },
            headers: {
                Authorization: `Bearer ${token}`,
                'API-Version': 'v2',
                'Accept-Language': 'en'
            }
        });

        const entities = response?.data?.destinationEntities || [];

        const results = entities.map(entity => ({
            code: entity.theCode,
            title: (entity.title || '').replace(/<[^>]*>?/gm, ''),
            uri: entity.id
        }));

        res.json(results);

    } catch (error) {
        console.error("ICD Search Error Payload:", error.response?.data);
        console.error("ICD Search Error Status:", error.response?.status);
        res.status(500).json({
            message: "Error searching ICD database",
            detail: error.response?.data || error.message
        });
    }
});


export default router;
