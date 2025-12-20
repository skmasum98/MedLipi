import React from 'react';
import { Outlet, Link, useLocation } from 'react-router';
import { useAuth } from '../hooks/useAuth';

function GlobalReceptionLayout() {
    const { logout, doctor } = useAuth(); // doctor obj holds logged in user (global staff)
    const location = useLocation();

    // Helper for active link class
    const getLinkClass = (path) => {
        const isActive = location.pathname === path;
        return `px-3 py-2 rounded transition-colors text-sm font-bold ${isActive ? 'bg-indigo-900 text-white shadow-inner' : 'hover:bg-indigo-600 hover:text-white text-indigo-100'}`;
    };

    return (
        <div className="bg-slate-50 min-h-screen font-sans">
            {/* Top Navigation Bar */}
            <nav className="bg-indigo-800 text-white shadow-lg sticky top-0 z-50 border-b border-indigo-900">
                <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
                     
                     {/* Left: Brand / Title */}
                     <Link to="/greception-dashboard" className="flex items-center gap-3 group">
                         <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-xl shadow-md group-hover:rotate-12 transition-transform">
                             🌍
                         </div>
                         <div className="flex flex-col">
                             <span className="font-extrabold text-lg leading-tight tracking-wide">MEDLIPI GLOBAL</span>
                             <span className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider">Central Desk</span>
                         </div>
                    </Link>

                    {/* Center: Main Links */}
                    <div className="hidden md:flex gap-1 items-center bg-indigo-700/50 p-1 rounded-lg">
                        <Link to="/greception-dashboard" className={getLinkClass('/greception-dashboard')}>Queue Board</Link>
                        <Link to="/greception/walk-in" className={getLinkClass('/greception/walk-in')}>+ New Entry</Link>
                        <Link to="/greception/sessions" className={getLinkClass('/greception/sessions')}>Schedules</Link>
                    </div>

                    {/* Right: User Profile & Logout */}
                    <div className="flex gap-4 items-center">
                        <div className="text-right hidden sm:block">
                            <div className="text-xs text-indigo-300 uppercase font-bold">Logged In As</div>
                            <div className="text-sm font-bold truncate max-w-[150px]">{doctor?.full_name || doctor?.name}</div>
                        </div>
                        
                        <div className="h-8 w-px bg-indigo-600 mx-1"></div>
                        
                        <button 
                            onClick={logout} 
                            className="bg-indigo-900 hover:bg-red-600 px-4 py-2 rounded-lg transition-colors border border-indigo-600 text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-2"
                        >
                            <span>Exit</span>
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        </button>
                    </div>
                </div>
            </nav>

            {/* Mobile Sub-menu (Visible only on small screens) */}
            <div className="md:hidden bg-indigo-900 text-center py-2 text-indigo-200 text-xs border-b border-indigo-800">
                Tap Menu above to navigate
            </div>

            {/* Content Injection */}
            <main className="p-4 md:p-8 max-w-[1600px] mx-auto">
                <Outlet />
            </main>
        </div>
    );
}

export default GlobalReceptionLayout;