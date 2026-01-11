import express from 'express';
import pool from '../db.js';
import verifyToken from '../middleware/auth.js'; 

const router = express.Router();
router.use(verifyToken);

// --- GET Doctor Profile ---
router.get('/profile', async (req, res) => {
    // FIX 1: Safety check for role
    if (req.user.role !== 'doctor' && !req.user.bmdc) {
        return res.status(403).json({ message: "Access denied. Not a doctor account." });
    }

    // FIX 2: Use 'req.user.id' which is guaranteed by verifyToken
    // (In our token, id is the doctor_id for doctors)
    const doctorId = req.user.id; 

    try {
        const query = `
            SELECT doctor_id, full_name, bmdc_reg, email, degree, 
                   clinic_name, chamber_address, phone_number, specialist_title 
            FROM doctors WHERE doctor_id = ?`;
        
        const [rows] = await pool.query(query, [doctorId]);
        const profile = rows[0];

        if (!profile) {
            return res.status(404).json({ message: 'Doctor profile not found.' });
        }

        res.json(profile);
    } catch (error) {
        console.error('Error fetching doctor profile:', error);
        res.status(500).json({ message: 'Server error while fetching profile.' });
    }
});

// --- PUT Update Doctor Profile ---
router.put('/profile', async (req, res) => {
    if (req.user.role !== 'doctor' && !req.user.bmdc) return res.status(403).json({message: "Unauthorized"});

    const doctorId = req.user.id; // FIX 3: Use req.user.id here too
    const { full_name, degree, clinic_name, chamber_address, phone_number, specialist_title } = req.body;

    try {
        const query = `
            UPDATE doctors 
            SET full_name = ?, degree = ?, clinic_name = ?, chamber_address = ?, phone_number = ?, specialist_title = ?
            WHERE doctor_id = ?
        `;
        
        await pool.query(query, [full_name, degree, clinic_name, chamber_address, phone_number, specialist_title, doctorId]);
        
        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ message: 'Server error updating profile.' });
    }
});

// --- GET My Rich Profile ---
router.get('/me/full-profile', async (req, res) => {
    try {
        const query = `
            SELECT 
                d.*,
                dp.about_text,
                dp.designation,
                dp.achievements,
                dp.social_links,
                dp.gallery_images,
                dp.video_links,
                dp.profile_image,
                dp.cover_image
            FROM doctors d
            LEFT JOIN doctor_profiles dp 
                ON d.doctor_id = dp.doctor_id
            WHERE d.doctor_id = ?
        `;

        const [rows] = await pool.query(query, [req.user.id]);

        if (!rows.length) {
            return res.status(404).json({ message: 'Doctor not found' });
        }

        const profile = rows[0];

        // Parse JSON fields safely
        profile.social_links = profile.social_links ? JSON.parse(profile.social_links) : {};
        profile.gallery_images = profile.gallery_images ? JSON.parse(profile.gallery_images) : [];
        profile.video_links = profile.video_links ? JSON.parse(profile.video_links) : [];
        profile.profile_image = profile.profile_image;
        profile.cover_image = profile.cover_image;

        res.json(profile);
    } catch (e) {
        console.error(e);
        res.status(500).send('Error fetching profile');
    }
});


// --- PUT Update Rich Profile (Settings Page) ---
router.put('/me/full-profile', async (req, res) => {
    const doctorId = req.user.id;

    const { 
        slug, full_name, degree, specialist_title, clinic_name, 
        chamber_address, phone_number,
        about_text, designation, achievements,
        social_links, gallery_images, video_links,
        profile_image, cover_image
    } = req.body;

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. Update basic doctor info
        await connection.query(
            `UPDATE doctors 
             SET full_name=?, degree=?, specialist_title=?, clinic_name=?, 
                 chamber_address=?, phone_number=?, slug=? 
             WHERE doctor_id=?`,
            [
                full_name,
                degree,
                specialist_title,
                clinic_name,
                chamber_address,
                phone_number,
                slug,
                doctorId
            ]
        );

        // 2. Upsert rich profile
        await connection.query(
            `INSERT INTO doctor_profiles 
                (doctor_id, about_text, designation, achievements, social_links, gallery_images, video_links, profile_image, cover_image)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                about_text     = VALUES(about_text),
                designation    = VALUES(designation),
                achievements   = VALUES(achievements),
                social_links   = VALUES(social_links),
                gallery_images = VALUES(gallery_images),
                video_links    = VALUES(video_links),
                profile_image  = VALUES(profile_image),
                cover_image    = VALUES(cover_image)
            `,
            [
                doctorId,
                about_text,
                designation,
                achievements,
                JSON.stringify(social_links || {}),
                JSON.stringify(gallery_images || []),
                JSON.stringify(video_links || []),
                profile_image, 
                cover_image
            ]
        );

        await connection.commit();
        res.json({ message: 'Profile Saved!' });

    } catch (e) {
        if (connection) await connection.rollback();

        if (e.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                message: 'URL/Slug is already taken. Choose another.'
            });
        }

        console.error(e);
        res.status(500).send('Save failed');
    } finally {
        if (connection) connection.release();
    }
});




export default router;