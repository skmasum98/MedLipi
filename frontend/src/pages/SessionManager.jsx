import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../hooks/useAuth';

const VITE_API_URL = import.meta.env.VITE_API_URL;

function SessionManager() {
    const { token } = useAuth();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newSession, setNewSession] = useState({
        date: '',
        session_name: 'Morning',
        start_time: '09:00',
        end_time: '13:00',
        max_patients: 30
    });

    const fetchSessions = async () => {
        try {
            const res = await fetch(`${VITE_API_URL}/schedules/available`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setSessions(await res.json());
        } catch (e) { console.error(e); } 
        finally { setLoading(false); }
    };

    useEffect(() => { fetchSessions(); }, [token]);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${VITE_API_URL}/schedules/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(newSession)
            });
            if (res.ok) {
                alert('Session Created Successfully');
                fetchSessions();
                // Optional: Reset form or date to next day
            }
        } catch (e) { alert('Error creating session'); }
    };

    return (
        <div className="max-w-6xl mx-auto p-6 my-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 border-b border-gray-200 pb-4 gap-4">
                <div>
                    <h2 className="text-3xl font-extrabold text-gray-900">Manage Sessions</h2>
                    <p className="text-gray-500 text-sm mt-1">Open slots for patient bookings.</p>
                </div>
                <Link to="/appointments" className="text-indigo-600 hover:text-indigo-800 font-medium text-sm flex items-center gap-1">
                    &larr; Back to Schedule
                </Link>
            </div>

            {/* Create Session Card */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden mb-10">
                <div className="bg-indigo-50 px-6 py-4 border-b border-indigo-100 flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                    <h3 className="font-bold text-indigo-900">Create New Session</h3>
                </div>
                
                <form onSubmit={handleCreate} className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                        
                        {/* Date */}
                        <div className="md:col-span-3">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date</label>
                            <input 
                                type="date" 
                                required 
                                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all" 
                                value={newSession.date} 
                                onChange={(e) => setNewSession({...newSession, date: e.target.value})} 
                            />
                        </div>

                        {/* Shift */}
                        <div className="md:col-span-3">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Shift Name</label>
                            <select 
                                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all" 
                                value={newSession.session_name} 
                                onChange={(e) => setNewSession({...newSession, session_name: e.target.value})}
                            >
                                <option>Morning</option>
                                <option>Afternoon</option>
                                <option>Evening</option>
                                <option>Night</option>
                            </select>
                        </div>

                        {/* Time Range */}
                        <div className="md:col-span-4">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Duration (Start - End)</label>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="time" 
                                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-center font-mono" 
                                    value={newSession.start_time} 
                                    onChange={(e) => setNewSession({...newSession, start_time: e.target.value})} 
                                />
                                <span className="text-gray-400 font-bold">-</span>
                                <input 
                                    type="time" 
                                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-center font-mono" 
                                    value={newSession.end_time} 
                                    onChange={(e) => setNewSession({...newSession, end_time: e.target.value})} 
                                />
                            </div>
                        </div>

                        {/* Capacity */}
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Capacity</label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg pl-8" 
                                    value={newSession.max_patients} 
                                    onChange={(e) => setNewSession({...newSession, max_patients: e.target.value})} 
                                />
                                <span className="absolute left-3 top-2.5 text-gray-400">#</span>
                            </div>
                        </div>

                        {/* Submit */}
                        <div className="md:col-span-12 flex justify-end mt-2">
                            <button 
                                type="submit" 
                                className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-lg shadow-md hover:bg-indigo-700 transform hover:-translate-y-0.5 transition-all flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                Create Session
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {/* Available Sessions List */}
            <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">{sessions.length}</span> 
                    Active Sessions
                </h3>
            </div>

            {loading ? (
                <div className="text-center p-12 bg-gray-50 rounded-lg text-gray-500 border border-dashed border-gray-300">Loading schedules...</div>
            ) : sessions.length === 0 ? (
                <div className="text-center p-12 bg-gray-50 rounded-lg text-gray-500 border border-dashed border-gray-300">
                    No active sessions found. Create one above to start accepting bookings.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sessions.map(s => {
                        const percentage = Math.min((s.booked_count / s.max_patients) * 100, 100);
                        const isFull = s.booked_count >= s.max_patients;

                        return (
                            <div key={s.schedule_id} className={`bg-white rounded-xl shadow-sm border transition-shadow hover:shadow-md ${isFull ? 'border-red-100 bg-red-50/30' : 'border-gray-200'}`}>
                                <div className="p-5">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <p className="text-sm font-bold text-gray-400 uppercase tracking-wide">{s.session_name}</p>
                                            <h4 className="text-xl font-extrabold text-gray-900">
                                                {new Date(s.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric'})}
                                            </h4>
                                        </div>
                                        <div className={`px-2 py-1 rounded text-xs font-bold uppercase ${isFull ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                            {isFull ? 'Full' : 'Open'}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 text-gray-600 text-sm mb-4">
                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                        <span>{s.start_time.substring(0,5)} - {s.end_time.substring(0,5)}</span>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="mt-4">
                                        <div className="flex justify-between text-xs font-medium mb-1">
                                            <span className={isFull ? 'text-red-600' : 'text-indigo-600'}>{s.booked_count} Booked</span>
                                            <span className="text-gray-400">{s.max_patients} Capacity</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                                            <div 
                                                className={`h-2.5 rounded-full transition-all duration-500 ${isFull ? 'bg-red-500' : 'bg-indigo-500'}`} 
                                                style={{ width: `${percentage}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                                {/* Footer Action (Optional) */}
                                {/* <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex justify-end">
                                    <button className="text-xs text-gray-500 hover:text-gray-800 font-medium">View Bookings &rarr;</button>
                                </div> */}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default SessionManager;