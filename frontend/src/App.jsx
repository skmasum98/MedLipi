import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router'; // FIXED IMPORT
import { AuthProvider, useAuth } from './hooks/useAuth'; 
import ProtectedRoute from './components/ProtectedRoute'; 
import Header from './components/Header'; 

// --- Pages Imports ---
import Home from './pages/Home'; // Landing Page
import Login from './pages/Login';
import Register from './pages/Register';
import PrescriptionForm from './pages/PrescriptionForm';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Inventory from './pages/Inventory';
import Patients from './pages/Patients';
import PatientRecord from './pages/PatientRecord';
import PatientLogin from './pages/PatientLogin';
import PatientDashboard from './pages/PatientDashboard';
import PublicDownload from './pages/PublicDownload';
import Appointments from './pages/Appointments';
import SessionManager from './pages/SessionManager';
import PatientRegister from './pages/PatientRegister';

// --- Layout Component ---
// Handles conditional rendering of the Header and main container styles
function Layout() {
    const location = useLocation();
    
    // Paths where the Doctor Navigation/Header should NOT appear
    const noHeaderPaths = [
        '/',                // Landing Page
        '/login',           // Doctor Login
        '/register',        // Doctor Register
        '/patient/login',   // Patient Login
        '/my-health'        // Patient Dashboard
    ];

    // Check if current path is in the list OR if it starts with '/p/' (Public Download)
    const isPublicDownload = location.pathname.startsWith('/p/');
    const showHeader = !noHeaderPaths.includes(location.pathname) && !isPublicDownload;

    return (
        <>
            {/* Show Header only for Doctor Protected Routes */}
            {showHeader && <Header />}
            
            {/* Apply padding/background styling only for dashboard pages */}
            <main className={showHeader ? "pt-4 pb-10 bg-gray-50 min-h-screen" : "min-h-screen"}>
                <Routes>
                    {/* --- PUBLIC ROUTES --- */}
                    <Route path="/" element={<Home />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/login" element={<Login />} /> 
                    
                    {/* Plan A: QR Code Public Download */}
                    <Route path="/p/:uid" element={<PublicDownload />} /> 

                    {/* Plan B: Patient Portal */}
                    <Route path="/patient/login" element={<PatientLogin />} />
                    <Route path="/my-health" element={<PatientDashboard />} />

                    {/* --- DOCTOR PROTECTED ROUTES --- */}
                    <Route 
                        path="/dashboard" 
                        element={<ProtectedRoute><Dashboard /></ProtectedRoute>} 
                    />
                    <Route 
                        path="/prescription/new" 
                        element={<ProtectedRoute><PrescriptionForm /></ProtectedRoute>} 
                    />
                    <Route 
                        path="/inventory" 
                        element={<ProtectedRoute><Inventory /></ProtectedRoute>} 
                    />
                    <Route 
                        path="/profile" 
                        element={<ProtectedRoute><Settings /></ProtectedRoute>} 
                    />
                    <Route 
                        path="/patients" 
                        element={<ProtectedRoute><Patients /></ProtectedRoute>} 
                    />
                    <Route 
                        path="/patients/:id" 
                        element={<ProtectedRoute><PatientRecord /></ProtectedRoute>} 
                    />
                                        
                    {/* Catch-all Redirect */}
                    <Route path="*" element={<HomeRedirect />} />
                    <Route path="/appointments" element={<ProtectedRoute><Appointments /></ProtectedRoute>} />
                    <Route path="/session" element={<ProtectedRoute><SessionManager /></ProtectedRoute>} />
                    <Route path="/patient/register" element={<PatientRegister />} />
                </Routes>
            </main>
        </>
    );
}

// --- Main App Component ---
function App() {
    return (
        <Router>
            <AuthProvider>
                <Layout />
            </AuthProvider>
        </Router>
    );
}

// --- Helper: Redirect Logic ---
// Redirects unknown URLs: 
// - If logged in: Go to Dashboard
// - If not logged in: Go to Login (or Home '/')
function HomeRedirect() {
    const { isAuthenticated, isLoading } = useAuth();
    
    if (isLoading) return <div className="p-10 text-center text-gray-500">Loading App...</div>; 
    
    return <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />;
}

export default App;