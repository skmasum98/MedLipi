import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router'; // FIXED IMPORT
import { useAuth } from '../../hooks/useAuth';
import { getDhakaDateISO, formatDisplayTime } from '../../utils/dateUtils'; // Assuming these utils exist

const VITE_API_URL = import.meta.env.VITE_API_URL;

function DashboardGlobalReception() {
    const { token, doctor: currentUser } = useAuth();
    const navigate = useNavigate();

    // 1. Selector State
    const [doctors, setDoctors] = useState([]);
    const [selectedDoctorId, setSelectedDoctorId] = useState(''); 
    
    // 2. Data State
    const [queue, setQueue] = useState([]);
    const [filterDate, setFilterDate] = useState(getDhakaDateISO()); // "2024-12-14"
    const [loading, setLoading] = useState(false);

    // --- Load Doctors List ---
    useEffect(() => {
        const loadDocs = async () => {
            try {
                const res = await fetch(`${VITE_API_URL}/public/doctors`); 
                if(res.ok) setDoctors(await res.json());
            } catch (e) { console.error(e); }
        };
        loadDocs();
    }, []);

    // --- Load Queue for Selected Doctor ---
    const fetchQueue = async () => {
        if (!selectedDoctorId) { setQueue([]); return; }
        
        setLoading(true);
        try {
            // Fetch filtered by doctor_id
            const res = await fetch(`${VITE_API_URL}/appointments?date=${filterDate}&doctor_id=${selectedDoctorId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if(res.ok) setQueue(await res.json());
        } catch(e) { } 
        finally { setLoading(false); }
    };

    useEffect(() => { fetchQueue(); }, [filterDate, selectedDoctorId, token]);

    // --- Actions ---
    const handleStatusUpdate = async (id, status) => {
        // Optimistic UI
        setQueue(prev => prev.map(q => q.appointment_id === id ? { ...q, status } : q));
        try {
            await fetch(`${VITE_API_URL}/appointments/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status })
            });
            fetchQueue(); // Sync
        } catch (e) { alert("Failed"); }
    };

    // Color Badge
    const getStatusBadge = (status) => {
        const colors = {
            'Confirmed': 'bg-blue-100 text-blue-800',
            'Scheduled': 'bg-indigo-100 text-indigo-800',
            'Pending_Confirmation': 'bg-orange-100 text-orange-800 animate-pulse',
            'Completed': 'bg-green-100 text-green-800',
            'Cancelled': 'bg-red-50 text-red-600',
        };
        return colors[status] || 'bg-gray-100 text-gray-500';
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 font-sans text-gray-800">
            {/* Header / Selector */}
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-indigo-100 mb-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <h1 className="text-2xl font-extrabold text-indigo-900 flex items-center gap-2">
                             <span>🌍</span> Global Reception Desk
                        </h1>
                        <p className="text-xs text-gray-400 mt-1">Logged in: <span className="font-bold text-gray-600">{currentUser?.full_name}</span></p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                         <div className="relative group min-w-[250px]">
                             <label className="text-[10px] font-bold uppercase text-gray-400 absolute -top-2 left-3 bg-white px-1">Select Target Doctor</label>
                             <select 
                                className="w-full p-3 border-2 border-indigo-100 rounded-xl font-bold text-gray-700 bg-gray-50 focus:bg-white focus:border-indigo-500 outline-none transition cursor-pointer"
                                value={selectedDoctorId}
                                onChange={(e) => setSelectedDoctorId(e.target.value)}
                            >
                                <option value="">-- Choose Doctor --</option>
                                {doctors.map(d => (
                                    <option key={d.doctor_id} value={d.doctor_id}>Dr. {d.full_name}</option>
                                ))}
                            </select>
                        </div>

                        <input 
                            type="date" 
                            value={filterDate} 
                            onChange={(e) => setFilterDate(e.target.value)} 
                            className="p-3 border rounded-xl text-sm font-bold bg-white outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                        />
                    </div>
                </div>
            </div>

            {!selectedDoctorId ? (
                <div className="text-center p-20 text-gray-400 bg-white border-2 border-dashed border-gray-200 rounded-3xl animate-in fade-in">
                    <p className="text-4xl mb-4 opacity-50">👈</p>
                    <p className="text-lg font-bold">No Context Selected</p>
                    <p className="text-sm">Please select a Doctor above to manage their patient queue.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fade-in">
                    
                    {/* Actions Panel */}
                    <div className="lg:col-span-4 bg-indigo-900 text-white p-4 rounded-xl shadow-md flex justify-between items-center mb-2">
                        <div>
                             <h3 className="font-bold text-lg">{doctors.find(d=>String(d.doctor_id) === String(selectedDoctorId))?.full_name}'s Queue</h3>
                             <p className="text-xs text-indigo-300">Managing patient flow for {filterDate}</p>
                        </div>
                        <div className="flex gap-3">
                             <Link to="/greception/sessions" className="px-4 py-2 bg-indigo-800 hover:bg-indigo-700 rounded-lg text-sm font-bold transition">📅 Schedules</Link>
                             <Link 
                                to="/greception/walk-in" 
                                // Ideally, you could pass state here to auto-select doctor in WalkIn page, 
                                // but our GlobalWalkIn is designed to handle selection independently.
                                className="px-5 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-bold shadow-lg transition flex items-center gap-2"
                             >
                                 <span>+</span> New Walk-in
                             </Link>
                        </div>
                    </div>


                    {/* Left (Queue Table) */}
                    <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-bold tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Serial</th>
                                    <th className="px-6 py-4">Time</th>
                                    <th className="px-6 py-4">Patient</th>
                                    <th className="px-6 py-4">Status</th>
                                    {/* <th className="px-6 py-4 text-right">Control</th> */}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {loading ? (<tr><td colSpan="5" className="p-10 text-center text-gray-400">Loading...</td></tr>) : 
                                queue.length === 0 ? (<tr><td colSpan="5" className="p-12 text-center text-gray-400 font-bold border-dashed border-gray-200">Empty Schedule for Today</td></tr>) :
                                
                                queue.filter(a => a.status !== 'Cancelled').map(app => (
                                    <tr key={app.appointment_id} className={`hover:bg-indigo-50/50 transition duration-150 ${app.status === 'Completed' ? 'opacity-60 bg-gray-50' : 'bg-white'}`}>
                                        <td className="px-6 py-4 font-mono font-bold text-gray-600">
                                            {app.serial_number ? `#${app.serial_number}` : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-xs font-mono font-bold text-indigo-600">
                                            {app.visit_time ? formatDisplayTime(app.visit_time) : <span className="text-gray-400 font-normal">TBD</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-800">{app.patient_name}</div>
                                            <div className="text-xs text-gray-500">{app.mobile}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wide ${getStatusBadge(app.status)}`}>
                                                {app.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            {/* Action Logic */}
                                            {app.status === 'Pending_Confirmation' && (
                                                <button onClick={() => handleStatusUpdate(app.appointment_id, 'Confirmed')} className="text-[10px] bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded font-bold shadow-sm transition">
                                                    CONFIRM
                                                </button>
                                            )}
                                            {/* {['Scheduled', 'Confirmed', 'Waiting'].includes(app.status) && (
                                                <button onClick={() => handleStatusUpdate(app.appointment_id, 'Completed')} className="text-[10px] border border-green-500 text-green-600 hover:bg-green-50 px-3 py-1.5 rounded font-bold transition">
                                                    CHECK OUT
                                                </button>
                                            )} */}
                                            
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        </div>
                    </div>

                    {/* Right (Quick Stats / Alerts) */}
                    <div className="lg:col-span-1 space-y-4">
                         <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                             <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Today's Summary</h4>
                             <div className="space-y-4">
                                 <div className="flex justify-between items-center">
                                     <span className="text-sm font-bold text-gray-600">Total Booked</span>
                                     <span className="text-xl font-bold text-indigo-600">{queue.length}</span>
                                 </div>
                                 <div className="flex justify-between items-center">
                                     <span className="text-sm font-bold text-gray-600">To Confirm</span>
                                     <span className="text-xl font-bold text-orange-500">{queue.filter(a => a.status === 'Pending_Confirmation').length}</span>
                                 </div>
                                 <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                                     <span className="text-sm font-bold text-green-600">Completed</span>
                                     <span className="text-xl font-bold text-green-600">{queue.filter(a => a.status === 'Completed').length}</span>
                                 </div>
                             </div>
                         </div>
                    </div>

                </div>
            )}
        </div>
    );
}

export default DashboardGlobalReception;