import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { useAuth } from '../hooks/useAuth';
import { useDebounce } from '../hooks/useDebounce';

const VITE_API_URL = import.meta.env.VITE_API_URL;

// --- ICONS ---
const UserIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const SearchIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
const CalendarIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const CheckCircleIcon = () => <svg className="w-16 h-16 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const ClockIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const PlusIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>;

function WalkInEntry() {
    const { token } = useAuth();
    const navigate = useNavigate();

    // --- STATES ---
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery, 400);
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    
    // UI Mode: 'search' | 'selected' | 'new'
    const [mode, setMode] = useState('search'); 
    
    // Patient Form
    const [patientData, setPatientData] = useState({ 
        name: '', mobile: '', age: '', gender: 'Male', address: '', patient_id: null 
    });

    // Schedules
    const [sessions, setSessions] = useState([]);
    const [selectedSessionId, setSelectedSessionId] = useState(null);
    const [sessionsLoading, setSessionsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Success Modal
    const [successData, setSuccessData] = useState(null); 

    // --- 1. LOAD AVAILABLE SESSIONS ---
    useEffect(() => {
        const fetchSessions = async () => {
            try {
                const res = await fetch(`${VITE_API_URL}/schedules/available`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (res.ok) {
                    const data = await res.json();
                    const now = new Date();
                    const todayStr = now.toISOString().split('T')[0];
                    
                    const available = data.filter(s => {
                        const sDate = s.date.split('T')[0];
                        return sDate >= todayStr && s.booked_count < s.max_patients;
                    });

                    setSessions(available);
                }
            } catch (e) {
                console.error("Session Load Error:", e);
            } finally {
                setSessionsLoading(false);
            }
        };
        fetchSessions();
    }, [token]);

    // --- 2. AUTO SEARCH EFFECT ---
    useEffect(() => {
        if (mode !== 'search' || debouncedSearch.length < 3) {
            setSearchResults([]);
            return;
        }

        const runSearch = async () => {
            setIsSearching(true);
            try {
                const res = await fetch(`${VITE_API_URL}/patients?q=${debouncedSearch}&limit=5`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (res.ok) {
                    const response = await res.json();
                    setSearchResults(response.data || []);
                }
            } catch (e) {
                console.error("Search failed", e);
            } finally {
                setIsSearching(false);
            }
        };
        runSearch();
    }, [debouncedSearch, mode, token]);

    // --- HANDLERS ---

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

    const handleReset = () => {
        setMode('search');
        setPatientData({ name: '', mobile: '', age: '', gender: 'Male', address: '', patient_id: null });
        setSearchQuery('');
        setSearchResults([]);
        setSuccessData(null);
    };

    const handleConfirmBooking = async () => {
        if (!selectedSessionId) return alert("Please select a time slot.");

        if (!patientData.patient_id) {
            if (!patientData.name || !patientData.mobile || !patientData.age) {
                return alert("Name, Mobile, and Age are required for new patients.");
            }
        }

        setIsSubmitting(true);
        try {
            let targetPatientId = patientData.patient_id;

            // 1. Create Patient if New
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

            // 2. Book Serial
            const bookRes = await fetch(`${VITE_API_URL}/schedules/book-serial`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ schedule_id: selectedSessionId, patient_id: targetPatientId })
            });

            const bookData = await bookRes.json();
            
            if (bookRes.ok) {
                setSuccessData({
                    serial: bookData.serial,
                    patientName: patientData.name
                });
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

    return (
        <div className="min-h-screen bg-gray-100 p-4 md:p-8 flex justify-center items-start">
            
            {/* --- SUCCESS MODAL --- */}
            {successData && (
                <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center animate-in fade-in zoom-in duration-300">
                        <div className="flex justify-center mb-4"><CheckCircleIcon /></div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Booking Confirmed!</h2>
                        <div className="bg-green-50 rounded-lg p-4 mb-6 border border-green-100">
                            <p className="text-sm text-green-700 uppercase font-bold tracking-wider mb-1">Serial Number</p>
                            <p className="text-5xl font-extrabold text-green-600">#{successData.serial}</p>
                            <p className="text-gray-600 mt-2 font-medium">{successData.patientName}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => navigate('/reception-dashboard')} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition">
                                Dashboard
                            </button>
                            <button onClick={handleReset} className="px-4 py-2 bg-indigo-600 text-white font-medium hover:bg-indigo-700 rounded-lg transition shadow-md">
                                Next Patient
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* --- HEADER --- */}
                <div className="lg:col-span-12 flex justify-between items-center mb-2">
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <span className="bg-indigo-600 text-white p-2 rounded-lg"><UserIcon /></span>
                        Walk-in Entry
                    </h1>
                    <Link to="/reception-dashboard" className="text-gray-500 hover:text-gray-900 font-medium text-sm">Cancel</Link>
                </div>

                {/* === LEFT COLUMN: PATIENT === */}
                <div className="lg:col-span-7 space-y-4">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 relative">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
                            <h3 className="font-semibold text-gray-700">Patient Details</h3>
                            {mode !== 'search' && (
                                <button onClick={handleReset} className="text-indigo-600 text-xs font-bold hover:underline uppercase tracking-wide">
                                    Change
                                </button>
                            )}
                        </div>

                        <div className="p-6 rounded-b-2xl">
                            {/* MODE 1: SEARCH */}
                            {mode === 'search' && (
                                <div className="relative">
                                    <label className="text-sm font-medium text-gray-600 mb-2 block">Find or Register</label>
                                    
                                    {/* FLEX CONTAINER: Input + Button side-by-side */}
                                    <div className="flex gap-3 items-stretch relative z-20">
                                        <div className="relative flex-1 group">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-indigo-500">
                                                <SearchIcon />
                                            </div>
                                            <input 
                                                type="text" 
                                                autoFocus
                                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-lg"
                                                placeholder="Name or Mobile..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                            />
                                            {isSearching && (
                                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
                                                </div>
                                            )}
                                        </div>

                                        {/* BUTTON: Beside the input */}
                                        <button 
                                            onClick={handleCreateNew}
                                            className="bg-indigo-600 text-white px-5 rounded-xl font-bold text-sm shadow-md hover:bg-indigo-700 hover:shadow-lg transition-all flex items-center gap-2 whitespace-nowrap"
                                        >
                                            <PlusIcon />
                                            <span>New Patient</span>
                                        </button>
                                    </div>

                                    {/* SEARCH RESULTS DROPDOWN (Absolute, z-50) */}
                                    {(searchResults.length > 0 || (searchQuery.length > 3 && !isSearching)) && (
                                        <div className="absolute top-full left-0 w-full z-50 bg-white border border-gray-200 rounded-xl mt-2 shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
                                            {searchResults.length > 0 ? (
                                                searchResults.map(p => (
                                                    <div 
                                                        key={p.patient_id}
                                                        onClick={() => handleSelectPatient(p)}
                                                        className="px-4 py-3 border-b border-gray-50 hover:bg-indigo-50 cursor-pointer flex justify-between items-center group transition-colors"
                                                    >
                                                        <div>
                                                            <div className="font-bold text-gray-800 group-hover:text-indigo-700">{p.name}</div>
                                                            <div className="text-xs text-gray-500">{p.mobile} • {p.gender}</div>
                                                        </div>
                                                        <span className="bg-gray-100 text-gray-500 text-[10px] px-2 py-1 rounded-full font-mono">#{p.patient_id}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                // Empty State inside dropdown
                                                <div className="p-4 text-center text-gray-500 text-sm">
                                                    <p>No patient found named "{searchQuery}"</p>
                                                    <p className="text-xs mt-1 text-gray-400">Click "New Patient" to register.</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* MODE 2: EXISTING SELECTED */}
                            {mode === 'selected' && (
                                <div className="bg-indigo-50 rounded-xl p-5 border border-indigo-100 flex items-start gap-4">
                                    <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-indigo-600 font-bold text-2xl shadow-sm border border-indigo-100">
                                        {patientData.name.charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-gray-900">{patientData.name}</h3>
                                        <div className="flex flex-wrap gap-2 mt-1 text-sm text-gray-600">
                                            <span className="bg-white px-2 py-0.5 rounded border border-indigo-100">{patientData.mobile}</span>
                                            <span className="bg-white px-2 py-0.5 rounded border border-indigo-100">{patientData.age} Yrs</span>
                                            <span className="bg-white px-2 py-0.5 rounded border border-indigo-100">{patientData.gender}</span>
                                        </div>
                                        <p className="mt-3 text-xs text-gray-500 flex items-center gap-1">
                                            <span className="font-semibold">Address:</span> {patientData.address || 'N/A'}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* MODE 3: CREATE NEW */}
                            {mode === 'new' && (
                                <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-300">
                                    <div className="col-span-2 flex justify-between items-center">
                                        <h4 className="text-sm font-bold text-indigo-600 uppercase tracking-wide">New Registration</h4>
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Full Name *</label>
                                        <input className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-indigo-500 outline-none transition" value={patientData.name} onChange={(e)=>setPatientData({...patientData, name: e.target.value})} />
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Mobile *</label>
                                        <input className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-indigo-500 outline-none transition" value={patientData.mobile} onChange={(e)=>setPatientData({...patientData, mobile: e.target.value})} />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Age *</label>
                                        <input className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-indigo-500 outline-none transition" value={patientData.age} onChange={(e)=>setPatientData({...patientData, age: e.target.value})} placeholder="e.g. 25" />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Gender</label>
                                        <select className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-indigo-500 outline-none transition" value={patientData.gender} onChange={(e)=>setPatientData({...patientData, gender: e.target.value})}>
                                            <option>Male</option><option>Female</option><option>Other</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Address</label>
                                        <textarea rows="2" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-indigo-500 outline-none transition" value={patientData.address} onChange={(e)=>setPatientData({...patientData, address: e.target.value})} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* === RIGHT COLUMN: SLOT SELECTOR === */}
                <div className="lg:col-span-5 h-full">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 h-[calc(100vh-8rem)] min-h-[500px] flex flex-col sticky top-6">
                        <div className="p-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50 rounded-t-2xl">
                            <CalendarIcon className="text-indigo-600" />
                            <h3 className="font-bold text-gray-700">Available Slots</h3>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {sessionsLoading ? (
                                <div className="text-center py-10 text-gray-400 text-sm animate-pulse">Loading schedules...</div>
                            ) : sessions.length === 0 ? (
                                <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-500">
                                    No slots available for today/tomorrow.
                                </div>
                            ) : (
                                sessions.map(s => {
                                    const isFull = s.booked_count >= s.max_patients;
                                    const isSelected = selectedSessionId === s.schedule_id;
                                    const availableCount = s.max_patients - s.booked_count;

                                    return (
                                        <div
                                            key={s.schedule_id}
                                            onClick={() => !isFull && setSelectedSessionId(s.schedule_id)}
                                            className={`
                                                relative p-4 rounded-xl border-2 transition-all cursor-pointer group
                                                ${isFull ? 'bg-gray-50 border-gray-100 opacity-60 cursor-not-allowed' : 
                                                  isSelected ? 'bg-indigo-50 border-indigo-500 shadow-md ring-1 ring-indigo-500' : 'bg-white border-gray-100 hover:border-indigo-200 hover:shadow-sm'}
                                            `}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className={`text-sm font-bold uppercase tracking-wide mb-1 ${isSelected ? 'text-indigo-700' : 'text-gray-500'}`}>
                                                        {formatDatePretty(s.date)}
                                                    </p>
                                                    <div className="flex items-center gap-2 text-gray-800 font-semibold text-lg">
                                                        <ClockIcon />
                                                        {s.start_time.substring(0,5)} - {s.end_time.substring(0,5)}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    {isFull ? (
                                                        <span className="inline-block bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded">FULL</span>
                                                    ) : (
                                                        <div className="flex flex-col items-end">
                                                            <span className={`text-2xl font-bold font-mono ${isSelected ? 'text-indigo-600' : 'text-green-600'}`}>
                                                                {availableCount}
                                                            </span>
                                                            <span className="text-[10px] text-gray-400 uppercase font-bold">Seats Left</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {isSelected && (
                                                <div className="absolute -top-2 -right-2 bg-indigo-600 text-white rounded-full p-1 shadow-sm">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })
                            )}
                        </div>

                        {/* BOOKING ACTION */}
                        <div className="p-4 bg-white border-t border-gray-100 rounded-b-2xl">
                            <button 
                                onClick={handleConfirmBooking}
                                disabled={isSubmitting || (mode === 'search' && !searchQuery)}
                                className={`
                                    w-full py-4 rounded-xl text-lg font-bold text-white shadow-lg transition-all flex justify-center items-center gap-2
                                    ${(mode === 'search' && !searchQuery) || isSubmitting 
                                        ? 'bg-gray-300 cursor-not-allowed shadow-none' 
                                        : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-xl hover:-translate-y-0.5'}
                                `}
                            >
                                {isSubmitting ? 'Processing...' : 'Confirm Booking'}
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

export default WalkInEntry;