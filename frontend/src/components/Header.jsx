import React from 'react';
import { Link } from 'react-router';
import { useAuth } from '../hooks/useAuth';

function Header() {
    const { isAuthenticated, logout, doctor } = useAuth();
    
    // Determine the user's name to display in the header
    const doctorName = doctor?.full_name ? `Dr. ${doctor.full_name.split(' ')[0]}` : 'Dashboard';

    // Tailwind classes for the navigation links
    const linkClasses = "text-white hover:text-indigo-200 transition-colors px-3 py-2 rounded-md font-medium text-sm";
    
    return (
        // Header container: Fixed position, primary color, shadow
        <header className="sticky top-0 z-10 bg-indigo-700 shadow-lg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo/App Name */}
                    <div className="shrink-0">
                        <Link to="/" className="text-2xl font-extrabold text-white tracking-wider">
                            MedLipi
                        </Link>
                    </div>

                    {/* Navigation Links */}
                    <div className="flex space-x-4">
                        {/* Always visible links (for unauthenticated users) */}
                        {!isAuthenticated && (
                            <>
                                <Link to="/login" className={linkClasses}>Login</Link>
                                <Link to="/register" className={`${linkClasses} bg-indigo-600 hover:bg-indigo-500`}>Register</Link>
                            </>
                        )}

                        {/* Protected Links (for authenticated doctors) */}
                        {isAuthenticated && (
                            <>
                                <Link to="/dashboard" className={linkClasses}>New Prescription</Link>
                                <Link to="/profile" className={linkClasses}>{doctorName}</Link>
                                
                                {/* Logout Button */}
                                <button 
                                    onClick={logout} 
                                    className="text-white bg-red-500 hover:bg-red-600 transition-colors px-3 py-2 rounded-md font-medium text-sm"
                                >
                                    Logout
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}

export default Header;