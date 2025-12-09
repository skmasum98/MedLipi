import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';

const VITE_API_URL = import.meta.env.VITE_API_URL;

function PatientDashboard() {
    const [history, setHistory] = useState([]);
    const [myAppointments, setMyAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const navigate = useNavigate();
    const token = localStorage.getItem('patientToken');
    const patientName = localStorage.getItem('patientName');

    useEffect(() => {
        if (!token) {
            navigate('/patient/login');
            return;
        }

        const fetchData = async () => {
            try {
                // 1. Fetch History
                const histRes = await fetch(`${VITE_API_URL}/portal/my-history`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (histRes.ok) setHistory(await histRes.json());
                else {
                    localStorage.removeItem('patientToken');
                    navigate('/patient/login');
                }

                // 2. Fetch Upcoming Status
                 const apptRes = await fetch(`${VITE_API_URL}/portal/my-appointments`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (apptRes.ok) setMyAppointments(await apptRes.json());

            } catch (e) { console.error(e); } 
            finally { setLoading(false); }
        };
        fetchData();
    }, [token, navigate]);

    // --- HANDLERS ---
    const handleDownload = (uid) => window.open(`${VITE_API_URL}/public/prescription/${uid}`, '_blank');
    
    const handleLogout = () => { 
        localStorage.removeItem('patientToken'); 
        navigate('/patient/login'); 
    };

    // Simply redirect to the dedicated booking page
    const handleBookVisit = () => {
        navigate('/find-doctors');
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-10">
           
            <div className="max-w-4xl mx-auto p-4 space-y-8 mt-4">

                {/* --- SECTION 1: MY UPCOMING APPOINTMENTS --- */}
                {myAppointments.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-orange-100 overflow-hidden">
                        <div className="bg-orange-50 px-6 py-3 border-b border-orange-100 flex justify-between items-center">
                            <h3 className="font-bold text-orange-800 flex items-center gap-2">
                                📅 Upcoming Appointments
                            </h3>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {myAppointments.map(appt => (
                                <div key={appt.appointment_id} className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-orange-50/30 transition">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-gray-800 text-lg">
                                                {new Date(appt.visit_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                            </span>
                                            {appt.visit_time ? (
                                                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-mono">{appt.visit_time.substring(0,5)}</span>
                                            ) : (
                                                <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-xs font-bold">Time TBD</span>
                                            )}
                                        </div>
                                        
                                        <div className="text-sm text-indigo-700 font-semibold">
                                            Dr. {appt.doctor_name || 'Doctor'}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {appt.clinic_name} • Serial <span className="font-bold text-gray-800">#{appt.serial_number}</span>
                                        </div>
                                    </div>

                                    <div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide 
                                            ${appt.status === 'Confirmed' || appt.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                            {appt.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- SECTION 2: HISTORY --- */}
                <div>
                    <h2 className="text-xl font-bold text-gray-800 mb-4 px-1">Visit History</h2>
                    {loading ? (
                        <div className="text-center p-10 text-gray-400">Loading records...</div>
                    ) : history.length === 0 ? (
                        <div className="text-center p-10 bg-white rounded-lg shadow-sm border text-gray-400">No past prescriptions found.</div>
                    ) : (
                        <div className="grid gap-4">
                            {history.map((visit) => (
                                <div key={visit.public_uid} className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:shadow-md transition-shadow">
                                    <div className="mb-4 sm:mb-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-green-700 font-bold">
                                                {new Date(visit.visit_date).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-gray-800 font-medium">Dr. {visit.doctor_name}</p>
                                        <p className="text-sm text-gray-500">{visit.clinic}</p>
                                        {visit.diagnosis && <p className="text-xs mt-1 bg-gray-100 px-2 py-1 rounded inline-block text-gray-600 truncate max-w-xs">{visit.diagnosis}</p>}
                                    </div>
                                    <button onClick={() => handleDownload(visit.public_uid)} className="text-indigo-600 hover:text-indigo-800 font-medium text-sm flex items-center gap-1 border border-indigo-100 bg-indigo-50 px-4 py-2 rounded-lg hover:bg-indigo-100 transition-colors">
                                        <span>📄</span> Download PDF
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default PatientDashboard;