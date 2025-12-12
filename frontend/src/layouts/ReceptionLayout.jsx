import React from 'react';
import { Outlet, Link } from 'react-router';
import { useAuth } from '../hooks/useAuth';

function ReceptionLayout() {
    const { logout, doctor } = useAuth();

    return (
        <div className="bg-gray-100 min-h-screen">
            <nav className="bg-purple-700 text-white shadow-lg sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
                     <div className="flex items-center gap-2">
                         <span className="text-xl">🏥</span>
                         <span className="font-bold text-lg">Reception Desk</span>
                    </div>
                    <div className="flex gap-4 text-sm font-medium items-center">
                        <Link to="/reception-dashboard" className="hover:text-purple-200">Live Queue</Link>
                        <Link to="/patient/register" className="hover:text-purple-200">Register New</Link>
                        <Link to="/appointments" className="hover:text-purple-200">Schedule</Link>
                        
                        <div className="h-4 w-px bg-purple-600"></div>
                        
                        <span className="opacity-80 text-xs">{doctor?.full_name}</span>
                        <button 
                            onClick={logout} 
                            className="bg-purple-800 hover:bg-purple-900 px-3 py-1.5 rounded transition-colors border border-purple-600"
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

export default ReceptionLayout;