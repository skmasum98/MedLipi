import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';

const VITE_API_URL = import.meta.env.VITE_API_URL;

function FindDoctors() {
    const navigate = useNavigate();
    const [doctors, setDoctors] = useState([]);
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Auth Check
        // const token = localStorage.getItem('patientToken');

        // useEffect(() => {
        //     if (!token) {
        //         navigate('/patient/login');
        //         return;
        //     }
    
        //     const fetchData = async () => {
        //         try {
        //             // 1. Fetch History
        //             const histRes = await fetch(`${VITE_API_URL}/portal/my-history`, {
        //                 headers: { 'Authorization': `Bearer ${token}` }
        //             });
        //             if (histRes.ok) setHistory(await histRes.json());
        //             else {
        //                 localStorage.removeItem('patientToken');
        //                 navigate('/patient/login');
        //             }
    
        //             // 2. Fetch Upcoming Status
        //              const apptRes = await fetch(`${VITE_API_URL}/portal/my-appointments`, {
        //                 headers: { 'Authorization': `Bearer ${token}` }
        //             });
        //             if (apptRes.ok) setMyAppointments(await apptRes.json());
    
        //         } catch (e) { console.error(e); } 
        //         finally { setLoading(false); }
        //     };
        //     fetchData();
        // }, [token, navigate]);

    // 1. Load Doctors on Mount
    useEffect(() => {
        const fetchDoctors = async () => {
            try {
                const res = await fetch(`${VITE_API_URL}/public/doctors`);
                if (res.ok) setDoctors(await res.json());
            } catch (e) { console.error(e); } 
            finally { setLoading(false); }
        };
        fetchDoctors();
    }, []);

    // 2. Load Schedules when a doctor is clicked
    const handleSelectDoctor = async (doctor) => {
        setSelectedDoctor(doctor);
        try {
            const res = await fetch(`${VITE_API_URL}/public/doctors/${doctor.doctor_id}/schedules`);
            if (res.ok) setSchedules(await res.json());
        } catch (e) { console.error(e); }
    };

    // 3. Handle Booking Logic
    const handleBookSerial = async (scheduleId) => {
        // If not logged in, force login
        if (!token) {
            if(window.confirm("You need to login as a patient to book an appointment. Proceed to Login?")) {
                navigate('/patient/login');
            }
            return;
        }

        // If logged in, proceed with booking
        if (!window.confirm("Confirm booking for this session?")) return;

        try {
            const res = await fetch(`${VITE_API_URL}/schedules/book-serial`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ schedule_id: scheduleId })
            });
            const data = await res.json();
            
            if (res.ok) {
                alert(`Booking Successful! Serial #${data.serial}. Check your dashboard.`);
                navigate('/my-health'); // Redirect to dashboard after success
            } else {
                alert(data.message);
            }
        } catch (e) { alert('Error booking'); }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
            
            <div className="max-w-7xl mx-auto">
                
                {/* --- VIEW 1: DOCTOR LIST --- */}
                {!selectedDoctor ? (
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 mb-8">Our Specialists</h1>
                        
                        {loading ? (
                            <div className="text-center py-10 text-gray-500">Loading doctors...</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {doctors.map(doc => (
                                    <div key={doc.doctor_id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition cursor-pointer group" onClick={() => handleSelectDoctor(doc)}>
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xl">
                                                {doc.full_name[0]}
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">Dr. {doc.full_name}</h3>
                                                <p className="text-sm text-indigo-600 font-medium">{doc.specialist_title || 'General Physician'}</p>
                                            </div>
                                        </div>
                                        <div className="text-sm text-gray-500 space-y-1 mb-6">
                                            <p>{doc.degree}</p>
                                            <p className="flex items-center gap-1">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                                {doc.clinic_name}
                                            </p>
                                        </div>
                                        <button className="w-full bg-indigo-50 text-indigo-700 font-bold py-2 rounded-lg hover:bg-indigo-100 transition">
                                            View Schedule
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    
                // {/* --- VIEW 2: DOCTOR DETAILS & SCHEDULE --- */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Profile Card */}
                        <div className="bg-white p-8 rounded-xl shadow-lg border border-indigo-50 h-fit">
                            <div className="text-center mb-6">
                                <div className="w-24 h-24 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-3xl mx-auto mb-4 shadow-lg">
                                    {selectedDoctor.full_name[0]}
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900">Dr. {selectedDoctor.full_name}</h2>
                                <p className="text-indigo-600 font-medium">{selectedDoctor.specialist_title}</p>
                            </div>
                            <div className="border-t border-gray-100 pt-6 space-y-3 text-gray-600">
                                <p><strong>Degree:</strong> {selectedDoctor.degree}</p>
                                <p><strong>Chamber:</strong> {selectedDoctor.clinic_name}</p>
                                <p className="text-sm">{selectedDoctor.chamber_address}</p>
                            </div>
                            <button 
                                onClick={() => setSelectedDoctor(null)}
                                className="mt-8 w-full border border-gray-300 text-gray-600 py-2 rounded-lg hover:bg-gray-50 transition"
                            >
                                &larr; Choose Another Doctor
                            </button>
                        </div>

                        {/* Schedule Grid */}
                        <div className="lg:col-span-2">
                            <h3 className="text-xl font-bold text-gray-800 mb-6">Available Appointment Slots</h3>
                            
                            {schedules.length === 0 ? (
                                <div className="bg-white p-10 rounded-xl border border-dashed border-gray-300 text-center text-gray-500">
                                    No open schedules found for this doctor right now.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {schedules.map(s => {
                                        const isFull = s.booked_count >= s.max_patients;
                                        return (
                                            <div key={s.schedule_id} className={`bg-white p-5 rounded-xl border flex flex-col justify-between transition-all ${isFull ? 'border-gray-200 bg-gray-50 opacity-70' : 'border-green-200 shadow-sm hover:shadow-md hover:border-green-400'}`}>
                                                <div className="mb-4">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">{s.session_name}</p>
                                                            <h4 className="text-lg font-bold text-gray-900">
                                                                {new Date(s.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric'})}
                                                            </h4>
                                                        </div>
                                                        {isFull ? (
                                                            <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-1 rounded uppercase">Full</span>
                                                        ) : (
                                                            <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded uppercase">Available</span>
                                                        )}
                                                    </div>
                                                    <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                                        {s.start_time.substring(0,5)} - {s.end_time.substring(0,5)}
                                                    </div>
                                                    <div className="mt-2 text-xs font-medium text-gray-400">
                                                        {s.booked_count} / {s.max_patients} booked
                                                    </div>
                                                </div>

                                                <button 
                                                    disabled={isFull}
                                                    onClick={() => handleBookSerial(s.schedule_id)}
                                                    className={`w-full py-2.5 rounded-lg font-bold text-sm shadow-sm transition-transform active:scale-95 ${isFull ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}`}
                                                >
                                                    {isFull ? 'No Slots' : 'Book Appointment'}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default FindDoctors;