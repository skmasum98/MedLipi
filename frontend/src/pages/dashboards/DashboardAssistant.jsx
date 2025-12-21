import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router'; 
import { useAuth } from '../../hooks/useAuth';

const VITE_API_URL = import.meta.env.VITE_API_URL;

function DashboardAssistant() {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [queue, setQueue] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchQueue = async () => {
            const today = new Date().toLocaleDateString('en-CA');
            try {
                const res = await fetch(`${VITE_API_URL}/appointments?date=${today}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if(res.ok) setQueue(await res.json());
            } catch (error) { console.error(error); }
            finally { setLoading(false); }
        };
        fetchQueue();
    }, [token]);

    const handleStartPrep = (patient) => {
        // Navigate to Prescription Form in "Prep Mode"
        navigate('/assistant/vitals', { 
            state: { patientData: patient, queueMode: true, isAssistant: true } 
        });
    };
    
    // Filter active queue (Checked In / Arrived)
    const activeQueue = queue.filter(p => p.status === 'Waiting' || p.status === 'Confirmed');

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 min-h-screen">
            
            {/* Header / Stats */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                 <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-teal-800 tracking-tight">Patient Prep</h1>
                    <p className="text-teal-600/70 text-sm">Vitals & Assessment Station</p>
                 </div>
                 
                 <div className="bg-white p-3 md:p-4 rounded-xl shadow-sm border border-teal-100 flex items-center gap-4">
                     <div className="bg-teal-50 text-teal-600 rounded-lg p-2 md:p-3 text-xl shadow-inner font-bold">
                        🕒
                     </div>
                     <div>
                         <p className="text-xs uppercase font-bold text-gray-400 tracking-wider">Waiting</p>
                         <p className="text-xl md:text-2xl font-extrabold text-gray-800">{activeQueue.length}</p>
                     </div>
                 </div>
            </div>
             
             {/* List Container */}
             <div className="bg-white rounded-2xl shadow-lg border border-teal-50 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <span className="font-bold text-gray-700 text-sm uppercase tracking-wide">Ready for Vitals</span>
                    {loading && <span className="text-xs text-gray-400 animate-pulse">Syncing...</span>}
                </div>
                
                {/* List Content */}
                <div className="divide-y divide-gray-100">
                    {loading ? (
                         <div className="p-10 text-center text-gray-400 text-sm">Loading queue data...</div>
                    ) : activeQueue.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="bg-teal-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 text-3xl">☕</div>
                            <h3 className="font-bold text-gray-800 text-lg">No Patients Waiting</h3>
                            <p className="text-sm text-gray-500 mt-1">Great job! The queue is currently clear.</p>
                        </div>
                    ) : (
                        activeQueue.map(p => (
                            <div key={p.appointment_id} className="group p-5 hover:bg-teal-50/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-l-4 border-transparent hover:border-teal-500">
                                
                                {/* Patient Info */}
                                <div className="flex gap-4 items-start sm:items-center">
                                    <div className="h-12 w-12 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-extrabold text-lg shadow-sm border-2 border-white ring-2 ring-teal-50 shrink-0">
                                        #{p.serial_number || '?'}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 text-lg group-hover:text-teal-900 transition-colors leading-tight">
                                            {p.patient_name}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-bold border border-gray-200">
                                                {p.age} Y / {p.gender}
                                            </span>
                                            {p.mobile && <span className="text-xs text-gray-400 font-mono hidden sm:inline-block">📞 {p.mobile}</span>}
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Action Button */}
                                <button 
                                    onClick={() => handleStartPrep(p)}
                                    className="w-full sm:w-auto bg-teal-600 text-white px-5 py-3 md:py-2.5 rounded-xl text-sm font-bold shadow-md hover:bg-teal-700 hover:shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                                >
                                    <span>🩺</span>
                                    <span>Take Vitals</span>
                                </button>
                            </div>
                        ))
                    )}
                </div>
             </div>
        </div>
    );
}

export default DashboardAssistant;