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

    // Manage Patient List Modal
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
                
                // --- FIX: Filter out expired sessions immediately ---
                const todayStr = new Date().toISOString().split('T')[0];
                const activeSessions = data.filter(s => {
                    const sessionDate = s.date.toString().substring(0, 10);
                    // Show Today and Future
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

    // 5. Load Bookings (For Modal)
    const loadSessionBookings = async (scheduleId) => {
        setViewingScheduleId(scheduleId);
        setApptLoading(true);
        try {
            // Reusing existing public-but-secure route structure, or ensuring this endpoint is available.
            // (Assuming endpoint from previous step: GET /schedules/global/:id/bookings OR using existing /appointments query)
            
            // NOTE: Using /appointments query param strategy (Ensure your backend 'routes/appointments.js' GET supports filtering by schedule_id + Global role)
            const res = await fetch(`${VITE_API_URL}/appointments?schedule_id=${scheduleId}`, {
                 headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (res.ok) setSessionAppointments(await res.json());
        } catch(e) { } 
        finally { setApptLoading(false); }
    };

    // 6. Cancel Booking Handler
    const handleCancelBooking = async (appointmentId) => {
        if(!confirm("Cancel this patient's booking?")) return;
        try {
            await fetch(`${VITE_API_URL}/appointments/${appointmentId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            // Update local lists
            setSessionAppointments(prev => prev.filter(a => a.appointment_id !== appointmentId));
            setSessions(prev => prev.map(s => s.schedule_id === viewingScheduleId ? {...s, booked_count: s.booked_count - 1} : s));
        } catch(e) { alert("Failed"); }
    };


    return (
        <div className="max-w-7xl mx-auto p-6 min-h-screen">
             
             {/* --- Header / Doctor Selector --- */}
             <div className="bg-white p-8 rounded-2xl shadow-lg border border-indigo-100 mb-8 relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-2 h-full bg-indigo-600"></div>
                 <h1 className="text-3xl font-extrabold text-indigo-900 mb-6 flex items-center gap-3">
                     <span className="bg-indigo-100 p-2 rounded-lg text-2xl">🌍</span> 
                     Global Schedule Manager
                 </h1>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div>
                         <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Select Clinic/Doctor</label>
                         <select 
                            className="w-full p-4 border-2 border-indigo-100 rounded-xl text-lg font-bold text-indigo-800 bg-gray-50 focus:bg-white focus:border-indigo-500 outline-none transition-all shadow-sm"
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

             {/* --- Main Management Interface --- */}
             {selectedDoctorId && (
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                     
                     {/* --- LEFT: CREATION FORM --- */}
                     <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-fit sticky top-6">
                        <h3 className="font-bold text-gray-800 border-b border-gray-100 pb-4 mb-6 flex justify-between items-center">
                            <span>Add New Schedule</span>
                            <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded">Drafting</span>
                        </h3>
                        
                        <form onSubmit={handleCreate} className="space-y-5">
                             <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Session Date</label>
                                <input 
                                    type="date" 
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 transition outline-none" 
                                    value={newSession.date} 
                                    onChange={e => setNewSession({...newSession, date: e.target.value})} 
                                    required 
                                />
                             </div>

                             <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Shift Name</label>
                                    <select 
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none" 
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
                                    <input type="time" className="w-full p-2 border rounded text-center" value={newSession.start_time} onChange={e => setNewSession({...newSession, start_time: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">End</label>
                                    <input type="time" className="w-full p-2 border rounded text-center" value={newSession.end_time} onChange={e => setNewSession({...newSession, end_time: e.target.value})} />
                                </div>
                             </div>

                             <div>
                                 <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Patient Capacity</label>
                                 <input type="number" className="w-full p-3 border rounded-lg font-mono text-lg" value={newSession.max_patients} onChange={e=>setNewSession({...newSession, max_patients: e.target.value})} />
                             </div>
                             
                             <button 
                                type="submit" 
                                disabled={submitting}
                                className={`w-full py-4 text-white font-bold rounded-xl shadow-lg transition transform active:scale-95 flex justify-center items-center gap-2 ${submitting ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                             >
                                {submitting ? "Opening..." : "+ Open Schedule"}
                             </button>
                        </form>
                     </div>

                     {/* --- RIGHT: SESSION LIST --- */}
                     <div className="lg:col-span-2">
                         <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-xl text-gray-700">Active & Upcoming</h3>
                            <span className="bg-white border px-3 py-1 rounded-full text-xs font-bold text-gray-600 shadow-sm">{sessions.length} Available</span>
                         </div>
                         
                         {loadingList ? (
                             <div className="space-y-4 animate-pulse">
                                 {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>)}
                             </div>
                         ) : sessions.length === 0 ? (
                             <div className="text-center py-12 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl text-gray-400">
                                 <p className="text-lg font-bold mb-1">No Active Sessions</p>
                                 <p className="text-sm">Expired sessions are hidden.</p>
                             </div>
                         ) : (
                             <div className="space-y-4">
                                 {sessions.map(s => {
                                     // Format Display Date
                                     const dateObj = new Date(s.date);
                                     const dateStr = dateObj.toLocaleDateString(undefined, {weekday: 'short', month:'short', day:'numeric'});
                                     
                                     // Visual state helpers
                                     const isFull = s.booked_count >= s.max_patients;
                                     const percentage = Math.round((s.booked_count / s.max_patients) * 100);

                                     return (
                                     <div key={s.schedule_id} className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center hover:shadow-md transition hover:border-indigo-200">
                                         
                                         {/* Info Block */}
                                         <div className="mb-4 md:mb-0 w-full md:w-auto">
                                             <div className="flex items-center gap-3">
                                                 <span className="bg-gray-100 text-gray-700 font-bold px-3 py-1 rounded-md text-sm font-mono tracking-wide">
                                                     {dateStr}
                                                 </span>
                                                 <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${s.session_name==='Evening' ? 'bg-indigo-50 text-indigo-700' : 'bg-orange-50 text-orange-700'}`}>
                                                     {s.session_name}
                                                 </span>
                                                  {isFull ? 
                                                    <span className="bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded font-bold uppercase">FULL</span> :
                                                    <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase">Open</span>
                                                  }
                                             </div>
                                             
                                             <div className="mt-2 text-gray-500 text-sm flex items-center gap-2">
                                                 <span className="font-mono">{formatTime(s.start_time)} - {formatTime(s.end_time)}</span>
                                                 <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                                 
                                                  {/* Mini Progress Bar */}
                                                 <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                    <div className={`h-full ${isFull ? 'bg-red-400' : 'bg-green-500'}`} style={{width: `${percentage}%`}}></div>
                                                 </div>
                                                 <span className="text-xs font-bold text-gray-600">{s.booked_count} / {s.max_patients}</span>
                                             </div>
                                         </div>
                                         
                                         {/* Buttons */}
                                         <div className="flex gap-2 self-end md:self-center">
                                             <button 
                                                onClick={() => loadSessionBookings(s.schedule_id)} 
                                                className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 px-3 py-1.5 rounded font-bold flex items-center gap-1 transition"
                                             >
                                                <span>📋</span> View List
                                             </button>
                                             
                                             <button 
                                                onClick={() => handleDelete(s.schedule_id)} 
                                                className="text-xs border border-red-200 text-red-500 hover:bg-red-50 px-3 py-1.5 rounded font-bold transition flex items-center gap-1"
                                                title="Delete this session"
                                             >
                                                <span>🗑</span>
                                             </button>
                                         </div>
                                     </div>
                                 )})}
                             </div>
                         )}
                     </div>
                 </div>
             )}

            {/* --- BOOKING LIST MODAL --- */}
            <Modal isOpen={!!viewingScheduleId} onClose={() => setViewingScheduleId(null)} title="Manage Patients in Session">
                <div className="min-w-[400px]">
                {apptLoading ? (
                    <div className="p-8 text-center text-gray-400">Loading Patient List...</div>
                ) : sessionAppointments.length === 0 ? (
                    <div className="p-8 text-center bg-gray-50 border border-dashed rounded-lg text-gray-500">
                        <span className="text-2xl block mb-1">📭</span>
                        No patients booked for this session yet.
                    </div>
                ) : (
                    <div className="max-h-[500px] overflow-y-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-100 text-xs font-bold text-gray-500 uppercase sticky top-0 z-10">
                                <tr>
                                    <th className="p-3 border-b border-gray-200">#</th>
                                    <th className="p-3 border-b border-gray-200">Name</th>
                                    <th className="p-3 border-b border-gray-200">Contact</th>
                                    <th className="p-3 border-b border-gray-200 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm divide-y divide-gray-100">
                                {sessionAppointments.map(app => (
                                    <tr key={app.appointment_id} className="hover:bg-indigo-50/50">
                                        <td className="p-3 font-mono font-bold text-gray-600">#{app.serial_number}</td>
                                        <td className="p-3 font-bold text-gray-800">{app.patient_name}</td>
                                        <td className="p-3 text-gray-500 font-mono text-xs">{app.mobile}</td>
                                        <td className="p-3 text-right">
                                            <button 
                                                onClick={() => handleCancelBooking(app.appointment_id)}
                                                className="text-[10px] bg-red-50 text-red-600 border border-red-200 px-2 py-1 rounded hover:bg-red-100 transition font-bold"
                                            >
                                                Cancel Serial
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <div className="flex justify-end pt-4 border-t border-gray-200 mt-4">
                    <button onClick={() => setViewingScheduleId(null)} className="px-5 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300">Close</button>
                </div>
                </div>
            </Modal>

        </div>
    );
}

export default GlobalSessionManager;