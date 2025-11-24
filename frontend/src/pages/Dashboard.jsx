import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../hooks/useAuth';

const VITE_API_URL = import.meta.env.VITE_API_URL;

function Dashboard() {
    const { doctor, token } = useAuth();
    const [recentVisits, setRecentVisits] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch Recent Activity
    useEffect(() => {
        const fetchRecent = async () => {
            try {
                const response = await fetch(`${VITE_API_URL}/prescriptions/recent`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    setRecentVisits(await response.json());
                }
            } catch (error) {
                console.error('Error loading dashboard:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchRecent();
    }, [token]);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* 1. Welcome Section */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">
                    Welcome, Dr. {doctor?.full_name?.split(' ')[0]}
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                    Here is what's happening in your practice today.
                </p>
            </div>

            {/* 2. Quick Actions & Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                
                {/* Card 1: Create New (Action) */}
                <div className="bg-linear-to-br from-indigo-600 to-indigo-700 rounded-xl shadow-lg text-white overflow-hidden transform transition hover:scale-105 duration-200">
                    <div className="p-6">
                        <h3 className="text-xl font-bold mb-2">New Consultation</h3>
                        <p className="text-indigo-100 mb-6 text-sm">Start a new patient encounter, write prescriptions, and print guides.</p>
                        <Link to="/prescription/new" className="block w-full text-center bg-white text-indigo-600 font-bold py-3 rounded-lg shadow hover:bg-gray-50 transition">
                            + Create Prescription
                        </Link>
                    </div>
                </div>

                {/* Card 2: Recent Count */}
                <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 flex flex-col justify-between">
                    <div>
                        <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">Recent Patients</p>
                        <h3 className="text-4xl font-extrabold text-gray-900 mt-2">{recentVisits.length}</h3>
                    </div>
                    <div className="mt-4 text-sm text-gray-500">
                        Shown in history below
                    </div>
                </div>

                {/* Card 3: Profile / Info */}
                <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 flex flex-col justify-between">
                    <div>
                        <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">Doctor Profile</p>
                        <div className="mt-3">
                            <p className="font-semibold text-gray-800">{doctor?.full_name}</p>
                            <p className="text-sm text-gray-600">{doctor?.degree}</p>
                            <p className="text-xs text-gray-400 mt-1">BMDC: {doctor?.bmdc_reg}</p>
                        </div>
                    </div>
                    <Link to="/profile" className="mt-4 text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                        View Profile &rarr;
                    </Link>
                </div>
            </div>

            {/* 3. Recent Activity Table */}
            <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-lg font-medium text-gray-900">Recent Patient Visits</h3>
                </div>
                
                {loading ? (
                    <div className="p-6 text-center text-gray-500">Loading recent activity...</div>
                ) : recentVisits.length === 0 ? (
                    <div className="p-10 text-center text-gray-500">
                        <p>No prescriptions created yet.</p>
                        <Link to="/prescription/new" className="text-indigo-600 hover:underline mt-2 block">Start your first one!</Link>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age/Gender</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Diagnosis</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {recentVisits.map((visit, index) => (
                                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(visit.visit_date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {visit.name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {visit.age} Y / {visit.gender}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {visit.diagnosis || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                Completed
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Dashboard;