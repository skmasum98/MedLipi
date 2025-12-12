import React from 'react';
import { Outlet, Link } from 'react-router';
import { useAuth } from '../hooks/useAuth';

function AssistantLayout() {
    const { logout, doctor } = useAuth(); // 'doctor' holds the current user info

    return (
        <div className="bg-gray-100 min-h-screen">
            <nav className="bg-teal-700 text-white shadow-lg sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                         <span className="text-xl">🩺</span>
                         <span className="font-bold text-lg">Medical Assistant</span>
                    </div>
                    <div className="flex gap-4 text-sm font-medium items-center">
                        <Link to="/assistant-dashboard" className="hover:text-teal-200">Waiting Room</Link>
                        
                        <div className="h-4 w-px bg-teal-600"></div>
                        
                        <span className="opacity-80 text-xs">Staff: {doctor?.full_name}</span>
                        <button 
                            onClick={logout} 
                            className="bg-teal-800 hover:bg-teal-900 px-3 py-1.5 rounded transition-colors border border-teal-600"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </nav>
            <main className="p-6">
                <Outlet />
            </main>
        </div>
    );
}

export default AssistantLayout;