import React from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../hooks/useAuth';

function ProtectedRoute({ children, allowedRoles }) {
    const { isAuthenticated, isLoading, doctor } = useAuth(); 

    // 1. Loading State
    if (isLoading) return <div className="h-screen flex items-center justify-center">Loading Access...</div>;

    // 2. Authentication Check
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    
    // --- FIX START ---
    // 3. User Data Integrity Check
    // If token is valid but 'doctor' state is null, we can't check role. Wait or Redirect.
    if (!doctor) return <div className="h-screen flex items-center justify-center">Authenticating...</div>;
    // --- FIX END ---

    // 4. Role Check
    if (allowedRoles && !allowedRoles.includes(doctor.role)) {
        // Redirection logic remains the same...
        if (doctor.role === 'receptionist') return <Navigate to="/reception-dashboard" replace />;
        if (doctor.role === 'assistant') return <Navigate to="/assistant-dashboard" replace />;
        if (doctor.role === 'doctor') return <Navigate to="/dashboard" replace />;
        if (doctor.role === 'super_admin') return <Navigate to="/admin/dashboard" replace />;
        return <div className="p-10 text-center">Access Denied</div>;
    }

    return children;
}

export default ProtectedRoute;