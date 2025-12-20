import jwt from 'jsonwebtoken';
import 'dotenv/config';

const verifyToken = (req, res, next) => {
    // 1. Get the token
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Access Denied: No token provided.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        // 2. Verify
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 3. Attach standard user payload
        // This is the new standard: use req.user.id, req.user.role everywhere eventually
        req.user = decoded; 

        // GLOBAL RECEPTIONIST LOGIC:
        // They pass 'target_doctor_id' in headers (x-target-doctor-id) or query when doing specific actions.
        if (decoded.role === 'global_receptionist') {
            const headerId = req.headers['x-target-doctor-id'];
            if (headerId) {
                req.operatingDoctorId = parseInt(headerId); // Impersonate this doctor
            }
        }

        // 4. BACKWARD COMPATIBILITY
        // If the token belongs to a DOCTOR, attach it to req.doctor as well
        // so your older routes (e.g. GET /prescriptions/recent) don't crash.
        
        // Check 1: Old Tokens might not have 'role'. Assume they are doctors if 'bmdc' exists.
        // Check 2: New Tokens have role='doctor'
        if (decoded.role === 'doctor' || decoded.bmdc) {
            req.doctor = decoded; // Legacy Support
        }

        // If patient token, verify patient routes handle req.user or req.patientId separately.
        // Your current patient routes use a specific 'verifyPatientToken' middleware, so they are safe.
        // But for routes shared (like appointments POST), req.user is now available!

        next();
    } catch (error) {
        console.error("Token verification failed:", error.message);
        res.status(403).json({ message: 'Access Denied: Invalid or expired token.' });
    }
};

export default verifyToken;