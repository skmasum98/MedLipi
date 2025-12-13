import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { useAuth } from '../hooks/useAuth';
import { useDebounce } from '../hooks/useDebounce'; // Ensure this hook exists

const VITE_API_URL = import.meta.env.VITE_API_URL;

function WalkInEntry() {
    const { token } = useAuth();
    const navigate = useNavigate();

    // --- STATES ---
    
    // Search
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery, 400); // 400ms delay
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    
    // Patient Form
    // If 'patient_id' is null, it's a new patient.
    const [patientData, setPatientData] = useState({ 
        name: '', mobile: '', age: '', gender: 'Male', address: '', patient_id: null 
    });
    
    // UI Mode: 'search' | 'selected' | 'new'
    const [mode, setMode] = useState('search'); 

    // Schedules
    const [sessions, setSessions] = useState([]);
    const [selectedSessionId, setSelectedSessionId] = useState(null);
    const [sessionsLoading, setSessionsLoading] = useState(true);

    // --- 1. LOAD AVAILABLE SESSIONS ---
    useEffect(() => {
        const fetchSessions = async () => {
            try {
                // Get All Sessions
                const res = await fetch(`${VITE_API_URL}/schedules/available`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (res.ok) {
                    const data = await res.json();
                    
                    // Logic: Show sessions for TODAY and TOMORROW
                    // This allows booking slightly in advance, but focuses on immediate needs.
                    const now = new Date();
                    const todayStr = now.toISOString().split('T')[0];
                    
                    // Filter Logic: Future dates or Today + Not Full
                    const available = data.filter(s => {
                        const sDate = s.date.split('T')[0];
                        return sDate >= todayStr && s.booked_count < s.max_patients;
                    });

                    setSessions(available);
                    // Pre-select first if available
                    if (available.length > 0) setSelectedSessionId(available[0].schedule_id);
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
        // Only search if in search mode and query is long enough
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

    // User clicks a patient from dropdown
    const handleSelectPatient = (p) => {
        setPatientData({
            name: p.name,
            mobile: p.mobile,
            age: p.age,
            gender: p.gender,
            address: p.address,
            patient_id: p.patient_id
        });
        setMode('selected');
        setSearchQuery(''); // clear search bar
    };

    // User wants to create new
    const handleCreateNew = () => {
        // Initialize with whatever they typed if it looks like a phone
        const isNum = /^\d+$/.test(searchQuery);
        setPatientData({
            name: isNum ? '' : searchQuery,
            mobile: isNum ? searchQuery : '',
            age: '', gender: 'Male', address: '', patient_id: null
        });
        setMode('new');
        setSearchQuery('');
    };

    const handleReset = () => {
        setMode('search');
        setPatientData({ name: '', mobile: '', age: '', gender: 'Male', address: '', patient_id: null });
        setSearchQuery('');
        setSearchResults([]);
    };

    // --- SUBMISSION ---
    const handleConfirmBooking = async () => {
        if (!selectedSessionId) return alert("Please select a time slot/session.");

        // Validation for New Patient
        if (!patientData.patient_id) {
            if (!patientData.name || !patientData.mobile || !patientData.age) {
                return alert("Name, Mobile, and Age are required for new patients.");
            }
        }

        try {
            let targetPatientId = patientData.patient_id;

            // 1. Create Patient if New
            if (!targetPatientId) {
                const regRes = await fetch(`${VITE_API_URL}/portal/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        name: patientData.name, 
                        mobile: patientData.mobile, 
                        age: patientData.age, 
                        gender: patientData.gender,
                        address: patientData.address || 'Walk-in' 
                    })
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
                // Success UI
                if(window.confirm(`🎉 BOOKING SUCCESS!\n\nPatient: ${patientData.name}\nSERIAL: #${bookData.serial}\n\nReturn to Dashboard?`)) {
                    navigate('/reception-dashboard');
                } else {
                    handleReset(); // Stay here, reset for next
                }
            } else {
                alert(`Booking Failed: ${bookData.message}`);
            }

        } catch (error) {
            alert(error.message);
            console.error(error);
        }
    };


    // --- HELPERS ---
    const formatDatePretty = (dateStr) => {
        const date = new Date(dateStr);
        // Returns "Sat, 14 Dec"
        return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6 flex justify-center">
            <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 h-fit">
                
                {/* === LEFT COL: PATIENT IDENTIFICATION === */}
                <div className="lg:col-span-7 space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-gray-800">Walk-in Admission</h2>
                        <Link to="/reception-dashboard" className="text-gray-500 hover:text-gray-800 text-sm">Cancel</Link>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                            <span className="font-bold text-gray-600 uppercase text-xs">Patient Details</span>
                            {mode !== 'search' && (
                                <button onClick={handleReset} className="text-indigo-600 text-xs font-bold hover:underline">Change Patient</button>
                            )}
                        </div>

                        {/* MODE 1: SEARCH */}
                        {mode === 'search' && (
                            <div className="p-6 relative">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Search or Add New</label>
                                <input 
                                    type="text" 
                                    autoFocus
                                    className="w-full p-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                    placeholder="Enter Name or Mobile (017...)"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                {isSearching && <span className="absolute right-8 top-[3.2rem] text-gray-400 text-sm">Finding...</span>}

                                {/* RESULTS DROPDOWN */}
                                {searchResults.length > 0 && (
                                    <ul className="absolute z-10 w-[calc(100%-3rem)] bg-white border border-gray-200 rounded-lg mt-2 shadow-xl max-h-60 overflow-y-auto">
                                        {searchResults.map(p => (
                                            <li 
                                                key={p.patient_id}
                                                onClick={() => handleSelectPatient(p)}
                                                className="p-3 border-b hover:bg-indigo-50 cursor-pointer flex justify-between items-center"
                                            >
                                                <div>
                                                    <div className="font-bold text-gray-800">{p.name}</div>
                                                    <div className="text-xs text-gray-500">{p.mobile}</div>
                                                </div>
                                                <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-1 rounded-full">#{p.patient_id}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                {/* No Results / Create Trigger */}
                                {searchQuery.length > 3 && !isSearching && (
                                    <div className="mt-4 text-center">
                                        <p className="text-sm text-gray-500 mb-2">Patient not found?</p>
                                        <button 
                                            onClick={handleCreateNew}
                                            className="bg-green-600 text-white px-6 py-2 rounded-full text-sm font-bold shadow hover:bg-green-700 transition"
                                        >
                                            + Create New Record
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* MODE 2: EXISTING SELECTED */}
                        {mode === 'selected' && (
                            <div className="p-6 bg-indigo-50/50">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-xl">
                                        {patientData.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900">{patientData.name}</h3>
                                        <p className="text-sm text-gray-600">
                                            {patientData.age} Y / {patientData.gender} • {patientData.mobile}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-4 p-3 bg-white rounded border border-indigo-100 text-sm text-gray-500">
                                    📍 {patientData.address || 'No address provided'}
                                </div>
                            </div>
                        )}

                        {/* MODE 3: CREATE NEW */}
                        {mode === 'new' && (
                            <div className="p-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Name</label>
                                        <input type="text" className="w-full p-2 border rounded" value={patientData.name} onChange={(e)=>setPatientData({...patientData, name: e.target.value})} />
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mobile</label>
                                        <input type="text" className="w-full p-2 border rounded font-mono" value={patientData.mobile} onChange={(e)=>setPatientData({...patientData, mobile: e.target.value})} />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Age</label>
                                        <input type="text" className="w-full p-2 border rounded" value={patientData.age} onChange={(e)=>setPatientData({...patientData, age: e.target.value})} placeholder="e.g. 25Y" />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Gender</label>
                                        <select className="w-full p-2 border rounded bg-white" value={patientData.gender} onChange={(e)=>setPatientData({...patientData, gender: e.target.value})}>
                                            <option>Male</option><option>Female</option><option>Other</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Address</label>
                                        <textarea rows="2" className="w-full p-2 border rounded" value={patientData.address} onChange={(e)=>setPatientData({...patientData, address: e.target.value})} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>


                {/* === RIGHT COL: SLOT SELECTOR === */}
                <div className="lg:col-span-5 h-full">
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200 h-full flex flex-col overflow-hidden sticky top-6">
                        <div className="bg-gray-50 p-4 border-b border-gray-200 text-center">
                            <h3 className="text-lg font-extrabold text-gray-800">Select Shift</h3>
                        </div>
                        
                        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-50 max-h-[450px]">
                            {sessionsLoading ? <div className="text-center p-6 text-gray-500">Loading Shifts...</div> : 
                             sessions.length === 0 ? <div className="text-center p-8 bg-red-50 text-red-600 rounded border border-red-200">No shifts available.</div> :
                             
                             sessions.map(s => {
                                 // Check visual status
                                 const isFull = s.booked_count >= s.max_patients;
                                 const isSelected = selectedSessionId === s.schedule_id;

                                 return (
                                     <div 
                                        key={s.schedule_id}
                                        onClick={() => !isFull && setSelectedSessionId(s.schedule_id)}
                                        className={`
                                            cursor-pointer p-4 rounded-xl border-2 transition-all relative
                                            ${isSelected ? 'border-green-500 bg-white ring-1 ring-green-500 shadow-md' : 'border-white bg-white shadow-sm hover:border-gray-300'}
                                            ${isFull ? 'opacity-60 grayscale cursor-not-allowed bg-gray-100' : ''}
                                        `}
                                     >
                                         <div className="flex justify-between items-start mb-2">
                                             <div>
                                                 <p className="text-lg font-bold text-gray-800">{formatDatePretty(s.date)}</p>
                                                 <span className="text-[10px] uppercase font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded">{s.session_name}</span>
                                             </div>
                                             <div className={`text-right ${isFull ? 'text-red-500' : 'text-green-600'}`}>
                                                 {isFull ? 
                                                    <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded font-bold uppercase">Full</span> :
                                                    <span className="font-mono font-bold text-lg">{s.max_patients - s.booked_count} <span className="text-xs font-sans text-gray-400">left</span></span>
                                                 }
                                             </div>
                                         </div>
                                         <p className="text-xs text-gray-500 flex items-center gap-1 font-mono">
                                            ⏰ {s.start_time.substring(0,5)} - {s.end_time.substring(0,5)}
                                         </p>
                                         {isSelected && <div className="absolute top-1/2 right-4 -translate-y-1/2 bg-green-500 text-white rounded-full p-1"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg></div>}
                                     </div>
                                 )
                             })
                            }
                        </div>

                        {/* BOOKING ACTION AREA */}
                        <div className="p-4 bg-white border-t border-gray-200">
                             {mode === 'search' && !searchQuery ? (
                                 <p className="text-center text-gray-400 text-sm">Select a patient first</p>
                             ) : (
                                <button 
                                    onClick={handleConfirmBooking}
                                    disabled={mode === 'search' && !searchQuery}
                                    className="w-full bg-green-600 text-white font-extrabold text-lg py-4 rounded-xl shadow-lg hover:bg-green-700 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    CONFIRM TICKET
                                </button>
                             )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

export default WalkInEntry;