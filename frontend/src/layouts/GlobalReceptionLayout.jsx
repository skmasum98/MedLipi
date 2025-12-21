import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router'; // Ensure router-dom
import { useAuth } from '../hooks/useAuth';

function GlobalReceptionLayout() {
    const { logout, doctor } = useAuth(); // doctor obj holds logged in user (global staff)
    const location = useLocation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Helper for active link class
    const getLinkClass = (path, isMobile = false) => {
        const isActive = location.pathname === path;
        
        // Base classes
        let classes = 'rounded transition-colors font-bold text-sm ';
        
        if (isMobile) {
            // Mobile: Block level links
            classes += 'block px-4 py-3 ';
            classes += isActive ? 'bg-indigo-700 text-white' : 'text-indigo-200 hover:bg-indigo-800 hover:text-white';
        } else {
            // Desktop: Inline chips
            classes += 'px-3 py-2 ';
            classes += isActive ? 'bg-indigo-900 text-white shadow-inner' : 'hover:bg-indigo-600 hover:text-white text-indigo-100';
        }
        return classes;
    };

    return (
        <div className="bg-slate-50 min-h-screen font-sans">
            
            {/* Top Navigation Bar */}
            <nav className="bg-indigo-800 text-white shadow-lg sticky top-0 z-50 border-b border-indigo-900">
                <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
                     
                     {/* Left: Brand / Title */}
                     <Link to="/greception-dashboard" className="flex items-center gap-3 group shrink-0">
                         <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-xl shadow-md group-hover:rotate-12 transition-transform text-indigo-800">
                             🌍
                         </div>
                         <div className="flex flex-col">
                             <span className="font-extrabold text-lg leading-tight tracking-wide">MEDLIPI GLOBAL</span>
                             <span className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider">Central Desk</span>
                         </div>
                    </Link>

                    {/* Center: Desktop Main Links */}
                    <div className="hidden md:flex gap-1 items-center bg-indigo-700/50 p-1 rounded-lg border border-indigo-600/30">
                        <Link to="/greception-dashboard" className={getLinkClass('/greception-dashboard')}>Queue Board</Link>
                        <Link to="/greception/walk-in" className={getLinkClass('/greception/walk-in')}>+ New Entry</Link>
                        <Link to="/greception/sessions" className={getLinkClass('/greception/sessions')}>Schedules</Link>
                    </div>

                    {/* Right: User Profile & Logout (Desktop) */}
                    <div className="hidden md:flex gap-4 items-center">
                        <div className="text-right">
                            <div className="text-xs text-indigo-300 uppercase font-bold tracking-wider">Operator</div>
                            <div className="text-sm font-bold truncate max-w-[150px]">{doctor?.full_name || doctor?.name}</div>
                        </div>
                        
                        <div className="h-8 w-px bg-indigo-600/50 mx-1"></div>
                        
                        <button 
                            onClick={logout} 
                            className="bg-indigo-900 hover:bg-red-600 px-4 py-2 rounded-lg transition-colors border border-indigo-600 text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-2"
                        >
                            <span>Exit</span>
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        </button>
                    </div>

                    {/* Mobile Menu Toggle Button */}
                    <div className="md:hidden flex items-center">
                        <button 
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="p-2 rounded-md text-indigo-200 hover:text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white transition-colors"
                        >
                            <span className="sr-only">Open menu</span>
                            {/* Hamburger Icon vs Close Icon */}
                            {isMenuOpen ? (
                                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            ) : (
                                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>

                {/* Mobile Dropdown Menu */}
                {isMenuOpen && (
                    <div className="md:hidden bg-indigo-900 border-b border-indigo-800 animate-in slide-in-from-top-2 duration-200">
                        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                            <Link to="/greception-dashboard" onClick={() => setIsMenuOpen(false)} className={getLinkClass('/greception-dashboard', true)}>
                                📋 Queue Board
                            </Link>
                            <Link to="/greception/walk-in" onClick={() => setIsMenuOpen(false)} className={getLinkClass('/greception/walk-in', true)}>
                                ✨ + New Walk-in
                            </Link>
                            <Link to="/greception/sessions" onClick={() => setIsMenuOpen(false)} className={getLinkClass('/greception/sessions', true)}>
                                📅 Schedules
                            </Link>
                        </div>
                        
                        <div className="pt-4 pb-4 border-t border-indigo-800">
                            <div className="flex items-center px-5 mb-3">
                                <div className="shrink-0">
                                    <div className="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold border border-indigo-400">
                                        {(doctor?.full_name || 'U').charAt(0)}
                                    </div>
                                </div>
                                <div className="ml-3">
                                    <div className="text-base font-medium leading-none text-white">{doctor?.full_name}</div>
                                    <div className="text-sm font-medium leading-none text-indigo-300 mt-1">Operator ID: #{doctor?.id}</div>
                                </div>
                            </div>
                            <div className="px-2">
                                <button 
                                    onClick={logout}
                                    className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-red-300 hover:text-white hover:bg-red-800 transition-colors"
                                >
                                    🚪 Sign Out
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </nav>

            {/* Content Injection */}
            <main className="p-4 md:p-8 max-w-[1600px] mx-auto min-h-[calc(100vh-64px)]">
                <Outlet />
            </main>
        </div>
    );
}

export default GlobalReceptionLayout;