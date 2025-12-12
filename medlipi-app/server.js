import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import 'dotenv/config'; // ES6 way to load environment variables

// Import Database connection
import pool from './db.js'; 
// Import Routes
import authRoutes from './routes/auth.js';
import doctorRoutes from './routes/doctors.js';
import inventoryRoutes from './routes/inventory.js';
import prescriptionRoutes from './routes/prescriptions.js'; 
import templateRoutes from './routes/templates.js'; 
import patientRoutes from './routes/patients.js';
import interactionRoutes from './routes/interactions.js'; 
import diagnosisRoutes from './routes/diagnoses.js';
import analyticsRoutes from './routes/analytics.js';
import icdRoutes from './routes/icd.js';
import patientPortalRoutes from './routes/patient_portal.js';
import publicRoutes from './routes/public.js';
import clinicalTemplateRoutes from './routes/clinical_templates.js';
import aiRoutes from './routes/ai.js';
import appointmentRoutes from './routes/appointments.js';
import scheduleRoutes from './routes/schedules.js';
import adminRoutes from './routes/admin.js';
import staffRoutes from './routes/staff.js';

// Initialize Express App
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Basic Test Route
app.get('/', (req, res) => {
    res.send('MedLipi API is running!');
});

// Import and use routes

app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes); 
app.use('/api/inventory', inventoryRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/interactions', interactionRoutes);
app.use('/api/diagnoses', diagnosisRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/icd', icdRoutes);
app.use('/api/portal', patientPortalRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/clinical-templates', clinicalTemplateRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/staff', staffRoutes);

// Start Server
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});