import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import Modal from '../components/Modal'; // Reuse your Modal component

const VITE_API_URL = import.meta.env.VITE_API_URL;

function Appointments() {
    const { token } = useAuth();
    
    // States
    const [viewMode, setViewMode] = useState('upcoming');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]); 
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(false);

    // Editing State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedAppt, setSelectedAppt] = useState(null); // The appointment being edited
    const [editForm, setEditForm] = useState({
        visit_date: '',
        visit_time: '',
        status: '',
        reason: ''
    });

    // --- Fetch Logic ---
    const fetchApps = async () => {
        setLoading(true);
        try {
            const query = viewMode === 'upcoming' ? `type=upcoming` : `date=${date}`;
            const res = await fetch(`${VITE_API_URL}/appointments?${query}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setAppointments(await res.json());
        } catch (e) { console.error(e); } 
        finally { setLoading(false); }
    };

    useEffect(() => { fetchApps(); }, [date, viewMode, token]);


    // --- Handlers ---
    const openManageModal = (appt) => {
        setSelectedAppt(appt);
        // Pre-fill form (Ensure time is HH:MM format)
        setEditForm({
            visit_date: appt.visit_date.split('T')[0],
            visit_time: appt.visit_time ? appt.visit_time.substring(0, 5) : '',
            status: appt.status,
            reason: appt.reason || ''
        });
        setIsEditModalOpen(true);
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${VITE_API_URL}/appointments/${selectedAppt.appointment_id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(editForm)
            });
            
            if (res.ok) {
                alert('Appointment Updated');
                setIsEditModalOpen(false);
                fetchApps(); // Refresh list
            }
        } catch (error) { alert('Update failed'); }
    };

    const handleDelete = async () => {
        if (!window.confirm("Are you sure you want to permanently DELETE this appointment?")) return;
        try {
            await fetch(`${VITE_API_URL}/appointments/${selectedAppt.appointment_id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setIsEditModalOpen(false);
            fetchApps(); // Refresh list
        } catch (error) { alert('Delete failed'); }
    };

    // Helper for Status Colors
    const getStatusColor = (status) => {
        switch(status) {
            case 'Completed': return 'bg-green-100 text-green-800';
            case 'Cancelled': return 'bg-red-100 text-red-800';
            case 'Pending_Followup': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-blue-100 text-blue-800'; // Scheduled
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-6 my-8">
            <h2 className="text-3xl font-bold text-indigo-700 mb-6 border-b pb-2">Schedule & Follow-ups</h2>

            {/* --- CONTROLS --- */}
            <div className="flex flex-col md:flex-row gap-4 mb-8 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button 
                        onClick={() => setViewMode('upcoming')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${viewMode === 'upcoming' ? 'bg-white text-indigo-700 shadow' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        All Upcoming
                    </button>
                    <button 
                        onClick={() => setViewMode('date')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${viewMode === 'date' ? 'bg-white text-indigo-700 shadow' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Specific Date
                    </button>
                </div>

                {viewMode === 'date' && (
                    <div className="flex items-center gap-3 animate-fade-in">
                        <input 
                            type="date" 
                            value={date} 
                            onChange={(e) => setDate(e.target.value)} 
                            className="border border-gray-300 rounded-md p-2 focus:ring-indigo-500 outline-none text-sm"
                        />
                        <button onClick={() => setDate(new Date().toISOString().split('T')[0])} className="text-xs text-indigo-600 hover:underline">Today</button>
                    </div>
                )}
            </div>

            {/* --- LIST --- */}
            <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Date / Time</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Patient</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Reason / Source</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Manage</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan="5" className="p-10 text-center text-gray-500">Loading schedule...</td></tr>
                        ) : appointments.length === 0 ? (
                            <tr><td colSpan="5" className="p-10 text-center text-gray-500">No appointments found.</td></tr>
                        ) : (
                            appointments.map(app => (
                                <tr key={app.appointment_id} className="hover:bg-indigo-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-bold text-gray-900">
                                            {new Date(app.visit_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                        </div>
                                        <div className="text-xs text-gray-500 font-mono font-bold">
                                            {app.visit_time ? (
                                                <span className="text-indigo-600 bg-indigo-50 px-1 rounded">{app.visit_time.substring(0, 5)}</span>
                                            ) : (
                                                <span className="text-orange-500">Set Time</span>
                                            )}
                                        </div>
                                    </td>

                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-gray-900">{app.patient_name}</div>
                                        <div className="text-xs text-gray-500">{app.mobile}</div>
                                    </td>

                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-900 truncate max-w-[150px]">{app.reason}</div>
                                        <span className="text-[10px] uppercase font-bold text-gray-400">{app.source}</span>
                                    </td>

                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(app.status)}`}>
                                            {app.status.replace('_', ' ')}
                                        </span>
                                    </td>

                                    <td className="px-6 py-4 text-right text-sm font-medium">
                                        <button 
                                            onClick={() => openManageModal(app)} 
                                            className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded transition-colors"
                                        >
                                            Manage
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* --- MANAGE MODAL --- */}
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Manage Appointment">
                {selectedAppt && (
                    <form onSubmit={handleUpdate} className="flex flex-col gap-4">
                        <div className="bg-gray-50 p-3 rounded text-sm mb-2 border border-gray-200">
                            <p><strong>Patient:</strong> {selectedAppt.patient_name}</p>
                            <p className="text-gray-500">{selectedAppt.mobile}</p>
                        </div>

                        {/* Date & Time Row */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date</label>
                                <input 
                                    type="date" 
                                    required
                                    className="w-full p-2 border border-gray-300 rounded focus:ring-indigo-500"
                                    value={editForm.visit_date}
                                    onChange={(e) => setEditForm({...editForm, visit_date: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Time</label>
                                <input 
                                    type="time" 
                                    className="w-full p-2 border border-gray-300 rounded focus:ring-indigo-500"
                                    value={editForm.visit_time}
                                    onChange={(e) => setEditForm({...editForm, visit_time: e.target.value})}
                                />
                            </div>
                        </div>

                        {/* Status */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
                            <select 
                                className="w-full p-2 border border-gray-300 rounded bg-white"
                                value={editForm.status}
                                onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                            >
                                <option value="Scheduled">Scheduled</option>
                                <option value="Completed">Completed</option>
                                <option value="Pending_Followup">Pending Follow-up</option>
                                <option value="Cancelled">Cancelled</option>
                            </select>
                        </div>

                        {/* Reason */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Note / Reason</label>
                            <textarea 
                                className="w-full p-2 border border-gray-300 rounded" 
                                rows="2"
                                value={editForm.reason}
                                onChange={(e) => setEditForm({...editForm, reason: e.target.value})}
                            />
                        </div>

                        <div className="flex justify-between mt-4 pt-4 border-t border-gray-100">
                            <button 
                                type="button" 
                                onClick={handleDelete}
                                className="text-red-600 hover:text-red-800 text-sm font-medium hover:underline"
                            >
                                Delete Appointment
                            </button>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 shadow">Save Changes</button>
                            </div>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
}

export default Appointments;