import React, { useState, useEffect } from 'react';

import { useAuth } from '../../hooks/useAuth';
import WalkInEntryGlobal from '../WalkInEntryGlobal';

const VITE_API_URL = import.meta.env.VITE_API_URL;

function GlobalWalkIn() {
    const { token } = useAuth();
    const [doctors, setDoctors] = useState([]);
    const [selectedDoctorId, setSelectedDoctorId] = useState('');
    const [loading, setLoading] = useState(true);

    // Load All Doctors List for the Global Receptionist Dropdown
    useEffect(() => {
        const fetchDoctors = async () => {
            try {
                // Re-use public doctors endpoint (lightweight list) or admin specific
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
            <div className="bg-indigo-900 text-white p-8 shadow-md">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <h1 className="text-3xl font-extrabold flex items-center gap-3">
                            <span className="text-4xl">🏥</span> Global Walk-In Desk
                        </h1>
                        <p className="text-indigo-200 text-sm mt-1">
                            Register new patients and assign serials for ANY clinic on the platform.
                        </p>
                    </div>

                    <div className="w-full md:w-1/2 relative group">
                        <label className="text-[10px] uppercase font-bold text-indigo-300 mb-1 block tracking-wider">
                            Select Target Doctor / Clinic
                        </label>
                        <select 
                            className="w-full p-4 pr-10 rounded-xl text-gray-900 bg-white border-4 border-indigo-400 focus:border-white focus:ring-0 outline-none font-bold text-lg shadow-xl cursor-pointer transition-colors"
                            value={selectedDoctorId}
                            onChange={(e) => setSelectedDoctorId(e.target.value)}
                        >
                            <option value="">-- Click to Select Doctor --</option>
                            {doctors.map(d => (
                                <option key={d.doctor_id} value={d.doctor_id}>
                                    Dr. {d.full_name} • {d.clinic_name || 'General'}
                                </option>
                            ))}
                        </select>
                        {loading && <span className="absolute right-8 top-10 text-gray-400 text-xs">Loading list...</span>}
                        {/* Custom Dropdown Arrow */}
                        <div className="absolute right-4 top-10 pointer-events-none text-gray-500">▼</div>
                    </div>
                </div>
            </div>

            {/* 2. Main Content Area */}
            <div className="max-w-6xl mx-auto p-6 mt-4">
                
                {/* STATE 1: NO DOCTOR SELECTED */}
                {!selectedDoctorId ? (
                    <div className="flex flex-col items-center justify-center py-24 text-gray-400 border-2 border-dashed border-gray-300 rounded-3xl bg-white/50 animate-in fade-in zoom-in duration-500">
                        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center text-4xl mb-6 shadow-sm text-indigo-300">
                            👈
                        </div>
                        <h3 className="text-2xl font-bold text-gray-600">No Doctor Selected</h3>
                        <p className="text-gray-500 mt-2 max-w-md text-center">
                            Please select a doctor from the top menu to load their specific patient schedule and start booking.
                        </p>
                    </div>
                ) : (
                    // STATE 2: WIZARD LOADED
                    // Key property ensures component resets completely when doctor changes
                    <div className="animate-in slide-in-from-bottom-4 duration-500 fade-in border-t-4 border-indigo-500 rounded-t-xl overflow-hidden shadow-2xl bg-white">
                        <WalkInEntryGlobal 
                            key={selectedDoctorId} 
                            forceDoctorId={selectedDoctorId} // Passes this specific ID to the child component logic
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

export default GlobalWalkIn;