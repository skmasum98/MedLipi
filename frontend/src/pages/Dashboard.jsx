import React from 'react';
import { useAuth } from '../hooks/useAuth';

// Import Role Dashboards
import DashboardDoctor from './DashboardDoctor';
import DashboardReception from './dashboards/DashboardReception';
// import DashboardAssistant from './dashboards/DashboardAssistant';
import AdminDashboard from './admin/AdminDashboard'; // If admin logs in here

function Dashboard() {
    const { doctor } = useAuth(); // 'doctor' holds user info including role

    if (!doctor) return <div>Loading role...</div>;

    switch (doctor.role) {
        case 'super_admin':
            return <AdminDashboard />;
        case 'receptionist':
            return <DashboardReception />;
        // case 'assistant':
        //     return <DashboardAssistant />;
        case 'doctor':
        default:
            // Default to Doctor Dashboard (most features)
            return <DashboardDoctor />;
    }
}

export default Dashboard;