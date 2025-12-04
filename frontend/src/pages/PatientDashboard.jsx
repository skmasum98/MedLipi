import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';

const VITE_API_URL = import.meta.env.VITE_API_URL;

function PatientDashboard() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const token = localStorage.getItem('patientToken');
    const patientName = localStorage.getItem('patientName');

    useEffect(() => {
        if (!token) {
            navigate('/patient/login');
            return;
        }

        const fetchHistory = async () => {
            try {
                const res = await fetch(`${VITE_API_URL}/portal/my-history`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    setHistory(await res.json());
                } else {
                    // Token likely expired
                    localStorage.removeItem('patientToken');
                    navigate('/patient/login');
                }
            } catch (e) { console.error(e); } 
            finally { setLoading(false); }
        };
        fetchHistory();
    }, [token, navigate]);

    const handleDownload = (uid) => {
        // Reuse the public download endpoint directly
        window.open(`${VITE_API_URL}/public/prescription/${uid}`, '_blank');
    };

    const handleLogout = () => {
        localStorage.removeItem('patientToken');
        navigate('/patient/login');
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Navbar */}
            <nav className="bg-green-600 text-white shadow-lg">
                <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
                    <h1 className="text-xl font-bold">My Health Record</h1>
                    <div className="flex items-center gap-4">
                        <span className="text-sm hidden sm:block">Hello, {patientName}</span>
                        <button onClick={handleLogout} className="bg-green-700 hover:bg-green-800 px-3 py-1 rounded text-sm transition">
                            Logout
                        </button>
                    </div>
                </div>
            </nav>

            <div className="max-w-4xl mx-auto p-6 mt-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Visit History</h2>

                {loading ? (
                    <div className="text-center p-10 text-gray-500">Loading your records...</div>
                ) : history.length === 0 ? (
                    <div className="text-center p-10 bg-white rounded shadow text-gray-500">
                        No prescriptions found.
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {history.map((visit) => (
                            <div key={visit.public_uid} className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:shadow-md transition-shadow">
                                <div className="mb-4 sm:mb-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-green-700 font-bold text-lg">
                                            {new Date(visit.visit_date).toLocaleDateString()}
                                        </span>
                                        <span className="text-xs text-gray-400 font-mono">
                                            {new Date(visit.visit_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </span>
                                    </div>
                                    <p className="text-gray-800 font-medium">Dr. {visit.doctor_name}</p>
                                    <p className="text-sm text-gray-500">{visit.clinic || 'General Practice'}</p>
                                    {visit.diagnosis && (
                                        <p className="text-sm mt-2 p-1 bg-green-50 text-green-800 rounded inline-block">
                                            Dx: {visit.diagnosis.substring(0, 50)}...
                                        </p>
                                    )}
                                </div>
                                
                                <button 
                                    onClick={() => handleDownload(visit.public_uid)}
                                    className="flex items-center gap-2 bg-green-50 text-green-700 border border-green-200 px-4 py-2 rounded-lg hover:bg-green-100 transition-colors font-medium"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                    Download PDF
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default PatientDashboard;