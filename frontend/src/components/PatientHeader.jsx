import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';

function PatientHeader() {
    const navigate = useNavigate();
    const location = useLocation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    
    // Check Patient Auth status directly from storage
    const token = localStorage.getItem('patientToken');
    const patientName = localStorage.getItem('patientName');

    const handleLogout = () => {
        localStorage.removeItem('patientToken');
        localStorage.removeItem('patientName');
        navigate('/patient/login');
        setIsMenuOpen(false);
    };

    // Helper for active link styling
    const getLinkClass = (path) => {
        const isActive = location.pathname === path;
        return `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            isActive ? 'bg-green-100 text-green-800' : 'text-gray-600 hover:text-green-600 hover:bg-green-50'
        }`;
    };

    return (
        <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    
                    {/* Logo */}
                    <div className="flex items-center">
                        <Link to="/" className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">M</div>
                            <span className="font-extrabold text-xl text-gray-800 tracking-tight">MedLipi</span>
                        </Link>
                    </div>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center space-x-4">
                        <Link to="/" className={getLinkClass('/')}>Home</Link>
                        <Link to="/find-doctors" className={getLinkClass('/find-doctors')}>Find Doctors</Link>
                        
                        {token ? (
                            <>
                                <Link to="/my-health" className={getLinkClass('/my-health')}>My Dashboard</Link>
                                <div className="h-6 w-px bg-gray-300 mx-2"></div>
                                <span className="text-sm text-gray-500 font-medium">Hi, {patientName?.split(' ')[0]}</span>
                                <button 
                                    onClick={handleLogout} 
                                    className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-50 hover:text-red-600 transition"
                                >
                                    Logout
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="h-6 w-px bg-gray-300 mx-2"></div>
                                <Link to="/dashboard" className="text-gray-500 hover:text-indigo-600 text-sm font-medium">Doctor Login</Link>
                                <Link to="/patient/login" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition">
                                    Patient Portal
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="flex items-center md:hidden">
                        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-gray-500 hover:text-gray-700 p-2">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                {isMenuOpen ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                )}
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Dropdown */}
            {isMenuOpen && (
                <div className="md:hidden bg-white border-t border-gray-100 py-2">
                    <div className="px-2 space-y-1">
                        <Link to="/" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50">Home</Link>
                        <Link to="/find-doctors" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50">Find Doctors</Link>
                        
                        {token ? (
                            <>
                                <Link to="/my-health" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-green-700 bg-green-50">My Dashboard</Link>
                                <button onClick={handleLogout} className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50">Logout</button>
                            </>
                        ) : (
                            <>
                                <div className="border-t border-gray-100 my-2"></div>
                                <Link to="/patient/login" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-green-700">Patient Login</Link>
                                <Link to="/dashboard" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-500">Doctor Login</Link>
                            </>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
}

export default PatientHeader;