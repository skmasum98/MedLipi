import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router'; // Updated to 'react-router' as per your version
import { AuthProvider, useAuth } from './hooks/useAuth'; 
import ProtectedRoute from './components/ProtectedRoute'; 

// Layouts
import PublicLayout from './layouts/PublicLayout';
import DoctorLayout from './layouts/DoctorLayout';
import ReceptionLayout from './layouts/ReceptionLayout';
import AssistantLayout from './layouts/AssistantLayout';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import FindDoctors from './pages/FindDoctors';
import PatientLogin from './pages/PatientLogin';
import PatientRegister from './pages/PatientRegister';
import PatientDashboard from './pages/PatientDashboard';
import PublicDownload from './pages/PublicDownload';

// Role Dashboards & Pages
import DashboardDoctor from './pages/DashboardDoctor'; // (Or the generic switcher if you kept it)
import DashboardReception from './pages/dashboards/DashboardReception';
import DashboardAssistant from './pages/dashboards/DashboardAssistant';
import PrescriptionForm from './pages/PrescriptionForm';
import Inventory from './pages/Inventory';
import Patients from './pages/Patients';
import Appointments from './pages/Appointments';
import SessionManager from './pages/SessionManager';
import Settings from './pages/Settings';

import PatientRecord from './pages/PatientRecord';

import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import StaffManager from './pages/admin/StaffManager';
import StaffLogin from './pages/staff/StaffLogin';
import SessionCalendar from './pages/staff/SessionCalendar';
import WalkInEntry from './pages/WalkInEntry';
import ReceptionAppointments from './pages/staff/ReceptionAppointments';
import DashboardGlobalReception from './pages/dashboards/DashboardGlobalReception';
import GlobalReceptionLayout from './layouts/GlobalReceptionLayout';
import GlobalStaffLogin from './pages/global_reception/GlobalStaffLogin';
import GlobalSessionManager from './pages/global_reception/GlobalSessionManager';
import GlobalWalkIn from './pages/global_reception/GlobalWalkIn';


function App() {
    return (
        <Router>
            <AuthProvider>
                <Routes>

                    {/* === 1. PUBLIC ROUTES (Wrapped in PublicLayout) === */}
                    <Route element={<PublicLayout />}>
                        <Route path="/" element={<Home />} />
                        <Route path="/login" element={<Login />} /> 
                        <Route path="/register" element={<Register />} />
                        <Route path="/find-doctors" element={<FindDoctors />} />
                        
                        {/* Patient Portal Pages can share PublicLayout (Header) */}
                        <Route path="/patient/login" element={<PatientLogin />} />
                        <Route path="/patient/register" element={<PatientRegister />} />
                        <Route path="/my-health" element={<PatientDashboard />} />
                    </Route>

                    {/* === 2. DOCTOR ROUTES (Blue Header) === */}
                    <Route element={<ProtectedRoute allowedRoles={['doctor']}><DoctorLayout /></ProtectedRoute>}>
                        <Route path="/dashboard" element={<DashboardDoctor />} />
                        <Route path="/prescription/new" element={<PrescriptionForm />} />
                        <Route path="/inventory" element={<Inventory />} />
                        <Route path="/profile" element={<Settings />} />
                        <Route path="/patients" element={<Patients />} />
                        <Route path="/patients/:id" element={<PatientRecord />} />
                        <Route path="/appointments" element={<Appointments />} />
                        <Route path="/session" element={<SessionManager />} />
                        <Route path="/staff-manager" element={<StaffManager />} />
                    </Route>

                    {/* === 3. RECEPTION ROUTES (Purple Header) === */}
                    <Route path='staff/login' element={<StaffLogin />} />
                    <Route element={<ProtectedRoute allowedRoles={['receptionist']}><ReceptionLayout /></ProtectedRoute>}>
                        <Route path="/reception-dashboard" element={<DashboardReception />} />
                        <Route path="/reception/schedule" element={<ReceptionAppointments />} /> {/* Shared Component */}
                        <Route path="/reception/patients" element={<Patients />} /> {/* Shared Component */}
                        <Route path="/reception/sessions" element={<SessionCalendar />} />
                        <Route path="/reception/walk-in" element={<WalkInEntry />} /> 
                        <Route path='/reception/manage-session' element={<SessionManager />} /> {/* Shared Component */}
                    </Route>

                    {/* === 4. ASSISTANT ROUTES (Teal Header) === */}
                    <Route element={<ProtectedRoute allowedRoles={['assistant']}><AssistantLayout /></ProtectedRoute>}>
                        <Route path="/assistant-dashboard" element={<DashboardAssistant />} />
                        <Route path="/assistant/vitals" element={<PrescriptionForm />} /> {/* Shared Component in 'Vitals' mode */}
                    </Route>

                    {/* === 5. ADMIN ROUTES (Standalone) === */}
                    <Route path="/admin/login" element={<AdminLogin />} />
                    <Route path="/admin/dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
                    

                    {/* GLOBAL STAFF LOGIN ROUTE */}
                    <Route path="/global/login" element={<GlobalStaffLogin />} />
                    <Route element={<ProtectedRoute allowedRoles={['global_receptionist']}><GlobalReceptionLayout /></ProtectedRoute>}>
                        <Route path="/greception-dashboard" element={<DashboardGlobalReception />} />
                         <Route path="/greception/sessions" element={<GlobalSessionManager />} />
                        <Route path="/greception/walk-in" element={<GlobalWalkIn />} />
                        <Route path="/greception/schedule" element={<Appointments />} />
                    </Route>



                    {/* === 6. NO LAYOUT ROUTES === */}
                    <Route path="/p/:uid" element={<PublicDownload />} /> 
                    
                    {/* Fallback */}
                    <Route path="*" element={<HomeRedirect />} />

                </Routes>
            </AuthProvider>
        </Router>
    );
}

// Redirect Helper
function HomeRedirect() {
    const { isAuthenticated, isLoading, doctor } = useAuth();
    if (isLoading) return <div className="h-screen flex items-center justify-center text-gray-500">Loading...</div>; 
    
    if (isAuthenticated) {
        if (doctor?.role === 'super_admin') return <Navigate to="/admin/dashboard" replace />;
        if (doctor?.role === 'receptionist') return <Navigate to="/reception-dashboard" replace />;
        if (doctor?.role === 'assistant') return <Navigate to="/assistant-dashboard" replace />;
        return <Navigate to="/dashboard" replace />; // Default Doctor
    }
    return <Navigate to="/" replace />;
}

export default App;