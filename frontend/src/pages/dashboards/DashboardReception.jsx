import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { useAuth } from '../../hooks/useAuth';

const VITE_API_URL = import.meta.env.VITE_API_URL;

function DashboardReception() {
    const { token, doctor } = useAuth(); // 'doctor' user object contains role/name
    const navigate = useNavigate();
    const [queue, setQueue] = useState([]);
    const [stats, setStats] = useState({ total: 0, waiting: 0, pending: 0, completed: 0 });
    const [loading, setLoading] = useState(true);
    
    // Quick Date Filter (Defaults to Today)
    const [filterDate, setFilterDate] = useState(new Date().toLocaleDateString('en-CA'));

    // 1. Fetch Today's Queue
    const fetchQueue = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${VITE_API_URL}/appointments?date=${filterDate}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if(res.ok) {
                const data = await res.json();
                setQueue(data);
                
                // Calculate Stats
                setStats({
                    total: data.length,
                    waiting: data.filter(a => a.status === 'Scheduled').length, // Scheduled usually implies checked-in or waiting for doc in this simplified flow, OR update status logic 'Waiting'
                    pending: data.filter(a => a.status === 'Pending_Confirmation').length,
                    completed: data.filter(a => a.status === 'Completed').length,
                });
            }
        } catch(e) { console.error(e); } 
        finally { setLoading(false); }
    };

    useEffect(() => { fetchQueue(); }, [filterDate, token]);

    // 2. Handlers
    const handleStatusUpdate = async (id, status) => {
        // Optimistic UI Update for speed
        setQueue(queue.map(q => q.appointment_id === id ? { ...q, status } : q));
        
        try {
            await fetch(`${VITE_API_URL}/appointments/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status })
            });
            // Re-fetch to sync accurate data (or skip for pure speed)
            fetchQueue();
        } catch (e) { alert("Failed to update status"); }
    };

    // Color Badge Helper
    const getStatusBadge = (status) => {
        const colors = {
            'Scheduled': 'bg-blue-100 text-blue-800',
            'Pending_Confirmation': 'bg-orange-100 text-orange-800 animate-pulse',
            'Completed': 'bg-green-100 text-green-800',
            'Cancelled': 'bg-red-50 text-red-600',
            'Pending_Followup': 'bg-gray-100 text-gray-500'
        };
        return colors[status] || 'bg-gray-100';
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6 font-sans text-gray-800">
            {/* --- TOP BAR --- */}
            <header className="flex justify-between items-center mb-8 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-extrabold text-purple-800 flex items-center gap-2">
                        🏥 Reception Desk
                    </h1>
                    <p className="text-xs text-gray-400 mt-1">Staff: {doctor?.name} | Dr: {doctor?.doctorName || 'Assigned Doctor'}</p>
                </div>

                <div className="flex gap-4">
                    {/* Date Picker Shortcut */}
                    <input 
                        type="date" 
                        value={filterDate} 
                        onChange={(e) => setFilterDate(e.target.value)} 
                        className="p-2 border rounded-lg text-sm bg-gray-50"
                    />

                    {/* Manage Session Button */}
                    <Link to="/reception/sessions" className="bg-white border border-purple-200 text-purple-700 px-4 py-2 rounded-lg font-bold hover:bg-purple-50 transition shadow-sm text-sm flex items-center gap-2">
                        📅 Manage Doctor Sessions
                    </Link>

                    {/* New Walk-In Button */}
                    <button 
                        onClick={() => navigate('/patient/register', { state: { role: 'reception-booking' }})} // Hint to register & book immediately
                        className="bg-purple-700 text-white px-5 py-2 rounded-lg font-bold shadow hover:bg-purple-800 transition flex items-center gap-2"
                    >
                        <span>+</span> New Walk-in Entry
                    </button>
                </div>
            </header>

            {/* --- STATS GRID --- */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-gray-300">
                    <p className="text-xs font-bold text-gray-400 uppercase">Total</p>
                    <p className="text-2xl font-extrabold">{stats.total}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-orange-400">
                    <p className="text-xs font-bold text-gray-400 uppercase">To Confirm</p>
                    <p className="text-2xl font-extrabold text-orange-600">{stats.pending}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-500">
                    <p className="text-xs font-bold text-gray-400 uppercase">Scheduled / Arriving</p>
                    <p className="text-2xl font-extrabold text-blue-600">{stats.waiting}</p>
                </div>
                 <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-500">
                    <p className="text-xs font-bold text-gray-400 uppercase">Completed</p>
                    <p className="text-2xl font-extrabold text-green-600">{stats.completed}</p>
                </div>
            </div>

            {/* --- MAIN SPLIT LAYOUT --- */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                {/* Left (Queue Table) */}
                <div className="lg:col-span-3 bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between">
                        <h3 className="font-bold text-gray-700">Today's Appointment List</h3>
                    </div>
                    
                    <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                            <tr>
                                <th className="px-6 py-3">Serial</th>
                                <th className="px-6 py-3">Time</th>
                                <th className="px-6 py-3">Patient</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3 text-right">Quick Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (<tr><td colSpan="5" className="p-8 text-center text-gray-400">Loading...</td></tr>) : 
                            queue.length === 0 ? (<tr><td colSpan="5" className="p-8 text-center text-gray-400">Empty Schedule</td></tr>) :
                            
                            queue.filter(a => a.status !== 'Completed' && a.status !== 'Cancelled').map(app => (
                                <tr key={app.appointment_id} className="hover:bg-purple-50/30 transition">
                                    <td className="px-6 py-4">
                                        <span className="font-mono font-bold text-lg bg-gray-100 px-2 py-1 rounded text-gray-700">#{app.serial_number || 'N/A'}</span>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-mono">
                                        {app.visit_time ? app.visit_time.substring(0,5) : <span className="text-orange-400 text-xs">TBD</span>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-800">{app.patient_name}</div>
                                        <div className="text-xs text-gray-500">{app.mobile}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusBadge(app.status)}`}>
                                            {app.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        {/* Status Toggle Buttons */}
                                        {app.status === 'Pending_Confirmation' ? (
                                            <button onClick={() => handleStatusUpdate(app.appointment_id, 'Confirmed')} className="text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded transition">Confirm</button>
                                        ) : app.status === 'Scheduled' || app.status === 'Confirmed' ? (
                                            <button onClick={() => handleStatusUpdate(app.appointment_id, 'Completed')} className="text-xs border border-green-500 text-green-600 hover:bg-green-50 px-3 py-1 rounded transition">Check-Out</button>
                                        ) : null}
                                        
                                        {/* Edit/Manage Link */}
                                        <button onClick={() => navigate('/appointments')} className="text-xs text-indigo-500 underline ml-2">Edit</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    </div>
                </div>

                {/* Right (Priority/Alerts) */}
                <div className="lg:col-span-1 space-y-4">
                     {/* Just Online Requests Only */}
                    <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                        <h4 className="text-xs font-bold uppercase text-orange-700 mb-3 flex items-center gap-1">
                            🌐 New Online Requests
                        </h4>
                        <div className="space-y-2">
                            {queue.filter(a => a.status === 'Pending_Confirmation').map(p => (
                                <div key={p.appointment_id} className="bg-white p-3 rounded shadow-sm">
                                    <div className="flex justify-between items-start">
                                        <p className="text-sm font-bold">{p.patient_name}</p>
                                        <span className="text-[10px] bg-gray-100 px-1 rounded">#{p.serial_number}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">{p.mobile}</p>
                                    <div className="flex gap-2 mt-2">
                                        <a href={`tel:${p.mobile}`} className="flex-1 bg-green-50 text-green-700 text-xs font-bold py-1 rounded text-center border border-green-200 hover:bg-green-100">
                                            Call
                                        </a>
                                        <button onClick={() => handleStatusUpdate(p.appointment_id, 'Confirmed')} className="flex-1 bg-blue-500 text-white text-xs font-bold py-1 rounded hover:bg-blue-600">
                                            Confirm
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {queue.filter(a => a.status === 'Pending_Confirmation').length === 0 && (
                                <p className="text-center text-gray-400 text-xs py-4">No pending requests.</p>
                            )}
                        </div>
                    </div>
                    
                </div>
            </div>
        </div>
    );
}

export default DashboardReception;