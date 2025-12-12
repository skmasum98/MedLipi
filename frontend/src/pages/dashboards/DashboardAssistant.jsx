import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../hooks/useAuth';

const VITE_API_URL = import.meta.env.VITE_API_URL;

function DashboardAssistant() {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [queue, setQueue] = useState([]);

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

    const handleStartPrep = (patient) => {
        // Navigate to Prescription Form in "Prep Mode"
        navigate('/prescription/new', { state: { patientData: patient, queueMode: true, isAssistant: true } });
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
             <h1 className="text-3xl font-bold text-gray-800 mb-6">Medical Assistant: Patient Prep</h1>
             
             <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b bg-gray-50 flex justify-between">
                    <span className="font-bold text-gray-700">Waiting Room</span>
                    <span className="text-sm text-gray-500">Total: {queue.filter(p => p.status === 'Waiting').length}</span>
                </div>
                
                {/* List of Patients Marked as 'Waiting' (Checked In) */}
                <div className="divide-y divide-gray-100">
                    {queue.filter(p => p.status === 'Waiting' || p.status === 'Confirmed').map(p => (
                        <div key={p.appointment_id} className="p-4 flex items-center justify-between hover:bg-green-50 transition">
                            <div className="flex gap-4 items-center">
                                <div className="h-10 w-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold">
                                    #{p.serial_number}
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900">{p.patient_name}</p>
                                    <p className="text-xs text-gray-500">{p.age} / {p.gender}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => handleStartPrep(p)}
                                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow hover:bg-indigo-700"
                            >
                                Take Vitals & History &rarr;
                            </button>
                        </div>
                    ))}
                    {queue.filter(p => p.status === 'Waiting').length === 0 && (
                        <div className="p-10 text-center text-gray-400">No patients currently waiting.</div>
                    )}
                </div>
             </div>
        </div>
    );
}

export default DashboardAssistant;