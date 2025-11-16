import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router';
import { AuthProvider, useAuth } from './hooks/useAuth'; // Import Auth Provider and Hook
import ProtectedRoute from './components/ProtectedRoute'; // Import ProtectedRoute

import Login from './pages/Login';
import Register from './pages/Register';
import PrescriptionForm from './pages/PrescriptionForm';

// --- Simple Component to show Doctor info and Logout ---
function DoctorProfile() {
    const { doctor, logout } = useAuth();
    
    return (
        <div style={{ padding: '20px' }}>
            <h2>Welcome back, Dr. {doctor?.full_name}!</h2>
            <p>BMDC Reg: {doctor?.bmdc_reg}</p>
            <p>Degree: {doctor?.degree}</p>
            <button onClick={logout}>Logout</button>
        </div>
    );
}

// --- Main App Component ---
function App() {
    return (
        <Router>
            {/* Wrap the entire App logic in the AuthProvider */}
            <AuthProvider>
                <Nav />
                <Routes>
                    <Route path="/register" element={<Register />} />
                    {/* Login component uses the login function from context */}
                    <Route path="/login" element={<Login />} /> 
                    
                    {/* All protected routes are wrapped in the ProtectedRoute component */}
                    <Route 
                        path="/profile" 
                        element={<ProtectedRoute><DoctorProfile /></ProtectedRoute>} 
                    />
                    <Route 
                        path="/dashboard" 
                        element={<ProtectedRoute><PrescriptionForm /></ProtectedRoute>} 
                    />
                    
                    <Route path="*" element={<HomeRedirect />} />
                </Routes>
            </AuthProvider>
        </Router>
    );
}

// Helper component for Navigation Links
function Nav() {
    const { isAuthenticated, logout } = useAuth();
    return (
        <nav style={{ padding: '10px', background: '#f0f0f0' }}>
            <Link to="/login" style={{ marginRight: '15px' }}>Login</Link>
            <Link to="/register" style={{ marginRight: '15px' }}>Register</Link>
            {isAuthenticated && (
                <>
                    <Link to="/dashboard" style={{ marginRight: '15px' }}>New Prescription</Link>
                    <Link to="/profile" style={{ marginRight: '15px' }}>Profile</Link>
                    <button onClick={logout}>Logout (Nav)</button>
                </>
            )}
        </nav>
    );
}

// Helper component to redirect unauthenticated/authenticated users
function HomeRedirect() {
    const { isAuthenticated, isLoading } = useAuth();
    
    if (isLoading) return <div>Loading...</div>; // Wait for auth status
    
    return <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />;
}

export default App;