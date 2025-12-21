import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import Modal from '../../components/Modal';

const VITE_API_URL = import.meta.env.VITE_API_URL;

// --- Helper: Format Time ---
const formatTime = (isoTime) => {
    if(!isoTime) return '';
    const [h, m] = isoTime.split(':');
    const hours = parseInt(h);
    const suffix = hours >= 12 ? 'PM' : 'AM';
    const displayHour = ((hours + 11) % 12 + 1);
    return `${displayHour}:${m} ${suffix}`;
};

function GlobalSessionManager() {
    const { token } = useAuth();
    
    // Select Context
    const [doctors, setDoctors] = useState([]);
    const [selectedDoctorId, setSelectedDoctorId] = useState('');
    
    // Data & Loading States
    const [sessions, setSessions] = useState([]);
    const [loadingList, setLoadingList] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form
    const [newSession, setNewSession] = useState({
        date: new Date().toISOString().split('T')[0], // Default Today
        session_name: 'Morning',
        start_time: '09:00',
        end_time: '13:00',
        max_patients: 30
    });

    // Modal & Patient List
    const [viewingScheduleId, setViewingScheduleId] = useState(null); 
    const [sessionAppointments, setSessionAppointments] = useState([]); 
    const [apptLoading, setApptLoading] = useState(false);


    // 1. Load Doctor List
    useEffect(() => {
        fetch(`${VITE_API_URL}/public/doctors`)
            .then(r => r.json())
            .then(data => setDoctors(data))
            .catch(err => console.error("Failed to load doctors", err));
    }, []);

    // 2. Fetch Sessions when Doctor Changes
    const fetchSessions = async () => {
        if (!selectedDoctorId) return;
        setLoadingList(true);
        try {
            const res = await fetch(`${VITE_API_URL}/schedules/global/manage-sessions/${selectedDoctorId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if(res.ok) {
                const data = await res.json();
                
                // Filter Expired
                const todayStr = new Date().toISOString().split('T')[0];
                const activeSessions = data.filter(s => {
                    const sessionDate = s.date.toString().substring(0, 10);
                    return sessionDate >= todayStr; 
                });
                
                setSessions(activeSessions);
            }
        } catch (e) { console.error(e); } 
        finally { setLoadingList(false); }
    };

    useEffect(() => {
        setSessions([]); 
        if(selectedDoctorId) fetchSessions();
    }, [selectedDoctorId]);

    // 3. Create Session Handler
    const handleCreate = async (e) => {
        e.preventDefault();
        if(!selectedDoctorId) return alert("Select Doctor First");

        setSubmitting(true);
        try {
            const res = await fetch(`${VITE_API_URL}/schedules/global/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ 
                    ...newSession, 
                    target_doctor_id: selectedDoctorId 
                })
            });
            
            if(res.ok) { 
                alert('✅ Session Created Successfully'); 
                fetchSessions(); // Refresh list
                
                // Auto-advance date
                const nextDate = new Date(newSession.date);
                nextDate.setDate(nextDate.getDate() + 1);
                setNewSession(prev => ({...prev, date: nextDate.toISOString().split('T')[0]}));
            } else {
                alert("Failed to create session. Check overlaps.");
            }
        } catch (e) { alert("Network Error"); }
        finally { setSubmitting(false); }
    };

    // 4. Delete Handler
    const handleDelete = async (id) => {
        if(!confirm("Are you sure you want to delete this session? \nThis action cannot be undone if appointments exist.")) return;
        
        try {
            const res = await fetch(`${VITE_API_URL}/schedules/global/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if(res.ok) {
                setSessions(prev => prev.filter(s => s.schedule_id !== id));
            } else {
                alert("Cannot delete. Appointments likely exist for this slot.");
            }
        } catch (e) { alert("Delete failed"); }
    };

    // 5. Load Booking List (Modal)
    const loadSessionBookings = async (scheduleId) => {
        setViewingScheduleId(scheduleId);
        setApptLoading(true);
        try {
            const res = await fetch(`${VITE_API_URL}/appointments?schedule_id=${scheduleId}`, {
                 headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setSessionAppointments(await res.json());
        } catch(e) { } 
        finally { setApptLoading(false); }
    };

    // 6. Cancel Handler
    const handleCancelBooking = async (appointmentId) => {
        if(!confirm("Cancel this patient's booking?")) return;
        try {
            await fetch(`${VITE_API_URL}/appointments/${appointmentId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            // Update local list
            setSessionAppointments(prev => prev.filter(a => a.appointment_id !== appointmentId));
            // Optimistic update
            setSessions(prev => prev.map(s => s.schedule_id === viewingScheduleId ? {...s, booked_count: s.booked_count - 1} : s));
        } catch(e) { alert("Failed"); }
    };


    return (
        <div className="max-w-7xl mx-auto p-4 md:p-6 min-h-screen bg-slate-50 font-sans">
             
             {/* --- HEADER --- */}
             <div className="bg-white p-6 md:p-8 rounded-2xl shadow-lg border border-indigo-100 mb-8 relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-2 h-full bg-indigo-600"></div>
                 <h1 className="text-2xl md:text-3xl font-extrabold text-indigo-900 mb-6 flex items-center gap-3">
                     <span className="bg-indigo-100 p-2 rounded-lg text-2xl hidden md:inline-block">🌍</span> 
                     Global Schedule Manager
                 </h1>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div>
                         <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Select Clinic/Doctor</label>
                         <select 
                            className="w-full p-4 border-2 border-indigo-100 rounded-xl text-lg font-bold text-indigo-800 bg-gray-50 focus:bg-white focus:border-indigo-500 outline-none transition-all shadow-sm appearance-none"
                            value={selectedDoctorId}
                            onChange={(e) => setSelectedDoctorId(e.target.value)}
                         >
                             <option value="">-- Choose Target Doctor --</option>
                             {doctors.map(d => (
                                <option key={d.doctor_id} value={d.doctor_id}>
                                    Dr. {d.full_name} • {d.clinic_name || 'General Clinic'}
                                </option>
                             ))}
                         </select>
                     </div>
                     <div className="hidden md:flex items-center text-sm text-gray-500 bg-gray-50 p-4 rounded-xl border border-dashed border-gray-300">
                         <p>Select a doctor to view their active roster and open new appointment slots.</p>
                     </div>
                 </div>
             </div>

             {/* --- MANAGEMENT INTERFACE --- */}
             {selectedDoctorId && (
                 <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                     
                     {/* --- LEFT COL (4 Cols): CREATION FORM --- */}
                     <div className="lg:col-span-4 bg-white p-6 rounded-xl shadow-sm border border-gray-200 lg:sticky lg:top-6 order-2 lg:order-1">
                        <h3 className="font-bold text-gray-800 border-b border-gray-100 pb-4 mb-6 flex justify-between items-center">
                            <span>Add New Schedule</span>
                            <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded font-mono">Draft</span>
                        </h3>
                        
                        <form onSubmit={handleCreate} className="space-y-5">
                             <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Session Date</label>
                                <input 
                                    type="date" 
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 transition outline-none text-gray-700 font-medium" 
                                    value={newSession.date} 
                                    onChange={e => setNewSession({...newSession, date: e.target.value})} 
                                    required 
                                />
                             </div>

                             <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Shift Name</label>
                                    <select 
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" 
                                        value={newSession.session_name} 
                                        onChange={e => setNewSession({...newSession, session_name: e.target.value})}
                                    >
                                        <option>Morning</option>
                                        <option>Afternoon</option>
                                        <option>Evening</option>
                                        <option>Night</option>
                                        <option>Full Day</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Start</label>
                                    <input type="time" className="w-full p-2 border border-gray-200 bg-gray-50 rounded-lg text-center text-sm font-medium" value={newSession.start_time} onChange={e => setNewSession({...newSession, start_time: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">End</label>
                                    <input type="time" className="w-full p-2 border border-gray-200 bg-gray-50 rounded-lg text-center text-sm font-medium" value={newSession.end_time} onChange={e => setNewSession({...newSession, end_time: e.target.value})} />
                                </div>
                             </div>

                             <div>
                                 <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Patient Capacity</label>
                                 <div className="relative">
                                    <input type="number" className="w-full p-3 pl-8 bg-gray-50 border border-gray-200 rounded-lg font-mono text-lg font-bold text-gray-700 focus:bg-white transition" value={newSession.max_patients} onChange={e=>setNewSession({...newSession, max_patients: e.target.value})} />
                                    <span className="absolute left-3 top-3.5 text-gray-400 text-sm">#</span>
                                 </div>
                             </div>
                             
                             <button 
                                type="submit" 
                                disabled={submitting}
                                className={`w-full py-3.5 text-white font-bold rounded-xl shadow-lg transition transform active:scale-95 flex justify-center items-center gap-2 mt-4 ${submitting ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                             >
                                {submitting ? "Processing..." : "+ Open Schedule"}
                             </button>
                        </form>
                     </div>

                     {/* --- RIGHT COL (8 Cols): SESSION LIST --- */}
                     <div className="lg:col-span-8 order-1 lg:order-2">
                         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-2">
                            <h3 className="font-bold text-xl text-gray-700">Active Schedules</h3>
                            <span className="bg-white border px-3 py-1 rounded-full text-xs font-bold text-gray-600 shadow-sm">{sessions.length} Slots Available</span>
                         </div>
                         
                         {loadingList ? (
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
                                 {[1,2,3,4].map(i => <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>)}
                             </div>
                         ) : sessions.length === 0 ? (
                             <div className="text-center py-16 bg-white border-2 border-dashed border-gray-200 rounded-2xl">
                                 <p className="text-4xl mb-4 opacity-30">📅</p>
                                 <p className="text-lg font-bold text-gray-400 mb-1">No Active Sessions</p>
                                 <p className="text-sm text-gray-400">Create a schedule using the form.</p>
                             </div>
                         ) : (
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 {sessions.map(s => {
                                     const dateStr = s.date.toString().substring(0, 10);
                                     
                                     return (
                                     <div key={s.schedule_id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all duration-300 hover:border-indigo-200 flex flex-col justify-between">
                                         
                                         <div>
                                            {/* Date Header */}
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-gray-100 text-gray-700 font-bold px-3 py-1.5 rounded-lg text-sm font-mono tracking-wide border border-gray-200 shadow-sm">
                                                        {dateStr}
                                                    </div>
                                                    <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded border ${s.session_name==='Evening' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-orange-50 text-orange-700 border-orange-100'}`}>
                                                        {s.session_name}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Time Info */}
                                            <div className="flex items-center gap-2 text-gray-600 text-sm mb-5 bg-gray-50 p-2 rounded-lg border border-gray-100 w-fit">
                                                <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                                <span className="font-mono font-medium">{formatTime(s.start_time)} - {formatTime(s.end_time)}</span>
                                            </div>
                                         </div>
                                         
                                         {/* Footer Stats & Actions */}
                                         <div className="border-t border-gray-100 pt-3 mt-1 flex justify-between items-center">
                                              <div className="text-xs">
                                                  <span className="block text-gray-400 uppercase font-bold mb-0.5">Capacity</span>
                                                  <span className="text-lg font-extrabold text-gray-800">{s.booked_count} <span className="text-gray-400 text-xs font-medium">/ {s.max_patients}</span></span>
                                              </div>
                                              
                                              <div className="flex gap-2">
                                                 <button 
                                                    onClick={() => loadSessionBookings(s.schedule_id)} 
                                                    className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1 transition"
                                                 >
                                                    View List
                                                 </button>
                                                 
                                                 <button 
                                                    onClick={() => handleDelete(s.schedule_id)} 
                                                    className="bg-white hover:bg-red-50 text-gray-400 hover:text-red-500 border border-gray-200 hover:border-red-200 p-1.5 rounded-lg transition"
                                                    title="Delete"
                                                 >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                                 </button>
                                              </div>
                                         </div>
                                     </div>
                                 )})}
                             </div>
                         )}
                     </div>
                 </div>
             )}

            {/* --- BOOKING LIST MODAL (Responsive Table) --- */}
            <Modal isOpen={!!viewingScheduleId} onClose={() => setViewingScheduleId(null)} title="Session Bookings">
                <div className="w-full min-w-[300px] md:min-w-[500px]">
                {apptLoading ? (
                    <div className="p-8 text-center text-gray-400 animate-pulse">Loading list...</div>
                ) : sessionAppointments.length === 0 ? (
                    <div className="p-8 text-center bg-gray-50 border border-dashed rounded-lg text-gray-500 mx-4 my-2">
                        <span className="text-2xl block mb-2">📭</span>
                        <p>No bookings yet for this session.</p>
                    </div>
                ) : (
                    <div className="max-h-[500px] overflow-y-auto px-1">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase sticky top-0 z-10">
                                <tr>
                                    <th className="p-3 border-b border-gray-100 rounded-tl-lg">#</th>
                                    <th className="p-3 border-b border-gray-100">Patient</th>
                                    <th className="hidden sm:table-cell p-3 border-b border-gray-100">Contact</th>
                                    <th className="p-3 border-b border-gray-100 rounded-tr-lg text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm divide-y divide-gray-50">
                                {sessionAppointments.map(app => (
                                    <tr key={app.appointment_id} className="hover:bg-indigo-50/50 transition-colors">
                                        <td className="p-3 font-mono font-bold text-gray-500 bg-gray-50/30 w-12 text-center">{app.serial_number}</td>
                                        <td className="p-3 font-bold text-gray-800">
                                            {app.patient_name}
                                            <span className="block sm:hidden text-xs text-gray-400 font-normal mt-0.5">{app.mobile}</span>
                                        </td>
                                        <td className="hidden sm:table-cell p-3 text-gray-500 font-mono text-xs">{app.mobile}</td>
                                        <td className="p-3 text-right">
                                            <button 
                                                onClick={() => handleCancelBooking(app.appointment_id)}
                                                className="text-[10px] font-bold text-red-500 border border-red-100 bg-red-50 px-2 py-1 rounded hover:bg-red-600 hover:text-white transition shadow-sm"
                                            >
                                                Cancel
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <div className="flex justify-end p-4 border-t border-gray-100 mt-2 bg-gray-50 rounded-b-xl">
                    <button onClick={() => setViewingScheduleId(null)} className="px-5 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-bold text-sm hover:bg-gray-100 transition shadow-sm">Close View</button>
                </div>
                </div>
            </Modal>
        </div>
    );
}

export default GlobalSessionManager;