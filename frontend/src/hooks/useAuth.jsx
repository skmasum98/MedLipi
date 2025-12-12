import React, { useState, useEffect, useContext, createContext } from 'react';
import { useNavigate } from 'react-router';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(localStorage.getItem('token') || localStorage.getItem('adminToken') || localStorage.getItem('patientToken'));
    // Try to get stored user data if available to prevent flash
    const [doctor, setDoctor] = useState(null); // 'doctor' variable name acts as the general user object
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    
    const VITE_API_URL = import.meta.env.VITE_API_URL;

    const login = (newToken, userData) => {
        localStorage.setItem('token', newToken);
        setToken(newToken);
        if (userData) setDoctor(userData);
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('adminToken');
        localStorage.removeItem('patientToken');
        setToken(null);
        setDoctor(null);
        navigate('/login');
    };

    useEffect(() => {
        if (!token) {
            setLoading(false);
            return;
        }

        const verifySession = async () => {
            try {
                // FIX: Call the GENERIC endpoint, not /doctors/profile
                const response = await fetch(`${VITE_API_URL}/auth/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    
                    // Normalize the data into our state
                    // The rest of the app expects 'doctor' object for doctors. 
                    // For admins, this will contain admin data.
                    setDoctor({
                        id: data.id,
                        full_name: data.name, // Map generic 'name' to 'full_name' for compatibility
                        role: data.role,
                        ...data 
                    });
                } else {
                    // Only logout if it's explicitly unauthorized
                    if (response.status === 401 || response.status === 403) {
                         logout();
                    }
                }
            } catch (error) {
                console.error("Auth check failed:", error);
            } finally {
                setLoading(false);
            }
        };

        verifySession();
    }, [token, VITE_API_URL]);

    const value = {
        token,
        doctor, // This now holds Admin OR Doctor data
        isAuthenticated: !!token,
        isLoading: loading,
        login,
        logout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};