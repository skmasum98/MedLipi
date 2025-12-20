import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';

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
    
    // Data State
    const [stats, setStats] = useState({});
    const [doctors, setDoctors] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    
    // UI State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [viewingDoctor, setViewingDoctor] = useState(null);
    const [docDetails, setDocDetails] = useState(null);

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
        <div className="flex h-screen bg-gray-900 text-gray-100 font-sans">
            <AdminSidebar currentView={view} setView={setView} onLogout={logout} />

            <div className="flex-1 p-8 overflow-auto">
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