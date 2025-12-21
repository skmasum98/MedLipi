import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router';
import { useAuth } from '../hooks/useAuth';

function ReceptionLayout() {
    const { logout, doctor } = useAuth();
    const location = useLocation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Active Link Helper
    const getLinkClass = (path, isMobile = false) => {
        const isActive = location.pathname === path;
        
        if (isMobile) {
            return `block px-4 py-3 text-base font-bold rounded-lg transition ${isActive ? 'bg-purple-900 text-white shadow-inner' : 'text-purple-100 hover:bg-purple-800 hover:text-white'}`;
        }
        return `px-3 py-2 text-sm font-semibold rounded-lg transition-all ${isActive ? 'bg-purple-900 text-white shadow-inner border border-purple-500/30' : 'text-purple-100 hover:bg-purple-600 hover:text-white hover:shadow-sm'}`;
    };

    return (
        <div className="bg-gray-50 min-h-screen font-sans">
            
            {/* Top Navbar */}
            <nav className="bg-purple-800 text-white shadow-xl sticky top-0 z-50 border-b border-purple-900">
                <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        
                        {/* Logo & Brand */}
                        <div className="shrink-0 flex items-center">
                            <Link to="/reception-dashboard" className="flex items-center gap-2 group" onClick={() => setIsMenuOpen(false)}>
                                <span className="text-3xl bg-white w-10 h-10 rounded-lg flex items-center justify-center shadow-md border-2 border-purple-300 group-hover:scale-105 transition-transform">
                                    🏥
                                </span>
                                <div className="leading-none ml-1 hidden sm:block">
                                    <span className="font-extrabold text-lg block tracking-wide text-white group-hover:text-purple-200 transition">Reception</span>
                                    <span className="text-[10px] font-bold text-purple-300 uppercase tracking-widest">Desk & Triage</span>
                                </div>
                            </Link>
                        </div>

                        {/* Desktop Menu */}
                        <div className="hidden md:flex items-center space-x-1 ml-4 bg-purple-700/40 p-1 rounded-xl border border-purple-500/20 backdrop-blur-sm">
                            <Link to="/reception-dashboard" className={getLinkClass('/reception-dashboard')}>Live Queue</Link>
                            <Link to="/reception/walk-in" className={getLinkClass('/reception/walk-in')}>+ New Entry</Link>
                            <Link to="/reception/sessions" className={getLinkClass('/reception/sessions')}>Planner</Link>
                            <Link to="/reception/schedule" className={getLinkClass('/reception/schedule')}>Schedule List</Link>
                        </div>

                        {/* Right: User & Logout */}
                        <div className="hidden md:flex items-center gap-4">
                            <div className="text-right">
                                <span className="block text-[10px] text-purple-300 font-bold uppercase tracking-wider">Logged In As</span>
                                <span className="text-sm font-bold truncate max-w-[150px] block text-white">{doctor?.full_name}</span>
                            </div>
                            
                            <div className="h-8 w-px bg-purple-600/50"></div>
                            
                            <button 
                                onClick={logout} 
                                className="bg-purple-900 hover:bg-red-600 border border-purple-600 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all shadow-md flex items-center gap-2 group"
                            >
                                <span>Logout</span>
                                <svg className="w-4 h-4 text-purple-300 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                            </button>
                        </div>

                        {/* Mobile Menu Toggle */}
                        <div className="flex md:hidden">
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="bg-purple-700 p-2 rounded-lg text-purple-100 hover:text-white hover:bg-purple-600 focus:outline-none transition shadow-sm border border-purple-600"
                            >
                                <span className="sr-only">Open menu</span>
                                {isMenuOpen ? (
                                    <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                ) : (
                                    <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Dropdown (Animated) */}
                <div className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${isMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>
                    <div className="bg-purple-800 border-t border-purple-600 shadow-inner px-2 pt-2 pb-4 space-y-1">
                        <Link to="/reception-dashboard" onClick={() => setIsMenuOpen(false)} className={getLinkClass('/reception-dashboard', true)}>Queue Board</Link>
                        <Link to="/reception/walk-in" onClick={() => setIsMenuOpen(false)} className={getLinkClass('/reception/walk-in', true)}>+ Register Walk-in</Link>
                        <Link to="/reception/sessions" onClick={() => setIsMenuOpen(false)} className={getLinkClass('/reception/sessions', true)}>Session Planner</Link>
                        <Link to="/reception/schedule" onClick={() => setIsMenuOpen(false)} className={getLinkClass('/reception/schedule', true)}>Schedule List</Link>
                        
                        <div className="mt-4 pt-4 border-t border-purple-700 px-2 flex justify-between items-center">
                            <span className="text-sm font-bold text-purple-200">{doctor?.full_name}</span>
                            <button 
                                onClick={logout}
                                className="text-red-300 hover:text-white text-sm font-bold px-3 py-1 rounded hover:bg-red-800/50 transition"
                            >
                                Sign Out &rarr;
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Content Injection */}
            <main className="p-1 md:p-4 max-w-[1600px] mx-auto min-h-[calc(100vh-64px)] animate-fade-in">
                <Outlet />
            </main>
        </div>
    );
}

export default ReceptionLayout;