import React, { useState } from 'react';
import { Link, useLocation } from 'react-router'; 
import { useAuth } from '../hooks/useAuth';

function Header() {
    const { isAuthenticated, logout, doctor } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const location = useLocation();
    
    // Determine user display name
    const doctorName = doctor?.full_name ? `Dr. ${doctor.full_name.split(' ')[0]}` : 'Dashboard';

    // Helper function to check active state for styling
    const isActive = (path) => location.pathname === path;

    // Desktop Link Classes
    const navLinkClass = (path) => `
        px-3 py-2 rounded-md text-sm font-medium transition-colors
        ${isActive(path) 
            ? 'bg-indigo-800 text-white shadow-sm' 
            : 'text-indigo-100 hover:bg-indigo-600 hover:text-white'}
    `;

    // Mobile Link Classes
    const mobileLinkClass = (path) => `
        block px-3 py-2 rounded-md text-base font-medium
        ${isActive(path) 
            ? 'bg-indigo-800 text-white' 
            : 'text-indigo-100 hover:bg-indigo-600 hover:text-white'}
    `;

    return (
        <header className="sticky top-0 z-50 bg-indigo-700 shadow-lg font-sans">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    
                    {/* --- LEFT: LOGO --- */}
                    <div className="shrink-0 flex items-center">
                        <Link to="/" className="flex items-center gap-2">
                            {/* Improved Logo Sizing: h-10 fits well in h-16 header */}
                            <img 
                                className="h-10 w-auto bg-white rounded p-1 shadow-sm" 
                                src="/logo.png" 
                                alt="MedLipi" 
                                onError={(e) => {e.target.style.display='none'}} // Fallback if image missing
                            />
                            <span className="text-xl font-bold text-white tracking-wider hidden sm:block">MedLipi</span>
                        </Link>
                    </div>

                    {/* --- CENTER/RIGHT: DESKTOP MENU --- */}
                    <div className="hidden md:block">
                        <div className="ml-10 flex items-baseline space-x-4">
                            {!isAuthenticated ? (
                                <>
                                    <Link to="/patient/login" className={navLinkClass('/patient/login')}>Patient Portal</Link>
                                    <div className="h-4 w-px bg-indigo-500 mx-2"></div>
                                    <Link to="/login" className={navLinkClass('/login')}>Doctor Login</Link>
                                    <Link to="/register" className="bg-white text-indigo-700 hover:bg-gray-100 px-4 py-2 rounded-md text-sm font-bold shadow transition-colors">
                                        Get Started
                                    </Link>
                                </>
                            ) : (
                                <>
                                    <Link to="/dashboard" className={navLinkClass('/dashboard')}>Dashboard</Link>
                                    <Link to="/prescription/new" className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-md text-sm font-medium shadow transition-colors">
                                        + New Rx
                                    </Link>
                                    <Link to="/patients" className={navLinkClass('/patients')}>Patients</Link>
                                    <Link to="/inventory" className={navLinkClass('/inventory')}>Drugs DB</Link>
                                    <Link to="/appointments" className={navLinkClass('/appointments')}>Appointments</Link>
                                    
                                    <div className="ml-4 flex items-center gap-3">
                                        <Link to="/profile" className="flex items-center gap-2 text-white hover:text-indigo-200">
                                            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center border border-indigo-400 text-xs font-bold">
                                                {doctor?.full_name ? doctor.full_name[0] : 'D'}
                                            </div>
                                            <span className="text-sm font-medium">{doctorName}</span>
                                        </Link>
                                        <button 
                                            onClick={logout} 
                                            className="text-red-200 hover:text-white hover:bg-red-600 px-3 py-1 rounded-md text-sm transition-colors border border-transparent hover:border-red-500"
                                        >
                                            Logout
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* --- RIGHT: MOBILE MENU BUTTON --- */}
                    <div className="-mr-2 flex md:hidden">
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            type="button"
                            className="bg-indigo-700 inline-flex items-center justify-center p-2 rounded-md text-indigo-200 hover:text-white hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-indigo-700 focus:ring-white"
                            aria-controls="mobile-menu"
                            aria-expanded="false"
                        >
                            <span className="sr-only">Open main menu</span>
                            {/* Menu Icon (Hamburger / Close) */}
                            {!isMenuOpen ? (
                                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            ) : (
                                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* --- MOBILE MENU DROPDOWN --- */}
            {isMenuOpen && (
                <div className="md:hidden" id="mobile-menu">
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-indigo-600">
                        {!isAuthenticated ? (
                            <>
                                <Link to="/patient/login" onClick={() => setIsMenuOpen(false)} className={mobileLinkClass('/patient/login')}>Patient Portal</Link>
                                <Link to="/login" onClick={() => setIsMenuOpen(false)} className={mobileLinkClass('/login')}>Doctor Login</Link>
                                <Link to="/register" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium bg-white text-indigo-700 mt-2">
                                    Register
                                </Link>
                            </>
                        ) : (
                            <>
                                <div className="px-3 py-2 text-indigo-200 text-xs uppercase font-bold tracking-wider">Menu</div>
                                <Link to="/dashboard" onClick={() => setIsMenuOpen(false)} className={mobileLinkClass('/dashboard')}>Dashboard</Link>
                                <Link to="/prescription/new" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-white bg-green-600 hover:bg-green-700">
                                    + New Prescription
                                </Link>
                                <Link to="/patients" onClick={() => setIsMenuOpen(false)} className={mobileLinkClass('/patients')}>Patients</Link>
                                <Link to="/inventory" onClick={() => setIsMenuOpen(false)} className={mobileLinkClass('/inventory')}>Drugs Database</Link>
                                <Link to="/appointments" onClick={() => setIsMenuOpen(false)} className={mobileLinkClass('/appointments')}>Appointments</Link>
                                
                                <div className="border-t border-indigo-600 my-2 pt-2">
                                    <div className="flex items-center px-3 mb-3">
                                        <div className="shrink-0">
                                            <div className="h-10 w-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold border border-indigo-300">
                                                {doctor?.full_name ? doctor.full_name[0] : 'D'}
                                            </div>
                                        </div>
                                        <div className="ml-3">
                                            <div className="text-base font-medium leading-none text-white">{doctor?.full_name}</div>
                                            <div className="text-sm font-medium leading-none text-indigo-300 mt-1">{doctor?.email}</div>
                                        </div>
                                    </div>
                                    <Link to="/profile" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-indigo-100 hover:text-white hover:bg-indigo-600">
                                        Clinic Settings
                                    </Link>
                                    <button 
                                        onClick={() => { setIsMenuOpen(false); logout(); }}
                                        className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-200 hover:text-white hover:bg-red-600"
                                    >
                                        Logout
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
}

export default Header;