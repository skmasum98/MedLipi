import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router';
import Login from './pages/Login';
import Register from './pages/Register';
import PrescriptionForm from './pages/PrescriptionForm';

// Create a simple protected component for testing
function ProtectedDashboard({ authToken, setAuthToken }) {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const VITE_API_URL = import.meta.env.VITE_API_URL;

    useEffect(() => {
        if (!authToken) return;

        const fetchProfile = async () => {
            try {
                const response = await fetch(`${VITE_API_URL}/doctors/profile`, {
                    headers: {
                        'Authorization': `Bearer ${authToken}` // <-- This is where the token is sent!
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    setProfile(data);
                } else {
                    // Token is invalid/expired, log out
                    localStorage.removeItem('token');
                    alert('Session expired. Please log in again.');
                    // This is a simple alert, better navigation logic would be in a custom hook
                }
            } catch (error) {
                console.error('Failed to fetch profile:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [authToken, VITE_API_URL]);

    if (!authToken) {
        return <Navigate to="/login" replace />; // Redirect if no token
    }
    
    if (loading) return <div>Loading Profile...</div>;

    return (
        <div style={{ padding: '20px' }}>
            <h2>Dashboard - Protected Route Success!</h2>
            {profile ? (
                <div>
                    <p>Welcome back, Dr. {profile.full_name}!</p>
                    <p>BMDC Reg: {profile.bmdc_reg}</p>
                    <p>Email: {profile.email}</p>
                    <p>Degree: {profile.degree}</p>
                </div>
            ) : (
                <p>Failed to load profile data.</p>
            )}
            <button onClick={() => {
                localStorage.removeItem('token');
                window.location.reload(); // Simple logout reload
            }}>Logout</button>
        </div>
    );
}


function App() {
    const [authToken, setAuthToken] = useState(localStorage.getItem('token'));

    return (
        <Router>
            <nav style={{ padding: '10px', background: '#f0f0f0' }}>
                <Link to="/login" style={{ marginRight: '15px' }}>Login</Link>
                <Link to="/register" style={{ marginRight: '15px' }}>Register</Link>
                <Link to="/dashboard">Dashboard (Protected)</Link>
            </nav>
            <Routes>
                <Route path="/register" element={<Register />} />
                <Route 
                    path="/login" 
                    element={<Login setAuthToken={setAuthToken} />} 
                />
                <Route 
                    path="/dashboard" 
                    element={<PrescriptionForm authToken={authToken} />}
                />
                
                <Route path="*" element={<Navigate to={authToken ? "/dashboard" : "/login"} replace />} />
            </Routes>
        </Router>
    );
}

export default App;