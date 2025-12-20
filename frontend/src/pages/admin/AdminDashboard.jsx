import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Menu, X } from 'lucide-react'; // Import icons for mobile menu

// Components
import AdminSidebar from './components/AdminSidebar';
import StatsOverview from './components/StatsOverview';
import DoctorsList from './components/DoctorsList';
import AdminAnalytics from './components/AdminAnalytics';
import CreateDoctorModal from './components/CreateDoctorModal';
import DoctorDetailsModal from './components/DoctorDetailsModal';
import SystemMaintenance from './components/SystemMaintenance';
import GlobalStaffManager from './components/GlobalStaffManager';

const VITE_API_URL = import.meta.env.VITE_API_URL;

function AdminDashboard() {
    const { token, logout } = useAuth();
    const [view, setView] = useState('doctors'); // 'doctors' | 'reports'
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    
    // Data State
    const [stats, setStats] = useState({});
    const [doctors, setDoctors] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    
    // UI State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [viewingDoctor, setViewingDoctor] = useState(null);
    const [docDetails, setDocDetails] = useState(null);

    // Close sidebar when view changes on mobile
    useEffect(() => {
        if (window.innerWidth < 768) {
            setIsSidebarOpen(false);
        }
    }, [view]);

    // Handle window resize
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768) {
                setIsSidebarOpen(true);
            } else {
                setIsSidebarOpen(false);
            }
        };

        handleResize(); // Initial check
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // --- 1. Load Initial Data ---
    const loadAllData = async () => {
        if(!token) return;
        try {
            // Parallel Fetch
            const [statRes, docRes, analRes] = await Promise.all([
                fetch(`${VITE_API_URL}/admin/stats`, { headers: { 'Authorization': `Bearer ${token}` }}),
                fetch(`${VITE_API_URL}/admin/doctors`, { headers: { 'Authorization': `Bearer ${token}` }}),
                fetch(`${VITE_API_URL}/admin/analytics`, { headers: { 'Authorization': `Bearer ${token}` }})
            ]);
            
            if(statRes.ok) setStats(await statRes.json());
            if(docRes.ok) setDoctors(await docRes.json());
            if(analRes.ok) setAnalytics(await analRes.json());
            
        } catch(e) { console.error("Admin Load Error", e); }
    };

    useEffect(() => { loadAllData(); }, [token]);

    // --- 2. Action Handlers ---
    
    const handleCreateDoctor = async (data) => {
        try {
            const res = await fetch(`${VITE_API_URL}/admin/doctors`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                alert("Success");
                setIsCreateOpen(false);
                loadAllData();
            } else {
                const err = await res.json();
                alert(err.message);
            }
        } catch(e) { alert("Error"); }
    };

    const toggleDoctorStatus = async (id, currentStatus) => {
        const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
        await fetch(`${VITE_API_URL}/admin/doctors/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ status: newStatus })
        });
        loadAllData(); // Refresh list
    };

    const handleDeleteDoctor = async (id) => {
        if (!confirm("⚠️ Confirm Delete? This cannot be undone.")) return;
        const res = await fetch(`${VITE_API_URL}/admin/doctors/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if(res.ok) { alert('Deleted'); loadAllData(); } 
        else alert('Delete failed. Likely has associated data.');
    };

    const handleViewDetails = async (doc) => {
        setViewingDoctor(doc);
        setDocDetails(null); 
        try {
            const res = await fetch(`${VITE_API_URL}/admin/doctors/${doc.doctor_id}/details`, { headers: { 'Authorization': `Bearer ${token}` }});
            if (res.ok) setDocDetails(await res.json());
        } catch(e){}
    };

    return (
        <div className="flex flex-col md:flex-row min-h-screen bg-gray-900 text-gray-100 font-sans">
            {/* Mobile Header */}
            <div className="md:hidden flex items-center justify-between p-4 bg-gray-900 border-b border-gray-800">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
                    >
                        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                    <h1 className="text-xl font-bold text-white">MedLipi Admin</h1>
                </div>
                <button 
                    onClick={logout}
                    className="text-sm font-medium bg-gray-800 px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
                >
                    Sign Out
                </button>
            </div>

            {/* Sidebar with mobile overlay */}
            <div className={`
                fixed inset-0 z-40 md:static md:z-auto
                transition-transform duration-300 ease-in-out
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                md:flex md:w-64
            `}>
                <AdminSidebar 
                    currentView={view} 
                    setView={setView} 
                    onLogout={logout}
                    isMobile={true}
                />
                {/* Overlay for mobile */}
                {isSidebarOpen && (
                    <div 
                        className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}
            </div>

            {/* Main Content */}
            <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
                <StatsOverview stats={stats} />

                {view === 'doctors' && (
                    <DoctorsList 
                        doctors={doctors}
                        onToggleStatus={toggleDoctorStatus}
                        onDelete={handleDeleteDoctor}
                        onViewDetails={handleViewDetails}
                        onOpenCreate={() => setIsCreateOpen(true)}
                    />
                )}

                {view === 'staff' && (
                    <GlobalStaffManager token={token} />
                )}

                {view === 'reports' && (
                    <AdminAnalytics analytics={analytics} />
                )}

                {view === 'db' && analytics && (
                    <SystemMaintenance analytics={analytics} token={token} />
                )}
                

                {/* Modals */}
                <CreateDoctorModal 
                    isOpen={isCreateOpen} 
                    onClose={() => setIsCreateOpen(false)} 
                    onSubmit={handleCreateDoctor} 
                />
                
                <DoctorDetailsModal 
                    isOpen={!!viewingDoctor} 
                    onClose={() => setViewingDoctor(null)} 
                    doctor={viewingDoctor} 
                    details={docDetails} 
                />
            </div>
        </div>
    );
}

export default AdminDashboard;