import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router'; 
import { useAuth } from '../hooks/useAuth';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const VITE_API_URL = import.meta.env.VITE_API_URL;

function DashboardDoctor() {
    const { doctor, token } = useAuth();
    const navigate = useNavigate();
    
    // States
    const [recentVisits, setRecentVisits] = useState([]);
    const [todaysQueue, setTodaysQueue] = useState([]); // <--- NEW STATE
    const [summary, setSummary] = useState({ total_prescriptions: 0, today_prescriptions: 0, total_unique_patients: 0 });
    const [activityData, setActivityData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadDashboardData = async () => {
            if (!token) return;

            try {
                // 1. Fetch Recent Prescriptions
                const recentRes = await fetch(`${VITE_API_URL}/prescriptions/recent`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (recentRes.ok) setRecentVisits(await recentRes.json());

                // 2. Fetch TODAY'S Appointments (Queue)
                // Get local YYYY-MM-DD
                const todayStr = new Date().toLocaleDateString('en-CA'); 
                const queueRes = await fetch(`${VITE_API_URL}/appointments?date=${todayStr}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (queueRes.ok) setTodaysQueue(await queueRes.json());


                // 3. Fetch Summary Stats
                const summaryRes = await fetch(`${VITE_API_URL}/analytics/summary`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (summaryRes.ok) setSummary(await summaryRes.json());

                // 4. Fetch Activity Graph
                const activityRes = await fetch(`${VITE_API_URL}/analytics/activity`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (activityRes.ok) setActivityData(await activityRes.json());

            } catch (error) {
                console.error('Error loading dashboard:', error);
            } finally {
                setLoading(false);
            }
        };
        loadDashboardData();
    }, [token, VITE_API_URL]);

    // --- NEW HANDLER: Start Visit from Queue ---
    const handleStartVisit = (appointment) => {
        // Navigate to Prescription Form with Patient Data pre-filled
        navigate('/prescription/new', { 
            state: { 
                patientData: appointment, // Pass the patient object
                queueMode: true 
            } 
        });
    };

    return (
        <div className="min-w-0 min-h-0 isolate">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-gray-50 min-h-screen">
                
                {/* Header */}
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Overview</h1>
                        <p className="mt-1 text-sm text-gray-500">Welcome back, Dr. {doctor?.full_name?.split(' ')[0]}</p>
                    </div>
                    <Link to="/prescription/new" className="bg-indigo-600 text-white px-5 py-2 rounded-lg shadow hover:bg-indigo-700 transition font-medium">
                        + New Prescription
                    </Link>
                </div>

                {/* 1. Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                        <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide">Today's Patients</p>
                        <h3 className="text-3xl font-extrabold text-gray-900 mt-2">{summary.today_prescriptions}</h3>
                    </div>
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                        <p className="text-xs font-semibold text-green-500 uppercase tracking-wide">Total Prescriptions</p>
                        <h3 className="text-3xl font-extrabold text-gray-900 mt-2">{summary.total_prescriptions}</h3>
                    </div>
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                        <p className="text-xs font-semibold text-purple-500 uppercase tracking-wide">Unique Patients</p>
                        <h3 className="text-3xl font-extrabold text-gray-900 mt-2">{summary.total_unique_patients}</h3>
                    </div>
                </div>

                {/* 2. Analytics & Lists */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* LEFT COLUMN: Chart */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Activity Chart */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-w-0">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">Patient Activity (Last 7 Days)</h3>
                            <div style={{ width: '100%', height: 300, minWidth: 0 }}>
                                {activityData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                        <BarChart data={activityData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} />
                                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} allowDecimals={false} />
                                            <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}} />
                                            <Bar dataKey="patients" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={40} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-gray-400 text-sm">Not enough data for chart</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Queue & Recent */}
                    <div className="lg:col-span-1 space-y-6">

                        {/* --- NEW SECTION: TODAY'S QUEUE --- */}
                        <div className="bg-white rounded-xl shadow-sm border border-orange-200 overflow-hidden flex flex-col">
                            <div className="px-6 py-4 border-b border-orange-100 bg-orange-50 flex justify-between items-center">
                                <h3 className="text-md font-bold text-orange-900 flex items-center gap-2">
                                    <span className="relative flex h-3 w-3">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                                    </span>
                                    Live Queue
                                </h3>
                                <Link to="/appointments" className="text-xs text-orange-700 hover:underline font-bold">Manage</Link>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto max-h-[300px]">
                                {loading ? (
                                    <p className="p-4 text-center text-gray-500 text-sm">Loading...</p>
                                ) : todaysQueue.filter(a => a.status !== 'Completed').length === 0 ? (
                                    <div className="p-6 text-center text-gray-500 text-sm">
                                        <p>No active patients waiting.</p>
                                    </div>
                                ) : (
                                    <ul className="divide-y divide-gray-100">
                                        {todaysQueue.filter(a => a.status !== 'Completed' && a.status !== 'Cancelled').map((app) => (
                                            <li key={app.appointment_id} className="p-4 hover:bg-orange-50/50 transition">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            {app.serial_number && (
                                                                <span className="bg-orange-200 text-orange-800 text-xs font-bold px-1.5 rounded">#{app.serial_number}</span>
                                                            )}
                                                            <p className="text-sm font-bold text-gray-900">{app.patient_name}</p>
                                                        </div>
                                                        <p className="text-xs text-gray-500 mt-0.5">{app.reason}</p>
                                                    </div>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${app.status === 'Confirmed' || app.status === 'Scheduled' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                        {app.status === 'Pending_Confirmation' ? 'New' : app.status}
                                                    </span>
                                                </div>
                                                
                                                {/* Start Visit Button */}
                                                <button 
                                                    onClick={() => handleStartVisit(app)}
                                                    className="w-full mt-1 bg-white border border-indigo-200 text-indigo-700 text-xs font-bold py-1.5 rounded hover:bg-indigo-50 hover:border-indigo-300 transition-colors flex items-center justify-center gap-1"
                                                >
                                                    Start Consultation &rarr;
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>

                        {/* EXISTING: Recent Visits (History) */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                <h3 className="text-md font-bold text-gray-800">History</h3>
                                <Link to="/patients" className="text-xs text-indigo-600 hover:underline">Directory</Link>
                            </div>
                            <div className="flex-1 overflow-y-auto max-h-[300px]">
                                {recentVisits.map((visit, index) => (
                                    <div key={index} className="p-4 border-b border-gray-50 hover:bg-gray-50 transition last:border-0">
                                        <div className="flex justify-between">
                                            <p className="text-sm font-semibold text-gray-900">{visit.name}</p>
                                            <p className="text-xs text-gray-500">{new Date(visit.visit_date).toLocaleDateString()}</p>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1 truncate w-full">
                                            {visit.diagnosis || 'No diagnosis'}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}

export default DashboardDoctor;