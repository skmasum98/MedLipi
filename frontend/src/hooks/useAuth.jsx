import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router';

const AuthContext = React.createContext();

// Custom hook to consume the context
export const useAuth = () => useContext(AuthContext);

// Context Provider Component
export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [doctor, setDoctor] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const VITE_API_URL = import.meta.env.VITE_API_URL;

    // --- Authentication Logic ---
    const login = (newToken) => {
        localStorage.setItem('token', newToken);
        setToken(newToken);
        // Profile fetch will run automatically via useEffect
        navigate('/dashboard');
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setDoctor(null);
        navigate('/login');
    };

    // --- Profile Fetching and Token Validation ---
    useEffect(() => {
        if (!token) {
            setLoading(false);
            setDoctor(null);
            return;
        }

        const fetchProfile = async () => {
            try {
                const response = await fetch(`${VITE_API_URL}/doctors/profile`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    setDoctor(data);
                } else {
                    // Token is invalid (401/403)
                    logout(); 
                    alert('Session expired. Please log in again.');
                }
            } catch (error) {
                console.error('Failed to fetch profile:', error);
                // For network errors, we might keep the token but show an error
                setDoctor(null);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [token, VITE_API_URL]);

    // --- Context Value ---
    const value = {
        token,
        doctor,
        isAuthenticated: !!token,
        isLoading: loading,
        login,
        logout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};