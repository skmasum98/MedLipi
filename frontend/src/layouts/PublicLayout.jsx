import React from 'react';
import { Outlet } from 'react-router';
import PatientHeader from '../components/PatientHeader'; 

function PublicLayout() {
    return (
        <div className="min-h-screen font-sans text-gray-900 bg-white">
            <PatientHeader />
            <Outlet />
        </div>
    );
}

export default PublicLayout;