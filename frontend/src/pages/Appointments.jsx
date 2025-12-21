import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import Modal from '../components/Modal'; 
import { Link } from 'react-router'; // <--- FIX 1: Correct Import
import { getDhakaDateISO, formatDisplayDate, formatDisplayTime } from '../utils/dateUtils'; 

const VITE_API_URL = import.meta.env.VITE_API_URL;

function Appointments() {
    const { token } = useAuth();
    
    // States
    const [viewMode, setViewMode] = useState('upcoming');
    // FIX 2: Default date using local time logic to avoid timezone jumps on init
    const [date, setDate] = useState(() => {
        const today = new Date();
        return `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    });

    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(false);

    // Editing State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedAppt, setSelectedAppt] = useState(null); 
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
        
        // --- FIX 3: Robust Local Date Format ---
        // Ensure we parse the string from DB correctly without UTC offset issues
        const d = new Date(appt.visit_date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        // --- Auto Time Calculation ---
        let estimatedTime = '';
        if (appt.visit_time) {
            estimatedTime = appt.visit_time.substring(0, 5);
        } else if (appt.serial_number && appt.session_start) {
            // Safe logic for calculation
            const [startH, startM] = appt.session_start.split(':').map(Number);
            const totalMins = (startH * 60) + startM + ((appt.serial_number - 1) * 15);
            
            const estH = Math.floor(totalMins / 60);
            const estM = totalMins % 60;
            
            estimatedTime = `${String(estH).padStart(2,'0')}:${String(estM).padStart(2,'0')}`;
        }

        setEditForm({
            visit_date: dateStr,
            visit_time: estimatedTime,
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
                fetchApps(); 
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
            fetchApps(); 
        } catch (error) { alert('Delete failed'); }
    };

    const getStatusColor = (status) => {
        switch(status) {
            case 'Completed': return 'bg-green-100 text-green-800';
            case 'Confirmed': return 'bg-emerald-100 text-emerald-800'; 
            case 'Cancelled': return 'bg-red-100 text-red-800';
            case 'Pending_Followup': return 'bg-purple-100 text-purple-800';
            case 'Pending_Confirmation': return 'bg-orange-100 text-orange-800';
            default: return 'bg-blue-100 text-blue-800'; // Scheduled
        }
    };

    const handlePrint = () => {
        window.print();
    };

    // Use utils safely if imported, else fallback to standard
    const displayDate = (d) => new Date(d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

    return (
        <div className="max-w-6xl mx-auto p-6 my-8">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6 border-b pb-4">
                <h2 className="text-2xl sm:text-3xl font-bold text-indigo-700">
                    Schedule & Queue
                </h2>
                
                <div className="flex gap-2 w-full sm:w-auto">
                    {/* PRINT BUTTON */}
                    <button 
                        onClick={handlePrint}
                        className="inline-flex items-center justify-center text-sm font-medium
                                bg-gray-100 text-gray-700 px-4 py-2 rounded-lg border border-gray-300
                                hover:bg-gray-200 transition"
                    >
                        🖨️ Print List
                    </button>
                    
                    <Link
                        to="/session"
                        className="inline-flex items-center justify-center text-sm font-medium
                                bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg
                                hover:bg-indigo-100 transition"
                    >
                        ⚙️ Manage Sessions
                    </Link>
                </div>
            </div>
            
            {/* --- CONTROLS --- */}
            <div className="flex flex-col lg:flex-row gap-4 mb-8 bg-white p-4 rounded-2xl shadow-sm border">
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button 
                        onClick={() => setViewMode('upcoming')}
                        className={`flex-1 px-4 py-2 text-sm font-semibold rounded-lg transition ${viewMode === 'upcoming' ? 'bg-white text-indigo-700 shadow' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        All Upcoming
                    </button>
                    <button 
                        onClick={() => setViewMode('date')}
                        className={`flex-1 px-4 py-2 text-sm font-semibold rounded-lg transition ${viewMode === 'date' ? 'bg-white text-indigo-700 shadow' : 'text-gray-500 hover:text-gray-700'}`}
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
                        {/* Correct button logic to jump to today without UTC shift */}
                        <button onClick={() => {
                             const t = new Date();
                             setDate(`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`);
                        }} className="text-xs text-indigo-600 hover:underline">Today</button>
                    </div>
                )}
            </div>

            {/* --- LIST (Screen View) --- */}
            <div className="bg-white shadow rounded-xl overflow-hidden border">
                <table className="min-w-full divide-y divide-gray-200 hidden md:table">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Serial</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Date / Time</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Patient</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Action</th>
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
                                        {app.serial_number ? (
                                            <span className="text-lg font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-md">
                                                #{app.serial_number}
                                            </span>
                                        ) : <span className="text-gray-400">-</span>}
                                    </td>
                                    
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-bold text-gray-900">{displayDate(app.visit_date)}</div>
                                        <div className="text-xs text-gray-500 font-mono font-bold mt-1">
                                            {app.visit_time ? (
                                                <span className="text-indigo-600 bg-indigo-50 px-1 rounded">{app.visit_time.substring(0, 5)}</span>
                                            ) : <span className="text-orange-500 text-[10px]">TIME TBD</span>}
                                        </div>
                                    </td>

                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-gray-900">{app.patient_name}</div>
                                        <div className="text-xs text-gray-500">{app.mobile}</div>
                                        <div className="text-[10px] text-gray-400 mt-0.5">{app.reason} ({app.source})</div>
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
                                            {app.status === 'Pending_Confirmation' ? 'Confirm' : 'Manage'}
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* MOBILE CARD VIEW */}
            <div className="md:hidden space-y-4">
                {appointments.map(app => (
                    <div key={app.appointment_id} className="bg-white border rounded-xl p-4 shadow-sm space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-indigo-700">#{app.serial_number || '--'}</span>
                            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${getStatusColor(app.status)}`}>{app.status.replace('_', ' ')}</span>
                        </div>
                        <div>
                            <p className="font-semibold text-gray-900">{app.patient_name}</p>
                            <p className="text-xs text-gray-500">{app.mobile}</p>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span>📅 {displayDate(app.visit_date)}</span>
                            <span className="font-mono font-semibold text-indigo-600">⏰ {app.visit_time ? app.visit_time.substring(0,5) : 'TBD'}</span>
                        </div>
                        <button onClick={() => openManageModal(app)} className="w-full mt-2 bg-indigo-600 text-white py-2 rounded-lg font-semibold">
                            {app.status === 'Pending_Confirmation' ? 'Confirm' : 'Manage'}
                        </button>
                    </div>
                ))}
            </div>

            {/* --- MANAGE MODAL --- */}
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Manage Appointment">
                {selectedAppt && (
                    <form onSubmit={handleUpdate} className="flex flex-col gap-5 text-sm">
                        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex justify-between items-start">
                            <div>
                                <p><strong>Patient:</strong> {selectedAppt.patient_name}</p>
                                <p className="text-gray-500">{selectedAppt.mobile}</p>
                            </div>
                            {selectedAppt.serial_number && (
                                <span className="bg-indigo-600 text-white px-2 py-1 rounded text-xs font-bold">Serial #{selectedAppt.serial_number}</span>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date</label>
                                <input type="date" required className="w-full p-2 border border-gray-300 rounded focus:ring-indigo-500"
                                    value={editForm.visit_date} onChange={(e) => setEditForm({...editForm, visit_date: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Time (Est.)</label>
                                <input type="time" className="w-full p-2 border border-gray-300 rounded focus:ring-indigo-500"
                                    value={editForm.visit_time} onChange={(e) => setEditForm({...editForm, visit_time: e.target.value})} />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
                            <select className="w-full p-2 border border-gray-300 rounded bg-white" value={editForm.status} onChange={(e) => setEditForm({...editForm, status: e.target.value})}>
                                <option value="Pending_Confirmation">Pending Confirmation</option>
                                <option value="Confirmed">Confirmed</option>
                                <option value="Scheduled">Scheduled</option>
                                <option value="Completed">Completed</option>
                                <option value="Cancelled">Cancelled</option>
                                <option value="Pending_Followup">Pending Follow-up</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Note / Reason</label>
                            <textarea className="w-full p-2 border border-gray-300 rounded" rows="2" value={editForm.reason} onChange={(e) => setEditForm({...editForm, reason: e.target.value})} />
                        </div>

                        <div className="flex justify-between mt-4 pt-4 border-t border-gray-100">
                            <button type="button" onClick={handleDelete} className="text-red-600 hover:text-red-800 text-sm font-medium hover:underline">Delete</button>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 shadow">Save Changes</button>
                            </div>
                        </div>
                    </form>
                )}
            </Modal>

            {/* --- HIDDEN PRINT COMPONENT --- */}
            <div id="printable-schedule" className="hidden print:block p-8 bg-white text-black">
                <div className="mb-6 border-b pb-4">
                    <h1 className="text-3xl font-bold uppercase tracking-wide">Appointment List</h1>
                    <div className="flex justify-between mt-2 text-sm">
                        <span><strong>Date:</strong> {viewMode==='upcoming' ? `Today (${new Date().toLocaleDateString()})` : new Date(date).toLocaleDateString()}</span>
                        <span><strong>Total:</strong> {appointments.length}</span>
                    </div>
                </div>

                <table className="w-full text-left text-sm border border-gray-300">
                    <thead>
                        <tr className="bg-gray-200">
                            <th className="border border-gray-300 px-3 py-2 w-16">SL #</th>
                            <th className="border border-gray-300 px-3 py-2 w-20">Time</th>
                            <th className="border border-gray-300 px-3 py-2">Patient Details</th>
                            <th className="border border-gray-300 px-3 py-2 w-24">Status</th>
                            <th className="border border-gray-300 px-3 py-2 w-1/4">Notes / Remarks</th>
                        </tr>
                    </thead>
                    <tbody>
                        {appointments.map((app) => (
                            <tr key={app.appointment_id} className="border-b border-gray-200">
                                <td className="border border-gray-300 px-3 py-2 font-bold text-center text-lg">{app.serial_number || '-'}</td>
                                <td className="border border-gray-300 px-3 py-2 font-mono">{app.visit_time ? app.visit_time.substring(0,5) : '-'}</td>
                                <td className="border border-gray-300 px-3 py-2">
                                    <div className="font-bold">{app.patient_name}</div>
                                    <div className='flex gap-2 text-xs text-gray-600'>
                                        <div>{app.age} / {app.gender}</div>
                                        <div className="text-xs">{app.mobile}</div>
                                    </div>
                                    
                                </td>
                                <td className="border border-gray-300 px-3 py-2 uppercase text-xs font-bold">{app.status.replace('_', ' ')}</td>
                                <td className="border border-gray-300 px-3 py-2"> </td> 
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="mt-8 pt-8 border-t-2 border-black text-center text-xs">
                    Generated by MedLipi Clinic System
                </div>
            </div>

        </div>
    );
}
export default Appointments;