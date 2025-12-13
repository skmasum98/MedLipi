import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router'; // Corrected Import
import { useAuth } from '../../hooks/useAuth';

const VITE_API_URL = import.meta.env.VITE_API_URL;

function DashboardReception() {
    const { token, doctor } = useAuth(); 
    const navigate = useNavigate();
    const [queue, setQueue] = useState([]);
    const [stats, setStats] = useState({ total: 0, waiting: 0, pending: 0, completed: 0 });
    const [loading, setLoading] = useState(true);
    
    
    const [filterDate, setFilterDate] = useState(new Date().toLocaleDateString('en-CA'));

    // 1. Fetch Queue
    const fetchQueue = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${VITE_API_URL}/appointments?date=${filterDate}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if(res.ok) {
                const data = await res.json();
                setQueue(data);
                
                // Stats Logic
                setStats({
                    total: data.length,
                    waiting: data.filter(a => ['Confirmed', 'Scheduled', 'Waiting'].includes(a.status)).length,
                    pending: data.filter(a => a.status === 'Pending_Confirmation').length,
                    completed: data.filter(a => a.status === 'Completed').length,
                });
            }
        } catch(e) { console.error(e); } 
        finally { setLoading(false); }
    };

    useEffect(() => { fetchQueue(); }, [filterDate, token]);

    // 2. Status Handler
    const handleStatusUpdate = async (id, status) => {
        // Optimistic UI Update
        setQueue(prev => prev.map(q => q.appointment_id === id ? { ...q, status } : q));
        
        try {
            await fetch(`${VITE_API_URL}/appointments/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status })
            });
            fetchQueue();
        } catch (e) { alert("Failed to update status"); }
    };

    // Helper: Colors
    const getStatusBadge = (status) => {
        switch(status) {
            case 'Confirmed': return 'bg-blue-100 text-blue-800';
            case 'Scheduled': return 'bg-indigo-100 text-indigo-800';
            case 'Pending_Confirmation': return 'bg-orange-100 text-orange-800 animate-pulse';
            case 'Completed': return 'bg-green-100 text-green-800';
            case 'Cancelled': return 'bg-red-50 text-red-600';
            default: return 'bg-gray-100 text-gray-500';
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6 font-sans text-gray-800">
            {/* --- TOP BAR --- */}
            <header className="flex flex-col md:flex-row justify-between items-center mb-8 bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-purple-800 flex items-center gap-2">
                        🏥 Reception Desk
                    </h1>
                    <p className="text-xs text-gray-400 mt-1">Logged in: {doctor?.name || doctor?.full_name}</p>
                </div>

                <div className="flex flex-wrap gap-4 items-center">
                    <input 
                        type="date" 
                        value={filterDate} 
                        onChange={(e) => setFilterDate(e.target.value)} 
                        className="p-2 border rounded-lg text-sm bg-gray-50 outline-none focus:ring-2 focus:ring-purple-500"
                    />

                    <Link to="/reception/sessions" className="bg-white border border-purple-200 text-purple-700 px-4 py-2 rounded-lg font-bold hover:bg-purple-50 transition shadow-sm text-sm flex items-center gap-2">
                        📅 Manage Sessions
                    </Link>

                    <button 
                        onClick={() => navigate('/reception/walk-in')} 
                        className="bg-purple-700 text-white px-5 py-2 rounded-lg font-bold shadow hover:bg-purple-800 transition flex items-center gap-2 text-sm"
                    >
                        <span>+</span> Create New Serial
                    </button>
                </div>
            </header>

            {/* --- STATS GRID --- */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-gray-300">
                    <p className="text-xs font-bold text-gray-400 uppercase">Total</p>
                    <p className="text-2xl font-extrabold">{stats.total}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-orange-400">
                    <p className="text-xs font-bold text-gray-400 uppercase">Online Request</p>
                    <p className="text-2xl font-extrabold text-orange-600">{stats.pending}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-500">
                    <p className="text-xs font-bold text-gray-400 uppercase">Active / Waiting</p>
                    <p className="text-2xl font-extrabold text-blue-600">{stats.waiting}</p>
                </div>
                 <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-500">
                    <p className="text-xs font-bold text-gray-400 uppercase">Checked Out</p>
                    <p className="text-2xl font-extrabold text-green-600">{stats.completed}</p>
                </div>
            </div>

            {/* --- MAIN SPLIT LAYOUT --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* LEFT (70%): Live Queue Table */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between">
                        <h3 className="font-bold text-gray-700">Today's Appointments</h3>
                    </div>
                    
                    <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                            <tr>
                                <th className="px-4 py-3">Serial</th>
                                <th className="px-4 py-3">Time</th>
                                <th className="px-4 py-3">Patient</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (<tr><td colSpan="5" className="p-8 text-center text-gray-400">Loading...</td></tr>) : 
                            queue.length === 0 ? (<tr><td colSpan="5" className="p-8 text-center text-gray-400">Empty Schedule</td></tr>) :
                            
                            // Filter logic: Show Scheduled, Confirmed, Waiting, Completed
                            queue.filter(a => a.status !== 'Pending_Confirmation' && a.status !== 'Cancelled').map(app => (
                                <tr key={app.appointment_id} className={`hover:bg-gray-50 transition ${app.status === 'Completed' ? 'opacity-60 grayscale' : ''}`}>
                                    <td className="px-4 py-3">
                                        <span className="font-mono font-bold text-md bg-gray-100 px-2 py-1 rounded text-gray-700">#{app.serial_number || '-'}</span>
                                    </td>
                                    <td className="px-4 py-3 text-sm font-mono">
                                        {app.visit_time ? app.visit_time.substring(0,5) : <span className="text-orange-400 text-xs font-bold">TBD</span>}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="font-bold text-gray-800 text-sm">{app.patient_name}</div>
                                        <div className="text-xs text-gray-500">{app.mobile}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-full text-[10px] uppercase font-bold ${getStatusBadge(app.status)}`}>
                                            {app.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right space-x-2">
                                        {/* Action: Mark Complete / Check-Out */}
                                        {['Confirmed', 'Scheduled', 'Waiting'].includes(app.status) && (
                                            <button 
                                                onClick={() => handleStatusUpdate(app.appointment_id, 'Completed')} 
                                                className="text-xs border border-green-500 text-green-600 hover:bg-green-50 px-2 py-1 rounded transition"
                                            >
                                                Check Out
                                            </button>
                                        )}
                                        <button onClick={() => navigate('/reception/schedule')} className="text-xs text-indigo-500 hover:underline">Edit</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    </div>
                </div>

                {/* RIGHT (30%): New Online Requests */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-orange-50 rounded-xl p-4 border border-orange-200 shadow-sm h-full">
                        <h4 className="text-xs font-bold uppercase text-orange-800 mb-3 flex items-center gap-2 border-b border-orange-200 pb-2">
                            <span>🔔</span> New Online Requests
                        </h4>
                        
                        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                            {queue.filter(a => a.status === 'Pending_Confirmation').length === 0 ? (
                                <p className="text-center text-gray-400 text-xs py-10 italic">No new online requests.</p>
                            ) : (
                                queue.filter(a => a.status === 'Pending_Confirmation').map(p => (
                                    <div key={p.appointment_id} className="bg-white p-3 rounded-lg shadow-sm border border-orange-100 transition hover:shadow-md">
                                        <div className="flex justify-between items-start mb-1">
                                            <p className="text-sm font-bold text-gray-900">{p.patient_name}</p>
                                            <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">#{p.serial_number}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 mb-2">📞 {p.mobile}</p>
                                        
                                        <div className="grid grid-cols-2 gap-2 mt-2">
                                            <a 
                                                href={`tel:${p.mobile}`} 
                                                className="bg-white border border-green-200 text-green-700 text-xs font-bold py-1.5 rounded text-center hover:bg-green-50 transition"
                                            >
                                                Call
                                            </a>
                                            <button 
                                                onClick={() => handleStatusUpdate(p.appointment_id, 'Confirmed')} 
                                                className="bg-orange-500 text-white text-xs font-bold py-1.5 rounded hover:bg-orange-600 transition shadow-sm"
                                            >
                                                Confirm
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

export default DashboardReception;