import React from 'react';
import { Outlet } from 'react-router';
import Header from '../components/Header'; 

function DoctorLayout() {
    return (
        <div className="bg-gray-50 min-h-screen">
            <Header /> 
            <main className="pt-4 pb-10">
                <Outlet />
            </main>
        </div>
    );
}

export default DoctorLayout;