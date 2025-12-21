import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import WalkInEntryGlobal from './WalkInEntryGlobal'; // Assuming this is your variant

const VITE_API_URL = import.meta.env.VITE_API_URL;

function GlobalWalkIn() {
    const { token } = useAuth();
    const [doctors, setDoctors] = useState([]);
    const [selectedDoctorId, setSelectedDoctorId] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDoctors = async () => {
            try {
                const res = await fetch(`${VITE_API_URL}/public/doctors`);
                if (res.ok) {
                    setDoctors(await res.json());
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchDoctors();
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* 1. Global Header & Doctor Selector */}
            <div className="bg-indigo-900 text-white p-6 md:p-8 shadow-md sticky top-0 z-50"> {/* sticky header */}
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-3">
                            <span className="text-3xl md:text-4xl bg-indigo-800 rounded-full w-12 h-12 flex items-center justify-center">🏥</span> 
                            <span>Global Desk</span>
                        </h1>
                        <p className="text-indigo-200 text-xs md:text-sm mt-1 max-w-sm">
                            Manage bookings for any clinic.
                        </p>
                    </div>

                    <div className="w-full md:w-1/2 lg:w-1/3 relative group">
                        <label className="text-[10px] uppercase font-bold text-indigo-300 mb-1 block tracking-wider">
                            Active Clinic / Doctor
                        </label>
                        <select 
                            className="w-full p-3 md:p-4 pr-10 rounded-xl text-gray-900 bg-white border-4 border-indigo-400 focus:border-white focus:ring-0 outline-none font-bold text-sm md:text-lg shadow-xl cursor-pointer transition-colors appearance-none"
                            value={selectedDoctorId}
                            onChange={(e) => setSelectedDoctorId(e.target.value)}
                        >
                            <option value="">-- Click to Select --</option>
                            {doctors.map(d => (
                                <option key={d.doctor_id} value={d.doctor_id}>
                                    Dr. {d.full_name} ({d.clinic_name || 'N/A'})
                                </option>
                            ))}
                        </select>
                        {loading && <span className="absolute right-10 top-9 text-gray-400 text-xs animate-pulse">Loading...</span>}
                        {/* Custom Dropdown Arrow */}
                        <div className="absolute right-4 top-1/2 translate-y-0 md:translate-y-1 pointer-events-none text-gray-500">▼</div>
                    </div>
                </div>
            </div>

            {/* 2. Main Content Area */}
            <div className="max-w-6xl mx-auto p-4 md:p-6 mt-4">
                
                {/* STATE 1: NO DOCTOR SELECTED */}
                {!selectedDoctorId ? (
                    <div className="flex flex-col items-center justify-center py-16 md:py-24 text-gray-400 border-2 border-dashed border-gray-300 rounded-3xl bg-white/50 animate-in fade-in zoom-in duration-500 mx-4 md:mx-0">
                        <div className="w-16 h-16 md:w-20 md:h-20 bg-indigo-50 rounded-full flex items-center justify-center text-3xl md:text-4xl mb-4 md:mb-6 shadow-sm text-indigo-300">
                            👈
                        </div>
                        <h3 className="text-xl md:text-2xl font-bold text-gray-600">Select Clinic</h3>
                        <p className="text-gray-500 mt-2 max-w-xs md:max-w-md text-center text-sm md:text-base">
                            Choose a doctor from the top menu to load their schedule and start registering patients.
                        </p>
                    </div>
                ) : (
                    // STATE 2: WIZARD LOADED
                    <div className="animate-in slide-in-from-bottom-4 duration-500 fade-in border-t-4 border-indigo-500 rounded-t-xl overflow-hidden shadow-2xl bg-white">
                        {/* 
                            Passing Key ensures full remount when doctor changes, 
                            preventing stale state issues between different queues.
                        */}
                        <WalkInEntryGlobal 
                            key={selectedDoctorId} 
                            forceDoctorId={selectedDoctorId} 
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

export default GlobalWalkIn;