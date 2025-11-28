import React, { useState, useEffect } from 'react';
import { Link } from 'react-router'; 
import { useAuth } from '../hooks/useAuth';
// Import Recharts components (Removed unused LineChart/Line)
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const VITE_API_URL = import.meta.env.VITE_API_URL;

function Dashboard() {
    const { doctor, token } = useAuth();
    
    // States
    const [recentVisits, setRecentVisits] = useState([]);
    const [summary, setSummary] = useState({ total_prescriptions: 0, today_prescriptions: 0, total_unique_patients: 0 });
    const [activityData, setActivityData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadDashboardData = async () => {
            if (!token) return; // Guard clause

            try {
                // Fetch Recent List
                const recentRes = await fetch(`${VITE_API_URL}/prescriptions/recent`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (recentRes.ok) setRecentVisits(await recentRes.json());

                // Fetch Summary Stats
                const summaryRes = await fetch(`${VITE_API_URL}/analytics/summary`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (summaryRes.ok) setSummary(await summaryRes.json());

                // Fetch Activity Graph
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

    return (
        <div className="min-w-0 min-h-0 isolate">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-gray-50 min-h-screen">
                
                {/* Header */}
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            Overview
                        </h1>
                        <p className="mt-1 text-sm text-gray-500">
                            Welcome back, Dr. {doctor?.full_name?.split(' ')[0]}
                        </p>
                    </div>
                    <Link to="/prescription/new" className="bg-indigo-600 text-white px-5 py-2 rounded-lg shadow hover:bg-indigo-700 transition font-medium">
                        + New Prescription
                    </Link>
                </div>

                {/* 1. Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* Card 1 */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                        <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide">Today's Patients</p>
                        <h3 className="text-3xl font-extrabold text-gray-900 mt-2">{summary.today_prescriptions}</h3>
                    </div>
                    {/* Card 2 */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                        <p className="text-xs font-semibold text-green-500 uppercase tracking-wide">Total Prescriptions</p>
                        <h3 className="text-3xl font-extrabold text-gray-900 mt-2">{summary.total_prescriptions}</h3>
                    </div>
                    {/* Card 3 */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                        <p className="text-xs font-semibold text-purple-500 uppercase tracking-wide">Unique Patients</p>
                        <h3 className="text-3xl font-extrabold text-gray-900 mt-2">{summary.total_unique_patients}</h3>
                    </div>
                </div>

                {/* 2. Analytics & Recent Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Left Column: Chart (Takes 2 columns) */}
                     <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-w-0">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Patient Activity (Last 7 Days)</h3>
        
        {/* FIX: Ensure container has explicit dimensions and min-width */}
        <div className="w-full h-[300px] min-w-0 min-h-0">
            {activityData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart data={activityData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis 
                            dataKey="date" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fontSize: 12, fill: '#6b7280'}} 
                        />
                        <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fontSize: 12, fill: '#6b7280'}} 
                            allowDecimals={false} 
                        />
                        <Tooltip 
                            cursor={{fill: '#f3f4f6'}}
                            contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
                        />
                        <Bar dataKey="patients" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                    Not enough data for chart
                </div>
            )}
        </div>
    </div>

                    {/* Right Column: Recent List (Takes 1 column) */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                            <h3 className="text-md font-bold text-gray-800">Recent Visits</h3>
                            <Link to="/inventory" className="text-xs text-indigo-600 hover:underline">Manage Drugs</Link>
                        </div>
                        <div className="flex-1 overflow-y-auto max-h-[350px]">
                            {loading ? (
                                <p className="p-4 text-center text-gray-500 text-sm">Loading...</p>
                            ) : recentVisits.length === 0 ? (
                                <p className="p-6 text-center text-gray-500 text-sm">No recent activity.</p>
                            ) : (
                                <ul className="divide-y divide-gray-100">
                                    {recentVisits.map((visit, index) => (
                                        <li key={index} className="p-4 hover:bg-gray-50 transition">
                                            <div className="flex justify-between">
                                                <p className="text-sm font-semibold text-gray-900">{visit.name}</p>
                                                <p className="text-xs text-gray-500">{new Date(visit.visit_date).toLocaleDateString()}</p>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1 truncate">
                                                {visit.diagnosis || 'No diagnosis'}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;