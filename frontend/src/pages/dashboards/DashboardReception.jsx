import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { useAuth } from '../../hooks/useAuth';

const VITE_API_URL = import.meta.env.VITE_API_URL;

function DashboardReception() {
    const { token, doctor } = useAuth();
    const navigate = useNavigate();
    
    // Data States
    const [queue, setQueue] = useState([]);
    const [stats, setStats] = useState({ total: 0, waiting: 0, pending: 0, completed: 0 });
    const [loading, setLoading] = useState(true);
    
    const [filterDate, setFilterDate] = useState(new Date().toLocaleDateString('en-CA'));

    // 1. Fetch Queue Logic
    const fetchQueue = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${VITE_API_URL}/appointments?date=${filterDate}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if(res.ok) {
                const data = await res.json();
                setQueue(data);
                
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

    // 2. Action Handlers
    const handleStatusUpdate = async (id, status) => {
        setQueue(prev => prev.map(q => q.appointment_id === id ? { ...q, status } : q));
        try {
            await fetch(`${VITE_API_URL}/appointments/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status })
            });
            fetchQueue();
        } catch (e) { alert("Update failed"); }
    };

    // Helper: Colors
    const getStatusBadge = (status) => {
        const map = {
            'Confirmed': 'bg-blue-100 text-blue-800',
            'Scheduled': 'bg-indigo-100 text-indigo-800',
            'Pending_Confirmation': 'bg-orange-100 text-orange-800 animate-pulse',
            'Completed': 'bg-green-100 text-green-800',
            'Cancelled': 'bg-red-50 text-red-600',
            'Waiting': 'bg-teal-100 text-teal-800'
        };
        return map[status] || 'bg-gray-100 text-gray-500';
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-10">
            
            {/* --- TOP BAR --- */}
            <header className="bg-white border-b border-indigo-100 sticky top-0 z-30 shadow-sm px-4 py-3 md:py-4">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                    
                    {/* Brand / Context */}
                    <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">🏥</span>
                            <div>
                                <h1 className="text-lg md:text-xl font-extrabold text-indigo-900 leading-none">Reception Desk</h1>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">{doctor?.full_name}</p>
                            </div>
                        </div>
                        {/* Mobile Only Menu Trigger could go here if needed */}
                    </div>

                    {/* Controls */}
                    <div className="flex gap-2 w-full md:w-auto">
                        <input 
                            type="date" 
                            value={filterDate} 
                            onChange={(e) => setFilterDate(e.target.value)} 
                            className="p-2 border rounded-lg text-sm bg-gray-50 outline-none focus:ring-2 focus:ring-purple-500 w-auto"
                        />

                        <Link to="/reception/sessions" className="hidden sm:flex bg-white border border-purple-200 text-purple-700 px-3 py-2 rounded-lg font-bold hover:bg-purple-50 transition shadow-sm text-sm items-center gap-2">
                            <span>📅</span> Manage Shifts
                        </Link>

                        <button 
                            onClick={() => navigate('/reception/walk-in', { state: { role: 'reception-booking' }})}
                            className="flex-1 md:flex-none bg-purple-700 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-purple-800 transition flex items-center justify-center gap-2 text-sm whitespace-nowrap"
                        >
                            <span>+</span> Walk-in
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
                
                {/* --- STATS GRID --- */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Total Visitors</p>
                        <p className="text-2xl font-black text-gray-800 mt-1">{stats.total}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-orange-400">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Web Request</p>
                        <p className="text-2xl font-black text-orange-500 mt-1">{stats.pending}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-500">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Expected / Arrived</p>
                        <p className="text-2xl font-black text-blue-600 mt-1">{stats.waiting}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-green-500">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Checked Out</p>
                        <p className="text-2xl font-black text-green-600 mt-1">{stats.completed}</p>
                    </div>
                </div>

                {/* --- CONTENT AREA --- */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
                    
                    {/* --- LEFT COL (Live Queue) --- */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="px-5 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <h3 className="font-bold text-gray-700">Today's List</h3>
                                {loading && <span className="text-xs text-gray-400 animate-pulse">Syncing...</span>}
                            </div>
                            
                            {/* Table (Desktop) & Cards (Mobile) Container */}
                            <div className="min-h-[300px]">
                                {queue.length === 0 && !loading && (
                                    <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                                        <p className="text-sm font-medium">Empty Queue</p>
                                    </div>
                                )}

                                {/* RESPONSIVE LIST: Maps rows nicely */}
                                <div className="divide-y divide-gray-100">
                                    {queue.filter(a => !['Pending_Confirmation', 'Cancelled'].includes(a.status)).map(app => (
                                        <div key={app.appointment_id} className={`group p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-indigo-50/30 transition-colors ${app.status === 'Completed' ? 'opacity-50 grayscale' : ''}`}>
                                            
                                            {/* Patient Block */}
                                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                                <span className="font-mono font-bold text-lg bg-gray-100 text-gray-600 w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200">
                                                    #{app.serial_number || '?'}
                                                </span>
                                                <div className="flex-1">
                                                    <div className="font-bold text-gray-800 text-base">{app.patient_name}</div>
                                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                                        <span className="font-mono">{app.visit_time ? app.visit_time.substring(0,5) : 'TBD'}</span>
                                                        <span>•</span>
                                                        <span>{app.mobile}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Actions & Status Block */}
                                            <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3">
                                                <span className={`px-2 py-1 rounded text-[10px] uppercase font-extrabold tracking-wide ${getStatusBadge(app.status)}`}>
                                                    {app.status.replace('_', ' ')}
                                                </span>

                                                <div className="flex items-center gap-2">
                                                    {['Confirmed', 'Scheduled', 'Waiting'].includes(app.status) && (
                                                        <button 
                                                            onClick={() => handleStatusUpdate(app.appointment_id, 'Completed')} 
                                                            className="text-xs bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 px-3 py-1.5 rounded-lg font-bold transition"
                                                        >
                                                            Check Out
                                                        </button>
                                                    )}
                                                    <button onClick={() => navigate('/appointments')} className="p-1.5 text-gray-400 hover:text-indigo-600 rounded hover:bg-indigo-50 transition" title="Edit details">
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* --- RIGHT COL (30%): New Online Requests --- */}
                    <div className="lg:col-span-1">
                        <div className="bg-orange-50/50 rounded-xl p-5 border border-orange-200 h-fit sticky top-20 shadow-sm">
                            <h4 className="text-xs font-bold uppercase text-orange-800 mb-4 flex items-center justify-between">
                                <span>🔔 Online Requests</span>
                                <span className="bg-orange-100 text-orange-800 px-2 rounded-full">{stats.pending}</span>
                            </h4>
                            
                            <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto pr-1 custom-scrollbar">
                                {queue.filter(a => a.status === 'Pending_Confirmation').length === 0 ? (
                                    <p className="text-center text-gray-400 text-xs py-8 italic bg-white/50 rounded-lg border border-dashed border-orange-100">No new online requests.</p>
                                ) : (
                                    queue.filter(a => a.status === 'Pending_Confirmation').map(p => (
                                        <div key={p.appointment_id} className="bg-white p-3 rounded-lg shadow-sm border border-orange-100 hover:shadow-md transition">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <p className="text-sm font-bold text-gray-800 leading-tight">{p.patient_name}</p>
                                                    <p className="text-[10px] text-gray-500 font-mono mt-0.5">{p.mobile}</p>
                                                </div>
                                                <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono font-bold">#{p.serial_number}</span>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-2 mt-3">
                                                <a 
                                                    href={`tel:${p.mobile}`} 
                                                    className="bg-gray-50 text-gray-600 border border-gray-200 text-xs font-bold py-1.5 rounded-md text-center hover:bg-green-50 hover:text-green-700 hover:border-green-200 transition"
                                                >
                                                    Call
                                                </a>
                                                <button 
                                                    onClick={() => handleStatusUpdate(p.appointment_id, 'Confirmed')} 
                                                    className="bg-indigo-600 text-white text-xs font-bold py-1.5 rounded-md hover:bg-indigo-700 transition shadow-sm"
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
        </div>
    );
}

export default DashboardReception;