import jwt from 'jsonwebtoken';
import 'dotenv/config';

const verifyToken = (req, res, next) => {
    // 1. Get the token from the Authorization header (Bearer <token>)
    const authHeader = req.headers.authorization;

    // Check if header is present and starts with 'Bearer '
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Access Denied: No token provided or invalid format.' });
    }

    // Extract the token part
    const token = authHeader.split(' ')[1];

    try {
        // 2. Verify the token using the secret key
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 3. Attach the decoded user payload to the request object
        // This makes doctor_id, name, bmdc available in all protected routes
        req.doctor = decoded; 

        // 4. Proceed to the next middleware or the route handler
        next();
    } catch (error) {
        // Handle token expiration, invalid signature, etc.
        console.error("Token verification failed:", error.message);
        res.status(403).json({ message: 'Access Denied: Invalid or expired token.' });
    }
};

export default verifyToken;