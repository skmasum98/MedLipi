import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router'; // <--- FIX 1: Correct Import

const VITE_API_URL = import.meta.env.VITE_API_URL;

function PatientDashboard() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const token = localStorage.getItem('patientToken');
    const patientName = localStorage.getItem('patientName');
    const [isBooking, setIsBooking] = useState(false);
    const [bookDate, setBookDate] = useState('');

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
                    localStorage.removeItem('patientToken');
                    navigate('/patient/login');
                }
            } catch (e) { console.error(e); } 
            finally { setLoading(false); }
        };
        fetchHistory();
    }, [token, navigate]);

    const handleDownload = (uid) => {
        window.open(`${VITE_API_URL}/public/prescription/${uid}`, '_blank');
    };

    const handleLogout = () => {
        localStorage.removeItem('patientToken');
        navigate('/patient/login');
    };

    const handleBook = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${VITE_API_URL}/appointments`, { 
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ 
                    visit_date: bookDate,
                    doctor_id: 1, // Defaulting to Dr ID 1
                    reason: 'Patient Portal Request'
                })
            });
            
            if (res.ok) {
                alert('Appointment Request Sent!');
                setIsBooking(false);
                setBookDate('');
            } else {
                alert('Booking failed');
            }
        } catch (err) { alert('Network error'); }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Navbar */}
            <nav className="bg-green-600 text-white shadow-lg sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        {/* Simple Logo/Icon */}
                        <div className="w-8 h-8 bg-white text-green-600 rounded-full flex items-center justify-center font-bold">P</div>
                        <h1 className="text-xl font-bold">My Health</h1>
                    </div>
                    
                    {/* FIX 2: Actions Group (Book + Logout) */}
                    <div className="flex items-center gap-3">
                        <span className="text-sm hidden sm:block opacity-90">Hi, {patientName?.split(' ')[0]}</span>
                        
                        <button 
                            onClick={() => setIsBooking(true)}
                            className="bg-white text-green-700 font-bold px-3 py-1.5 rounded shadow hover:bg-green-50 transition text-sm"
                        >
                            + Book Visit
                        </button>
                        
                        <button 
                            onClick={handleLogout}
                            className="bg-green-700 hover:bg-green-800 border border-green-500 px-3 py-1.5 rounded text-sm transition"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </nav>

            <div className="max-w-4xl mx-auto p-6 mt-2">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">Medical History</h2>

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
                                        <p className="text-sm mt-2 p-1 bg-green-50 text-green-800 rounded inline-block font-medium">
                                            Dx: {visit.diagnosis.substring(0, 50)}...
                                        </p>
                                    )}
                                </div>
                                
                                <button 
                                    onClick={() => handleDownload(visit.public_uid)}
                                    className="flex items-center gap-2 bg-indigo-50 text-indigo-700 border border-indigo-200 px-4 py-2 rounded-lg hover:bg-indigo-100 transition-colors font-medium"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                    Download PDF
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Booking Modal */}
             {isBooking && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-2xl">
                        <h3 className="text-lg font-bold mb-4 text-gray-800">Book Next Visit</h3>
                        <form onSubmit={handleBook}>
                            <label className="block text-sm text-gray-700 mb-2">Select Date</label>
                            <input 
                                type="date" 
                                required 
                                className="w-full p-2 border border-gray-300 rounded mb-4 focus:ring-2 focus:ring-green-500 outline-none"
                                min={new Date().toISOString().split('T')[0]}
                                value={bookDate}
                                onChange={(e) => setBookDate(e.target.value)}
                            />
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setIsBooking(false)} className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded shadow">Confirm Booking</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PatientDashboard;