import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../hooks/useAuth';

const VITE_API_URL = import.meta.env.VITE_API_URL;

function DashboardReception() {
    const { token, doctor } = useAuth();
    const [queue, setQueue] = useState([]);
    const navigate = useNavigate();

    // 1. Fetch Today's Queue
    useEffect(() => {
        const fetchQueue = async () => {
            const today = new Date().toLocaleDateString('en-CA');
            const res = await fetch(`${VITE_API_URL}/appointments?date=${today}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if(res.ok) setQueue(await res.json());
        };
        fetchQueue();
    }, [token]);

    const updateStatus = async (id, status) => {
        if(!confirm(`Mark patient as ${status}?`)) return;
        await fetch(`${VITE_API_URL}/appointments/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ status })
        });
        window.location.reload(); 
    };

    return (
        <div className="max-w-6xl mx-auto p-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Front Desk: Today's Queue</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. Pending List (Needs Call/Confirm) */}
                <div className="bg-orange-50 p-4 rounded-xl border border-orange-200 h-fit">
                    <h3 className="font-bold text-orange-800 mb-4 flex items-center gap-2">
                        <span>📞</span> To Call / Confirm
                    </h3>
                    <div className="space-y-3">
                        {queue.filter(a => a.status === 'Pending_Confirmation').map(p => (
                            <div key={p.appointment_id} className="bg-white p-3 rounded shadow-sm">
                                <p className="font-bold">{p.patient_name}</p>
                                <p className="text-xs text-gray-500">{p.mobile}</p>
                                <button onClick={() => updateStatus(p.appointment_id, 'Confirmed')} className="w-full mt-2 bg-green-500 text-white text-xs py-1 rounded">Confirm Arrival</button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2. Scheduled / Confirmed (Needs Check-In) */}
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 h-fit">
                    <h3 className="font-bold text-blue-800 mb-4 flex items-center gap-2">
                         <span>🕒</span> Expected Arrivals
                    </h3>
                    <div className="space-y-3">
                        {queue.filter(a => a.status === 'Confirmed' || a.status === 'Scheduled').map(p => (
                            <div key={p.appointment_id} className="bg-white p-3 rounded shadow-sm border-l-4 border-blue-500">
                                <div className="flex justify-between">
                                    <span className="font-bold">Serial #{p.serial_number}</span>
                                    <span className="text-xs font-mono">{p.visit_time ? p.visit_time.substring(0,5) : '--:--'}</span>
                                </div>
                                <p className="text-sm mt-1">{p.patient_name}</p>
                                <button onClick={() => updateStatus(p.appointment_id, 'Waiting')} className="w-full mt-2 bg-indigo-600 text-white text-xs py-1 rounded">Check In (Arrived)</button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. Actions */}
                <div className="space-y-4">
                     <button onClick={() => navigate('/patient/register')} className="w-full py-4 bg-white border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-indigo-500 hover:text-indigo-600 font-bold transition">
                        + Register Walk-in Patient
                    </button>
                    <button onClick={() => navigate('/appointments')} className="w-full py-4 bg-white border border-gray-200 rounded-xl text-gray-700 shadow-sm font-medium">
                         View Full Schedule
                    </button>
                </div>
            </div>
        </div>
    );
}

export default DashboardReception;