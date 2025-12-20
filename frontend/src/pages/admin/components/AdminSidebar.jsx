import React from 'react';

const AdminSidebar = ({ currentView, setView, onLogout, isMobile }) => {
    const navItemClass = (viewName) => 
        `w-full text-left px-4 py-2.5 rounded-lg transition-colors font-medium mb-1 ${
            currentView === viewName 
            ? 'bg-indigo-600 text-white shadow-md' 
            : 'text-gray-400 hover:bg-gray-800 hover:text-white'
        }`;

    return (
        <aside className={`
            w-64 md:w-full h-full bg-gray-900 p-6 flex flex-col justify-between 
            border-r border-gray-800 shrink-0 z-40
            ${isMobile ? 'relative' : ''}
        `}>
            {/* Logo - hidden on mobile since it's in header */}
            <div className={isMobile ? 'hidden md:block' : ''}>
                <h1 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center">
                        <span className="text-white text-lg">❖</span>
                    </div>
                    <span>MedLipi</span>
                </h1>
            </div>

            <div className="flex-1 overflow-y-auto">
                <nav className="space-y-2">
                    <div className="px-4 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 mt-6">Overview</div>
                    <button 
                        onClick={() => setView('doctors')} 
                        className={navItemClass('doctors')}
                    >
                        <span className="flex items-center gap-3">
                            <span className="text-lg">👨‍⚕️</span>
                            <span>Doctors Directory</span>
                        </span>
                    </button>

                    <button 
                        onClick={() => setView('staff')} 
                        className={navItemClass('staff')}
                    >
                        <span className="flex items-center gap-3">
                            <span className="text-lg">👥</span>
                            <span>Global Staff Manager</span>
                        </span>
                    </button>
                    
                    <div className="px-4 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 mt-6">Analytics</div>
                    <button 
                        onClick={() => setView('reports')} 
                        className={navItemClass('reports')}
                    >
                        <span className="flex items-center gap-3">
                            <span className="text-lg">📊</span>
                            <span>Platform Reports</span>
                        </span>
                    </button>

                    <div className="px-4 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 mt-6">Maintenance</div>
                    <button 
                        onClick={() => setView('db')} 
                        className={navItemClass('db')}
                    >
                        <span className="flex items-center gap-3">
                            <span className="text-lg">⚙️</span>
                            <span>System Maintenance</span>
                        </span>
                    </button>
                </nav>
            </div>

            {/* Logout button - hidden on mobile since it's in header */}
            <div className={isMobile ? 'hidden md:block' : ''}>
                <button 
                    onClick={onLogout} 
                    className="w-full text-gray-400 hover:text-white flex items-center gap-3 text-sm font-bold bg-gray-800 p-3 rounded-lg hover:bg-red-600 transition-colors"
                >
                    <span>←</span> Sign Out
                </button>
            </div>
        </aside>
    );
};

export default AdminSidebar;