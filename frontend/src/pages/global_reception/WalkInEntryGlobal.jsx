import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../hooks/useAuth';
import { useDebounce } from '../../hooks/useDebounce';
import { getDhakaDateISO, formatDisplayDate, formatDisplayTime } from '../../utils/dateUtils';

const VITE_API_URL = import.meta.env.VITE_API_URL;

// --- ICONS ---
const UserIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const SearchIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
const CalendarIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const CheckCircleIcon = () => <svg className="w-16 h-16 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const ClockIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const PlusIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>;

function WalkInEntryGlobal({ forceDoctorId = null }) {
    const { token, doctor: user } = useAuth();
    const navigate = useNavigate();

    // --- STATES ---
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery, 400);
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [mode, setMode] = useState('search'); 
    
    const [patientData, setPatientData] = useState({ 
        name: '', mobile: '', age: '', gender: 'Male', address: '', patient_id: null 
    });

    const [sessions, setSessions] = useState([]);
    const [selectedSessionId, setSelectedSessionId] = useState(null);
    const [sessionsLoading, setSessionsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successData, setSuccessData] = useState(null); 

    // --- 1. SESSION MANAGEMENT (Extracted for reuse) ---
    const fetchSessions = async (isRefresh = false) => {
        const targetDoctorId = forceDoctorId || (user?.role === 'doctor' ? user.id : (user?.doctorId || user?.parentId));
        if (!targetDoctorId) return;

        if (!isRefresh) setSessionsLoading(true);

        try {
            const res = await fetch(`${VITE_API_URL}/schedules/available?doctor_id=${targetDoctorId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (res.ok) {
                const data = await res.json();
                const todayStr = getDhakaDateISO();
                
                const available = data.filter(s => {
                    const sDate = s.date.slice(0, 10);
                    return String(s.doctor_id) === String(targetDoctorId) &&
                           sDate >= todayStr && 
                           s.booked_count < s.max_patients;
                });
                setSessions(available);
            }
        } catch (e) {
            console.error("Session Load Error:", e);
        } finally {
            if (!isRefresh) setSessionsLoading(false);
        }
    };

    useEffect(() => { fetchSessions(); }, [token, user, forceDoctorId]);


    // --- 2. SEARCH HANDLER ---
    useEffect(() => {
        if (mode !== 'search' || debouncedSearch.length < 3) {
            setSearchResults([]);
            return;
        }

        const runSearch = async () => {
            const targetId = forceDoctorId || (user?.role === 'doctor' ? user.id : user?.doctorId);
            setIsSearching(true);
            try {
                const res = await fetch(`${VITE_API_URL}/patients?q=${debouncedSearch}&limit=5&doctor_id=${targetId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const response = await res.json();
                    setSearchResults(response.data || []);
                }
            } catch (e) { console.error(e); } 
            finally { setIsSearching(false); }
        };
        runSearch();
    }, [debouncedSearch, mode, token, forceDoctorId]);


    // --- UI HANDLERS ---
    const handleSelectPatient = (p) => {
        setPatientData({ ...p });
        setMode('selected');
        setSearchQuery('');
        setSearchResults([]);
    };

    const handleCreateNew = () => {
        const isNum = /^\d+$/.test(searchQuery);
        setPatientData({
            name: isNum ? '' : searchQuery,
            mobile: isNum ? searchQuery : '',
            age: '', gender: 'Male', address: '', patient_id: null
        });
        setMode('new');
        setSearchQuery('');
        setSearchResults([]);
    };

    // FIX: REFRESH DATA ON RESET
    const handleReset = () => {
        setMode('search');
        setPatientData({ name: '', mobile: '', age: '', gender: 'Male', address: '', patient_id: null });
        setSearchQuery('');
        setSearchResults([]);
        setSuccessData(null);
        // Refresh Session Data to update the 'Seats Left' count immediately
        fetchSessions(true);
    };

    // --- BOOKING SUBMISSION ---
    const handleConfirmBooking = async () => {
        if (!selectedSessionId) return alert("Please select a time slot.");

        // Form Validation for New Patients
        if (!patientData.patient_id) {
            if (!patientData.name || !patientData.mobile || !patientData.age) {
                return alert("Missing Data: Name, Mobile, and Age are required.");
            }
        }

        setIsSubmitting(true);
        try {
            let targetPatientId = patientData.patient_id;

            // Step A: Create Patient if needed
            if (!targetPatientId) {
                const regRes = await fetch(`${VITE_API_URL}/portal/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...patientData, address: patientData.address || 'Walk-in' })
                });
                const regData = await regRes.json();
                if (!regRes.ok) throw new Error(regData.message || 'Registration failed');
                targetPatientId = regData.patient.id;
            }

            // Step B: Book Appointment
            const bookRes = await fetch(`${VITE_API_URL}/schedules/book-serial`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ schedule_id: selectedSessionId, patient_id: targetPatientId })
            });

            const bookData = await bookRes.json();
            
            if (bookRes.ok) {
                // Success
                setSuccessData({
                    serial: bookData.serial,
                    patientName: patientData.name
                });
                // We do NOT navigate here, we let the modal buttons decide
            } else {
                alert(`Booking Failed: ${bookData.message}`);
            }

        } catch (error) {
            alert(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatDatePretty = (d) => new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    const prettyTime = (s, e) => `${formatDisplayTime(s)} - ${formatDisplayTime(e)}`;


    return (
        <div className="bg-gray-50 border-t border-gray-200">
            
            {/* SUCCESS MODAL */}
            {successData && (
                <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
                        <div className="flex justify-center mb-4"><CheckCircleIcon /></div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Booking Confirmed!</h2>
                        <div className="bg-green-50 rounded-lg p-4 mb-6 border border-green-100">
                            <p className="text-sm text-green-700 uppercase font-bold tracking-wider mb-1">Serial Number</p>
                            <p className="text-5xl font-extrabold text-green-600">#{successData.serial}</p>
                            <p className="text-gray-600 mt-2 font-medium">{successData.patientName}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => navigate('/greception-dashboard')} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition">
                                Dashboard
                            </button>
                            <button onClick={handleReset} className="px-4 py-2 bg-indigo-600 text-white font-medium hover:bg-indigo-700 rounded-lg transition shadow-md">
                                Next Patient
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MAIN CONTENT GRID */}
            <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 p-6">
                
                {/* Header (Context Info) */}
                <div className="lg:col-span-12 flex justify-between items-center pb-4 border-b border-gray-200 mb-2">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <span>📝</span> New Registration
                    </h2>
                    <span className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-mono border border-indigo-200">
                         Context ID: {forceDoctorId}
                    </span>
                </div>

                {/* LEFT: PATIENT FORM */}
                <div className="lg:col-span-7 space-y-4">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 relative overflow-visible z-20">
                        {/* Tab-like Header */}
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
                            <h3 className="font-bold text-gray-600 uppercase text-xs tracking-wider">Patient Details</h3>
                            {mode !== 'search' && (
                                <button onClick={handleReset} className="text-indigo-600 text-xs font-bold hover:underline">Change / Reset</button>
                            )}
                        </div>

                        <div className="p-6 rounded-b-2xl">
                            {/* SEARCH */}
                            {mode === 'search' && (
                                <div className="relative">
                                    <div className="flex gap-3 items-stretch relative z-20">
                                        <div className="relative flex-1 group">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-indigo-500"><SearchIcon /></div>
                                            <input 
                                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-lg"
                                                placeholder="Mobile Number or Name..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                autoFocus
                                            />
                                            {isSearching && <span className="absolute right-3 top-4 text-xs text-gray-400">Loading...</span>}
                                        </div>
                                        <button onClick={handleCreateNew} className="bg-indigo-600 text-white px-5 rounded-xl font-bold text-sm flex items-center gap-2">
                                            <PlusIcon /> New
                                        </button>
                                    </div>
                                    
                                    {/* DROPDOWN */}
                                    {searchResults.length > 0 && (
                                        <div className="absolute top-full left-0 w-full z-50 bg-white border border-gray-200 rounded-xl mt-2 shadow-2xl max-h-60 overflow-y-auto">
                                            {searchResults.map(p => (
                                                <div key={p.patient_id} onClick={() => handleSelectPatient(p)} className="px-4 py-3 border-b hover:bg-indigo-50 cursor-pointer flex justify-between items-center group">
                                                    <div>
                                                        <div className="font-bold text-gray-800">{p.name}</div>
                                                        <div className="text-xs text-gray-500">{p.mobile}</div>
                                                    </div>
                                                    <span className="bg-gray-100 text-gray-500 text-[10px] px-2 py-1 rounded-full">ID: {p.patient_id}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* SELECTED VIEW */}
                            {mode === 'selected' && (
                                <div className="bg-indigo-50 rounded-xl p-5 border border-indigo-100 flex items-start gap-4">
                                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-indigo-600 font-bold text-xl shadow-sm">{patientData.name.charAt(0)}</div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">{patientData.name}</h3>
                                        <p className="text-sm text-gray-600">{patientData.mobile} • {patientData.age} • {patientData.gender}</p>
                                    </div>
                                </div>
                            )}

                            {/* CREATE VIEW */}
                            {mode === 'new' && (
                                <div className="grid grid-cols-2 gap-4 animate-in fade-in">
                                    <h4 className="col-span-2 text-xs font-bold text-indigo-600 uppercase tracking-wide mb-1">New Entry</h4>
                                    <div className="col-span-2 md:col-span-1">
                                        <input className="w-full p-2.5 border rounded-lg bg-gray-50 focus:bg-white" placeholder="Name" value={patientData.name} onChange={e=>setPatientData({...patientData, name:e.target.value})} />
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <input className="w-full p-2.5 border rounded-lg font-mono bg-gray-50 focus:bg-white" placeholder="Mobile" value={patientData.mobile} onChange={e=>setPatientData({...patientData, mobile:e.target.value})} />
                                    </div>
                                    <div className="col-span-1">
                                        <input className="w-full p-2.5 border rounded-lg bg-gray-50 focus:bg-white" placeholder="Age" value={patientData.age} onChange={e=>setPatientData({...patientData, age:e.target.value})} />
                                    </div>
                                    <div className="col-span-1">
                                        <select className="w-full p-2.5 border rounded-lg bg-white" value={patientData.gender} onChange={e=>setPatientData({...patientData, gender:e.target.value})}><option>Male</option><option>Female</option><option>Other</option></select>
                                    </div>
                                    <div className="col-span-2">
                                        <textarea rows="1" className="w-full p-2.5 border rounded-lg bg-gray-50 focus:bg-white" placeholder="Address" value={patientData.address} onChange={e=>setPatientData({...patientData, address:e.target.value})} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* === RIGHT: SCHEDULE === */}
                <div className="lg:col-span-5 relative z-10">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 h-[calc(100vh-16rem)] min-h-[500px] flex flex-col">
                        <div className="p-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50 rounded-t-2xl">
                            <CalendarIcon />
                            <h3 className="font-bold text-gray-700">Available Slots</h3>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {sessionsLoading ? <div className="text-center py-10 text-gray-400">Loading...</div> :
                             sessions.length === 0 ? <div className="text-center py-10 text-gray-400 border border-dashed rounded">No Sessions Found.</div> :
                             
                             sessions.map(s => {
                                 const isFull = s.booked_count >= s.max_patients;
                                 const isSelected = selectedSessionId === s.schedule_id;
                                 return (
                                     <div key={s.schedule_id}
                                        onClick={() => !isFull && setSelectedSessionId(s.schedule_id)}
                                        className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? 'border-green-500 bg-green-50/30' : 'bg-white border-gray-100'} ${isFull ? 'opacity-50 cursor-not-allowed' : ''}`}
                                     >
                                         <div className="flex justify-between mb-1">
                                             <span className="font-bold text-gray-800">{formatDatePretty(s.date)}</span>
                                             <span className={`text-xs font-bold px-2 rounded uppercase ${isFull ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>{isFull ? 'Full' : 'Open'}</span>
                                         </div>
                                         <div className="flex justify-between text-xs text-gray-500 font-mono">
                                             <span>{s.session_name} ({prettyTime(s.start_time, s.end_time)})</span>
                                             <span className="font-bold text-gray-800">{s.max_patients - s.booked_count} Left</span>
                                         </div>
                                         {isSelected && <div className="absolute top-2 right-2 text-green-600"><CheckCircleIcon className="w-5 h-5"/></div>}
                                     </div>
                                 )
                             })
                            }
                        </div>

                        <div className="p-4 bg-white border-t border-gray-100 rounded-b-2xl">
                            <button onClick={handleConfirmBooking} disabled={isSubmitting || !selectedSessionId || (mode==='search' && !patientData.patient_id)}
                                className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all ${isSubmitting || (!selectedSessionId) ? 'bg-gray-300' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                            >
                                {isSubmitting ? 'Confirming...' : 'CONFIRM TICKET'}
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

export default WalkInEntryGlobal;