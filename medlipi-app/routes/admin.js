import express from 'express';
import pool from '../db.js';
import verifyToken from '../middleware/auth.js'; 
import bcrypt from 'bcryptjs';

const router = express.Router();

const verifyAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'super_admin') {
        next();
    } else {
        return res.status(403).json({ message: "Admin Access Only" });
    }
};

router.use(verifyToken);
router.use(verifyAdmin); 




// --- GET Platform Stats (Global) ---
router.get('/stats', async (req, res) => {
    try {
        const queries = [
            'SELECT COUNT(*) as count FROM doctors',
            'SELECT COUNT(*) as count FROM patients',
            'SELECT COUNT(*) as count FROM prescriptions'
        ];
        
        const [docs] = await pool.query(queries[0]);
        const [pts] = await pool.query(queries[1]);
        const [rxs] = await pool.query(queries[2]);

        res.json({
            doctors: docs[0].count,
            patients: pts[0].count,
            prescriptions: rxs[0].count
        });
    } catch (e) { res.status(500).json({ message: "Error" }); }
});

// --- GET All Doctors (List) ---
router.get('/doctors', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                d.doctor_id, d.full_name, d.email, d.bmdc_reg, d.degree, d.status, d.created_at,
                (SELECT COUNT(*) FROM patients p 
                 JOIN prescriptions pr ON p.patient_id = pr.patient_id 
                 WHERE pr.doctor_id = d.doctor_id) as patient_count
            FROM doctors d 
            ORDER BY d.created_at DESC
        `);
        res.json(rows);
    } catch (e) { res.status(500).json({ message: "Error" }); }
});

// --- POST Create Doctor (Onboarding) ---
router.post('/doctors', async (req, res) => {
    const { full_name, email, password, bmdc_reg } = req.body;
    
    if (!email || !password || !full_name) {
        return res.status(400).json({ message: 'Name, Email and Password required' });
    }

    try {
        // Hash password for doctor
        const password_hash = await bcrypt.hash(password, 10);
        
        const [result] = await pool.query(
            `INSERT INTO doctors (full_name, email, password_hash, bmdc_reg, status, role) VALUES (?, ?, ?, ?, 'active', 'doctor')`,
            [full_name, email, password_hash, bmdc_reg || 'TBD']
        );
        res.status(201).json({ message: 'Doctor account created', id: result.insertId });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Email or BMDC already exists' });
        res.status(500).json({ message: 'Creation failed' });
    }
});

// --- DELETE Doctor (Danger Zone) ---
router.delete('/doctors/:id', async (req, res) => {
    const { id } = req.params;
    // Note: Due to foreign keys, this might fail unless ON DELETE CASCADE is set in SQL schema.
    // If not set, you must delete dependencies (prescriptions, schedules) first manually here.
    // For now, assuming standard CASCADE setup or basic clean-up:
    try {
        await pool.query('DELETE FROM doctors WHERE doctor_id = ?', [id]);
        res.json({ message: 'Doctor deleted' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Delete failed (Likely due to existing patient records). Disable account instead.' });
    }
});

// --- PUT Update Doctor Status (Suspend) ---
router.put('/doctors/:id/status', async (req, res) => {
    const { status } = req.body; 
    try {
        await pool.query('UPDATE doctors SET status = ? WHERE doctor_id = ?', [status, req.params.id]);
        res.json({ message: "Status updated" });
    } catch (e) { res.status(500).json({ message: "Update failed" }); }
});

// --- GET Single Doctor Deep Analytics ---
router.get('/doctors/:id/details', async (req, res) => {
    const { id } = req.params;
    try {
        // Example deeper metric: Rx count
        const [stats] = await pool.query('SELECT COUNT(*) as rx_count FROM prescriptions WHERE doctor_id = ?', [id]);
        const [staff] = await pool.query('SELECT COUNT(*) as staff_count FROM clinic_staff WHERE doctor_id = ?', [id]);
        
        res.json({
            rx_count: stats[0].rx_count,
            staff_count: staff[0].staff_count
        });
    } catch (e) { res.status(500).json({message: "Error fetching details"}); }
});


// --- GET Global Analytics Report ---
router.get('/analytics', async (req, res) => {
    try {
        const stats = {};

        // 1. Patient Growth (This Month vs Last Month)
        // Count created in Current Month vs Previous Month
        const growthQuery = `
            SELECT 
                SUM(CASE WHEN created_at >= DATE_FORMAT(NOW(), '%Y-%m-01') THEN 1 ELSE 0 END) as this_month,
                SUM(CASE WHEN created_at >= DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 1 MONTH), '%Y-%m-01') 
                          AND created_at < DATE_FORMAT(NOW(), '%Y-%m-01') THEN 1 ELSE 0 END) as last_month
            FROM patients
        `;
        const [growth] = await pool.query(growthQuery);
        stats.patient_growth = growth[0];

        // 2. Top Prescribed Medicines (Anonymized Global)
        // Group by Drug Name from drug_inventory linked by prescriptions
        const drugsQuery = `
            SELECT 
                d.generic_name, 
                COUNT(p.prescription_id) as usage_count
            FROM prescriptions p
            JOIN drug_inventory d ON p.drug_id = d.drug_id
            GROUP BY d.generic_name
            ORDER BY usage_count DESC
            LIMIT 5
        `;
        const [topDrugs] = await pool.query(drugsQuery);
        stats.top_medicines = topDrugs;

        // 3. System Health (Database Size Estimate - MySQL Specific)
        // Requires admin privilege on SQL usually, but often works on standard hosted
        const dbSizeQuery = `
            SELECT table_schema AS "Database", 
            ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS "SizeMB" 
            FROM information_schema.TABLES 
            WHERE table_schema = ?
            GROUP BY table_schema
        `;
        const [dbSize] = await pool.query(dbSizeQuery, [process.env.DB_DATABASE]);
        stats.system_health = { 
            db_size_mb: dbSize[0] ? dbSize[0].SizeMB : 'Unknown', 
            active_users: 0 // Could implement tracking last_login in future
        };

        res.json(stats);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: "Analytics Error" });
    }
});

// --- POST Perform System Maintenance Actions ---
router.post('/maintenance', async (req, res) => {
    const { action } = req.body;
    // Actions: 'clear_logs', 'delete_old_appts', 'optimize_db'
    
    try {
        let message = '';
        
        if (action === 'delete_old_appts') {
            // Delete appointments older than 2 years (Example Policy)
            // SQL safe delete
            const [result] = await pool.query(
                `DELETE FROM appointments WHERE created_at < DATE_SUB(NOW(), INTERVAL 2 YEAR)`
            );
            message = `Deleted ${result.affectedRows} old appointment records.`;
        
        } else if (action === 'clean_tokens') {
             // (If you had a refresh token table, clean it here. We use stateless JWT so this is a placeholder)
             message = 'Token cache cleaned (mock).';

        } else if (action === 'optimize_db') {
            // Standard MySQL Optimization commands
            // NOTE: Depending on hosting permission, this might require root. 
            // `OPTIMIZE TABLE` reclaims unused space.
            await pool.query('OPTIMIZE TABLE patients, prescriptions, appointments, drug_inventory');
            message = 'Database tables optimized.';
        } else {
             return res.status(400).json({message: "Invalid Action"});
        }

        res.json({ success: true, message });
        
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Maintenance Failed' });
    }
});




// --- GET Global Staff ---
router.get('/global-staff', async (req, res) => {
    const [rows] = await pool.query('SELECT staff_id, full_name, username, status, created_at FROM global_staff');
    res.json(rows);
});

// --- POST Create Global Staff ---
router.post('/global-staff', async (req, res) => {
    const { full_name, username, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO global_staff (full_name, username, password_hash) VALUES (?, ?, ?)',
            [full_name, username, hashedPassword]
        );
        res.status(201).json({ message: 'Staff Created' });
    } catch (e) {
        if(e.code === 'ER_DUP_ENTRY') return res.status(400).json({message: 'Username taken'});
        res.status(500).json({ message: 'Error' });
    }
});

// --- DELETE Global Staff ---
router.delete('/global-staff/:id', async (req, res) => {
    await pool.query('DELETE FROM global_staff WHERE staff_id = ?', [req.params.id]);
    res.json({ message: 'Deleted' });
});



export default router;