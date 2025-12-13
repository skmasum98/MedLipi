import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../hooks/useAuth';

const VITE_API_URL = import.meta.env.VITE_API_URL;

function SessionManager() {
    const { token, doctor } = useAuth(); // Doctor includes role & name info
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
     const [doctorNameDisplay, setDoctorNameDisplay] = useState('');
    
    // Default Date to Today
    const [newSession, setNewSession] = useState({
        date: new Date().toISOString().split('T')[0],
        session_name: 'Evening',
        start_time: '16:00',
        end_time: '21:00',
        max_patients: 25
    });

    const fetchSessions = async () => {
        try {
            const res = await fetch(`${VITE_API_URL}/schedules/my-sessions`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSessions(data);
                
                // Set the doctor name from the first result if available
                if (data.length > 0) {
                    setDoctorNameDisplay(data[0].doctor_name);
                }
            }
        } catch (e) { /*...*/ } 
        finally { setLoading(false); }
    };

    useEffect(() => { fetchSessions(); }, [token]);

    const handleCreate = async (e) => {
        e.preventDefault();
        
        // Basic Logic: Check overlap (Frontend-side for speed)
        const conflict = sessions.some(s => 
            s.date.split('T')[0] === newSession.date && 
            s.session_name === newSession.session_name
        );
        if (conflict) {
             alert(`A ${newSession.session_name} session already exists on this date.`);
             return;
        }

        try {
            const res = await fetch(`${VITE_API_URL}/schedules/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(newSession)
            });
            if (res.ok) {
                alert('Session Created Successfully');
                fetchSessions();
                // Advance date by 1 automatically for fast multi-day creation
                const nextDate = new Date(newSession.date);
                nextDate.setDate(nextDate.getDate() + 1);
                setNewSession({...newSession, date: nextDate.toISOString().split('T')[0]});
            } else {
                 const err = await res.json();
                 alert(`Error: ${err.message}`);
            }
        } catch (e) { alert('Network Error'); }
    };

    const handleDelete = async (id) => {
        if(!window.confirm("Permanently remove this session?\n(Only allowed if no active appointments exist)")) return;
        
        try {
            const res = await fetch(`${VITE_API_URL}/schedules/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (res.ok) {
                setSessions(sessions.filter(s => s.schedule_id !== id));
            } else {
                const data = await res.json();
                alert(data.message);
            }
        } catch (e) { alert('Delete failed'); }
    };

    // Helper: Clone logic
    const cloneToForm = (session) => {
        const nextDay = new Date(session.date);
        nextDay.setDate(nextDay.getDate() + 7); // Default to +7 Days (Same day next week)
        
        setNewSession({
            date: nextDay.toISOString().split('T')[0],
            session_name: session.session_name,
            start_time: session.start_time,
            end_time: session.end_time,
            max_patients: session.max_patients
        });
        
        // Scroll to form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="max-w-7xl mx-auto p-6 bg-white rounded-xl shadow-lg border border-gray-100 m-8">
            <div className="flex justify-between items-center mb-6 pb-6 border-b">
                <div>
                    <h2 className="text-2xl font-extrabold text-indigo-900">Session Planner</h2>
                    <div className="flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded text-indigo-700 text-sm font-bold border border-indigo-100">
                             Dr. {doctorNameDisplay || 'Loading...'} 
                        </div>
                </div>
                <Link to="/appointments" className="px-4 py-2 border rounded-md text-gray-600 hover:bg-gray-50 font-medium">
                    &larr; View Appointment List
                </Link>
            </div>
            

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* 1. CREATION PANEL (Sticky) */}
                <div className="lg:col-span-1">
                    <div className="bg-indigo-50 p-6 rounded-lg border border-indigo-100 sticky top-20">
                        <h3 className="text-lg font-bold text-indigo-800 mb-4 flex items-center gap-2">
                             <span>⚡</span> New Session
                        </h3>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Date</label>
                                <input type="date" required className="w-full p-2 border border-indigo-200 rounded focus:ring-2 focus:ring-indigo-500 bg-white" value={newSession.date} onChange={(e) => setNewSession({...newSession, date: e.target.value})} />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Shift Type</label>
                                <select className="w-full p-2 border border-indigo-200 rounded focus:ring-2 focus:ring-indigo-500 bg-white" value={newSession.session_name} onChange={(e) => setNewSession({...newSession, session_name: e.target.value})}>
                                    <option>Morning</option>
                                    <option>Afternoon</option>
                                    <option>Evening</option>
                                    <option>Night</option>
                                    <option>Full Day</option>
                                </select>
                            </div>
                            
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Start</label>
                                    <input type="time" className="w-full p-2 border border-indigo-200 rounded text-center font-mono" value={newSession.start_time} onChange={(e) => setNewSession({...newSession, start_time: e.target.value})} />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">End</label>
                                    <input type="time" className="w-full p-2 border border-indigo-200 rounded text-center font-mono" value={newSession.end_time} onChange={(e) => setNewSession({...newSession, end_time: e.target.value})} />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Max Serials</label>
                                <input type="number" className="w-full p-2 border border-indigo-200 rounded" value={newSession.max_patients} onChange={(e) => setNewSession({...newSession, max_patients: e.target.value})} />
                            </div>
                            
                            <button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-lg font-bold shadow hover:bg-indigo-700 transition transform active:scale-95">
                                Add to Calendar
                            </button>
                        </form>
                    </div>
                </div>

                {/* 2. CALENDAR LIST */}
                <div className="lg:col-span-2">
                    <h3 className="font-bold text-gray-700 mb-4">Active & Upcoming Sessions for Dr. {doctorNameDisplay || 'Loading...'} </h3>
                    
                    {loading ? <div className="p-8 text-center text-gray-400">Loading...</div> : 
                    
                    <div className="space-y-4">
                        {/* Iterate sessions */}
                        {sessions.map(s => {
                             // Status Checks
                             const sessionDateStr = new Date(s.date).toISOString().split('T')[0];
                             const todayStr = new Date().toISOString().split('T')[0];
                             const isExpired = sessionDateStr < todayStr;
                             const isFull = s.booked_count >= s.max_patients;
                             const percentage = Math.round((s.booked_count / s.max_patients) * 100);

                            return (
                                <div key={s.schedule_id} className={`flex flex-col md:flex-row items-center border rounded-lg p-4 transition hover:shadow-md ${isExpired ? 'bg-gray-50 opacity-60' : 'bg-white'}`}>
                                    
                                    {/* Left: Date Block */}
                                    <div className="flex flex-col items-center justify-center p-3 rounded-md bg-gray-100 min-w-[80px]">
                                        <span className="text-xs font-bold uppercase text-gray-500">{new Date(s.date).toLocaleDateString(undefined, {weekday: 'short'})}</span>
                                        <span className="text-2xl font-bold text-gray-800">{new Date(s.date).getDate()}</span>
                                        <span className="text-xs font-bold text-gray-500">{new Date(s.date).toLocaleDateString(undefined, {month: 'short'})}</span>
                                    </div>

                                    {/* Center: Details */}
                                    <div className="flex-1 md:ml-4 text-center md:text-left my-2 md:my-0">
                                        <h4 className="font-bold text-lg text-indigo-900 flex items-center gap-2 justify-center md:justify-start">
                                            {s.session_name}
                                            {isExpired && <span className="bg-gray-200 text-gray-600 text-[10px] px-2 rounded-full uppercase">Expired</span>}
                                            {isFull && !isExpired && <span className="bg-red-100 text-red-600 text-[10px] px-2 rounded-full uppercase">Full</span>}
                                        </h4>
                                        <p className="text-gray-500 text-sm font-mono mt-1">
                                            {s.start_time.substring(0,5)} - {s.end_time.substring(0,5)}
                                        </p>
                                        
                                        {/* Simple Progress Line */}
                                        <div className="flex items-center gap-2 mt-2 text-xs">
                                            <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                <div className={`h-full ${isFull ? 'bg-red-500' : 'bg-green-500'}`} style={{width: `${percentage}%`}}></div>
                                            </div>
                                            <span className="font-bold text-gray-600">{s.booked_count} / {s.max_patients}</span>
                                        </div>
                                    </div>

                                    {/* Right: Actions */}
                                    <div className="flex md:flex-col gap-2">
                                        <button 
                                            onClick={() => cloneToForm(s)} 
                                            className="text-xs border border-indigo-200 text-indigo-600 px-3 py-1.5 rounded hover:bg-indigo-50 font-bold"
                                            title="Creates a copy for same day next week"
                                        >
                                            Copy to Next Week
                                        </button>
                                        
                                        <button 
                                            onClick={() => handleDelete(s.schedule_id)} 
                                            className="text-xs border border-red-200 text-red-500 px-3 py-1.5 rounded hover:bg-red-50 font-bold"
                                        >
                                            Delete / Cancel
                                        </button>
                                    </div>
                                </div>
                            );
                        })}

                        {sessions.length === 0 && <p className="text-center py-10 text-gray-400 border-2 border-dashed rounded-lg">No sessions found. Create your first one!</p>}
                    </div>
                    }
                </div>
            </div>
        </div>
    );
}

export default SessionManager;