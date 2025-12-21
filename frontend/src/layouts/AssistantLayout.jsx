import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router'; 
import { useAuth } from '../hooks/useAuth';

function AssistantLayout() {
    const { logout, doctor } = useAuth(); 
    const location = useLocation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Link styling helper
    const getLinkClass = (path, isMobile = false) => {
        const isActive = location.pathname === path;
        
        let baseClass = "rounded-lg transition-all font-semibold ";
        if (isMobile) {
            return baseClass + "block px-4 py-3 text-base " + (isActive ? "bg-teal-800 text-white shadow-inner" : "text-teal-100 hover:bg-teal-600 hover:text-white");
        }
        return baseClass + "px-4 py-2 text-sm " + (isActive ? "bg-teal-900 text-white shadow-md border border-teal-500/50" : "text-teal-50 hover:bg-teal-600 hover:text-white hover:shadow-sm");
    };

    return (
        <div className="bg-slate-50 min-h-screen font-sans">
            
            {/* --- NAVBAR --- */}
            <nav className="bg-teal-700 text-white shadow-lg sticky top-0 z-50 border-b border-teal-800">
                <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        
                        {/* Logo / Branding */}
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-white text-teal-700 rounded-xl flex items-center justify-center text-xl shadow-md border border-teal-200">
                                🩺
                            </div>
                            <div className="leading-tight">
                                <h1 className="text-lg font-extrabold tracking-wide">ASSISTANT</h1>
                                <span className="text-[10px] uppercase font-bold text-teal-300 tracking-wider block">Clinical Ops</span>
                            </div>
                        </div>

                        {/* Desktop Menu */}
                        <div className="hidden md:flex items-center gap-1 bg-teal-600/30 p-1 rounded-xl border border-teal-500/30">
                            <Link to="/assistant-dashboard" className={getLinkClass('/assistant-dashboard')}>Waiting Queue</Link>
                            {/* You can add more links here if needed later (e.g. Past Records search) */}
                        </div>

                        {/* Desktop Right Side */}
                        <div className="hidden md:flex items-center gap-5">
                            <div className="text-right">
                                <p className="text-xs text-teal-300 font-bold uppercase tracking-wider">Logged In As</p>
                                <p className="text-sm font-bold truncate max-w-[120px]">{doctor?.full_name}</p>
                            </div>
                            
                            <div className="h-8 w-px bg-teal-500/50"></div>

                            <button 
                                onClick={logout} 
                                className="bg-teal-800 hover:bg-red-600 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow-sm border border-teal-600 flex items-center gap-2"
                            >
                                <span>Exit</span>
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                            </button>
                        </div>

                        {/* Mobile Toggle Button */}
                        <div className="flex md:hidden">
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="bg-teal-800 p-2 rounded-lg text-teal-100 hover:text-white hover:bg-teal-600 focus:outline-none transition-colors shadow-sm"
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

                {/* Mobile Dropdown */}
                {isMenuOpen && (
                    <div className="md:hidden bg-teal-800 border-t border-teal-600 animate-in slide-in-from-top-2">
                        <div className="px-2 pt-3 pb-3 space-y-2">
                            <Link to="/assistant-dashboard" onClick={() => setIsMenuOpen(false)} className={getLinkClass('/assistant-dashboard', true)}>
                                📋 Waiting List
                            </Link>
                        </div>
                        <div className="pt-4 pb-4 border-t border-teal-700 bg-teal-900/50">
                            <div className="flex items-center px-5 mb-4">
                                <div className="shrink-0">
                                    <div className="h-9 w-9 rounded-full bg-teal-500 flex items-center justify-center text-white font-bold text-lg shadow-sm border-2 border-teal-300">
                                        {(doctor?.full_name || 'U').charAt(0)}
                                    </div>
                                </div>
                                <div className="ml-3">
                                    <div className="text-base font-bold text-white">{doctor?.full_name}</div>
                                    <div className="text-xs font-medium text-teal-300">Clinical Assistant</div>
                                </div>
                            </div>
                            <div className="px-3">
                                <button 
                                    onClick={logout}
                                    className="w-full text-center block px-3 py-3 rounded-lg text-base font-bold text-red-200 bg-red-900/30 border border-red-900/50 hover:bg-red-800 hover:text-white transition-all"
                                >
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </nav>

            {/* --- CONTENT AREA --- */}
            <main className="p-4 md:p-8 max-w-[1600px] mx-auto min-h-[calc(100vh-64px)]">
                <Outlet />
            </main>
            {/* Back to waiting list */}
            <div>
                <Link to="/assistant-dashboard" className=" bottom-2 right-2 bg-teal-700 hover:bg-teal-800 text-white px-4 py-3 rounded-full shadow-lg border border-teal-600 flex items-center gap-2 transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    <span className="font-semibold">Back to Waiting List</span>
                </Link>
            </div>
        </div>
    );
}

export default AssistantLayout;