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


// Start Server
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});