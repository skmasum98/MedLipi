import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';

const VITE_API_URL = import.meta.env.VITE_API_URL;

function PatientDashboard() {
    const [history, setHistory] = useState([]);
    const [myAppointments, setMyAppointments] = useState([]); // NEW: To track booking status
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const token = localStorage.getItem('patientToken');
    const patientName = localStorage.getItem('patientName');
    
    // Booking States
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [sessions, setSessions] = useState([]);
    const [bookingLoading, setBookingLoading] = useState(false);

    // --- 1. Load History & Appointments ---
    useEffect(() => {
        if (!token) {
            navigate('/patient/login');
            return;
        }

        const fetchData = async () => {
            try {
                // Fetch Past Prescriptions (History)
                const histRes = await fetch(`${VITE_API_URL}/portal/my-history`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (histRes.ok) setHistory(await histRes.json());
                else {
                    localStorage.removeItem('patientToken');
                    navigate('/patient/login');
                }

                // Fetch My Upcoming Appointments (Status Check)
                // (Note: We might need a new endpoint for this, or reuse one. 
                // Let's assume we can fetch via the portal route or general appointments route)
                // For MVP: Let's assume we create a quick helper or reuse an existing route logic
                // Update backend (Step 2 below) to support this cleanly
                 const apptRes = await fetch(`${VITE_API_URL}/portal/my-appointments`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (apptRes.ok) setMyAppointments(await apptRes.json());

            } catch (e) { console.error(e); } 
            finally { setLoading(false); }
        };
        fetchData();
    }, [token, navigate]);

    // --- 2. Load Available Slots for Booking Modal ---
    const openBookingModal = async () => {
        setBookingLoading(true);
        setIsBookingModalOpen(true);
        try {
            const res = await fetch(`${VITE_API_URL}/schedules/available`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setSessions(await res.json());
        } catch (e) { console.error(e); } 
        finally { setBookingLoading(false); }
    };

    // --- 3. Handle Serial Booking ---
    const handleBookSerial = async (scheduleId) => {
        if(!window.confirm("Confirm booking for this session?")) return;
        
        try {
            const res = await fetch(`${VITE_API_URL}/schedules/book-serial`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ schedule_id: scheduleId })
            });
            const data = await res.json();
            if (res.ok) {
                alert(`Booking Successful! Your Serial is #${data.serial}. Waiting for confirmation.`);
                setIsBookingModalOpen(false);
                // Refresh list to show new pending appointment
                window.location.reload(); 
            } else {
                alert(data.message);
            }
        } catch (e) { alert('Error booking'); }
    };

    const handleDownload = (uid) => window.open(`${VITE_API_URL}/public/prescription/${uid}`, '_blank');
    const handleLogout = () => { localStorage.removeItem('patientToken'); navigate('/patient/login'); };

    return (
        <div className="min-h-screen bg-gray-50 pb-10">
            {/* Navbar */}
            <nav className="bg-green-600 text-white shadow-lg sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-white text-green-600 rounded-full flex items-center justify-center font-bold">P</div>
                        <h1 className="text-xl font-bold">My Health</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm hidden sm:block opacity-90">Hi, {patientName}</span>
                        <button onClick={openBookingModal} className="bg-white text-green-700 font-bold px-3 py-1.5 rounded shadow hover:bg-green-50 transition text-sm">
                            + Book Visit
                        </button>
                        <button onClick={handleLogout} className="bg-green-700 hover:bg-green-800 border border-green-500 px-3 py-1.5 rounded text-sm transition">Logout</button>
                    </div>
                </div>
            </nav>

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
                                <div key={appt.appointment_id} className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-gray-800 text-lg">
                                                {new Date(appt.visit_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                            </span>
                                            {appt.visit_time && <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-mono">{appt.visit_time.substring(0,5)}</span>}
                                        </div>
                                        <p className="text-sm text-gray-500">Serial: <span className="font-bold text-gray-800">#{appt.serial_number}</span></p>
                                    </div>
                                    <div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide 
                                            ${appt.status === 'Confirmed' || appt.status === 'Scheduled' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
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

            {/* --- BOOKING MODAL (List of Sessions) --- */}
            {isBookingModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
                    <div className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-2xl max-h-[80vh] flex flex-col">
                        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
                            <h3 className="text-xl font-bold text-gray-900">Available Schedules</h3>
                            <button onClick={() => setIsBookingModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                        </div>
                        
                        <div className="overflow-y-auto flex-1 pr-2">
                            {bookingLoading ? (
                                <p className="text-center text-gray-500 py-10">Checking availability...</p>
                            ) : sessions.length === 0 ? (
                                <p className="text-center text-gray-500 py-10">No sessions available right now.</p>
                            ) : (
                                <div className="grid gap-3">
                                    {sessions.map(s => {
                                        const isFull = s.booked_count >= s.max_patients;
                                        return (
                                            <div key={s.schedule_id} className={`p-4 rounded-lg border flex justify-between items-center transition-all ${isFull ? 'bg-gray-50 border-gray-200 opacity-70' : 'bg-white border-green-200 hover:border-green-400 hover:shadow-md'}`}>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-gray-800 text-lg">
                                                            {new Date(s.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric'})}
                                                        </span>
                                                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700 uppercase">{s.session_name}</span>
                                                    </div>
                                                    <p className="text-sm text-gray-500 mt-1">Time: {s.start_time.substring(0,5)} - {s.end_time.substring(0,5)}</p>
                                                    <p className="text-xs font-medium text-gray-400 mt-1">Slots: {s.booked_count} / {s.max_patients} booked</p>
                                                </div>
                                                
                                                <button 
                                                    disabled={isFull}
                                                    onClick={() => handleBookSerial(s.schedule_id)}
                                                    className={`px-5 py-2 rounded-lg font-bold text-sm shadow-sm ${isFull ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700 hover:-translate-y-0.5 transition-transform'}`}
                                                >
                                                    {isFull ? 'Full' : 'Book Serial'}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PatientDashboard;