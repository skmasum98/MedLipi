import React from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../hooks/useAuth';

function ProtectedRoute({ children }) {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return <div>Loading Application...</div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return children;
}

export default ProtectedRoute;