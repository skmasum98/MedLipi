import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

const VITE_API_URL = import.meta.env.VITE_API_URL;

function Appointments() {
    const { token } = useAuth();
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // Default Today
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(false);

    // Fetch on Date Change
    useEffect(() => {
        const fetchApps = async () => {
            setLoading(true);
            try {
                const res = await fetch(`${VITE_API_URL}/appointments?date=${date}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) setAppointments(await res.json());
            } catch (e) { console.error(e); } 
            finally { setLoading(false); }
        };
        fetchApps();
    }, [date, token]);

    const updateStatus = async (id, status) => {
        try {
            await fetch(`${VITE_API_URL}/appointments/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status })
            });
            // Update UI locally
            setAppointments(prev => prev.map(a => a.appointment_id === id ? { ...a, status } : a));
        } catch (e) { alert('Failed to update status'); }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 my-8">
            <h2 className="text-2xl font-bold text-indigo-700 mb-6">Appointment & Follow-up Scheduler</h2>

            {/* Date Picker */}
            <div className="flex items-center gap-4 mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <label className="font-semibold text-gray-700">Select Date:</label>
                <input 
                    type="date" 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)} 
                    className="border border-gray-300 rounded-md p-2 focus:ring-indigo-500"
                />
                <button onClick={() => setDate(new Date().toISOString().split('T')[0])} className="text-sm text-indigo-600 hover:underline">
                    Jump to Today
                </button>
            </div>

            {/* List */}
            <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Patient</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Type / Time</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Action</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan="4" className="p-8 text-center text-gray-500">Loading...</td></tr>
                        ) : appointments.length === 0 ? (
                            <tr><td colSpan="4" className="p-8 text-center text-gray-500">No appointments for this date.</td></tr>
                        ) : (
                            appointments.map(app => (
                                <tr key={app.appointment_id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-bold text-gray-900">{app.patient_name}</div>
                                        <div className="text-xs text-gray-500">{app.mobile}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className={`text-xs font-semibold px-2 py-1 rounded-full w-fit ${app.source === 'Auto-Followup' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                                            {app.source}
                                        </div>
                                        <div className="text-sm text-gray-600 mt-1">{app.visit_time ? app.visit_time : 'Time not set'}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                            ${app.status === 'Completed' ? 'bg-green-100 text-green-800' : 
                                              app.status === 'Cancelled' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                            {app.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm font-medium">
                                        {app.status !== 'Completed' && (
                                            <button onClick={() => updateStatus(app.appointment_id, 'Completed')} className="text-green-600 hover:text-green-900 mr-4">
                                                Mark Done
                                            </button>
                                        )}
                                        <button className="text-indigo-600 hover:text-indigo-900">View</button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default Appointments;