import React from 'react';
// FIX: Changed 'react-router' to 'react-router-dom' for standard web routing
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router';
import { AuthProvider, useAuth } from './hooks/useAuth'; 
import ProtectedRoute from './components/ProtectedRoute'; 

// --- Navigation Components ---
import Header from './components/Header';           // Doctor's Blue Header
import PatientHeader from './components/PatientHeader'; // Patient/Public White Header

// --- Page Imports ---
// Public & Patient Pages
import Home from './pages/Home'; 
import Login from './pages/Login';
import Register from './pages/Register';
import FindDoctors from './pages/FindDoctors';
import PatientLogin from './pages/PatientLogin';
import PatientRegister from './pages/PatientRegister';
import PatientDashboard from './pages/PatientDashboard';
import PublicDownload from './pages/PublicDownload';

// Doctor Protected Pages
import Dashboard from './pages/Dashboard';
import PrescriptionForm from './pages/PrescriptionForm';
import Inventory from './pages/Inventory';
import Settings from './pages/Settings';
import Patients from './pages/Patients';
import PatientRecord from './pages/PatientRecord';
import Appointments from './pages/Appointments';
import SessionManager from './pages/SessionManager';

// --- Layout Manager Component ---
// Decides which Header to show based on the URL path
function Layout() {
    const location = useLocation();
    
    // List of route prefixes that belong to the "Doctor Portal"
    const doctorRoutes = [
        '/dashboard', 
        '/prescription', 
        '/inventory', 
        '/profile', 
        '/patients', 
        '/appointments',
        '/session'
    ];

    // Check logic
    const isDoctorRoute = doctorRoutes.some(path => location.pathname.startsWith(path));
    const isPublicDownload = location.pathname.startsWith('/p/');

    return (
        <>
            {/* 1. DOCTOR HEADER (Blue) - Only on Doctor Routes */}
            {isDoctorRoute && <Header />}

            {/* 2. PATIENT HEADER (White) - On all other pages EXCEPT Public Download */}
            {!isDoctorRoute && !isPublicDownload && <PatientHeader />}
            
            {/* Main Content Area */}
            {/* Doctor Dashboard gets specific padding/bg, others take full screen defaults */}
            <main className={isDoctorRoute ? "pt-4 pb-10 bg-gray-50 min-h-screen" : "min-h-screen"}>
                <Routes>
                    
                    {/* --- PUBLIC & PATIENT ROUTES (White Header) --- */}
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<Login />} /> 
                    <Route path="/register" element={<Register />} />
                    
                    <Route path="/find-doctors" element={<FindDoctors />} />
                    <Route path="/patient/login" element={<PatientLogin />} />
                    <Route path="/patient/register" element={<PatientRegister />} />
                    <Route path="/my-health" element={<PatientDashboard />} />

                    {/* --- ISOLATED ROUTES (No Header) --- */}
                    <Route path="/p/:uid" element={<PublicDownload />} /> 

                    {/* --- DOCTOR PROTECTED ROUTES (Blue Header) --- */}
                    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="/prescription/new" element={<ProtectedRoute><PrescriptionForm /></ProtectedRoute>} />
                    <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
                    <Route path="/profile" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                    
                    {/* Patient Management */}
                    <Route path="/patients" element={<ProtectedRoute><Patients /></ProtectedRoute>} />
                    <Route path="/patients/:id" element={<ProtectedRoute><PatientRecord /></ProtectedRoute>} />
                    
                    {/* Scheduling */}
                    <Route path="/appointments" element={<ProtectedRoute><Appointments /></ProtectedRoute>} />
                    <Route path="/session" element={<ProtectedRoute><SessionManager /></ProtectedRoute>} />
                                        
                    {/* Fallback Redirect */}
                    <Route path="*" element={<HomeRedirect />} />

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
function HomeRedirect() {
    const { isAuthenticated, isLoading } = useAuth();
    
    if (isLoading) return <div className="p-10 text-center text-gray-500">Loading...</div>; 
    
    // If logged in as Doctor -> Dashboard, otherwise -> Home
    return <Navigate to={isAuthenticated ? "/dashboard" : "/"} replace />;
}

export default App;