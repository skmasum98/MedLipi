import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router'; 
import { useAuth } from '../hooks/useAuth';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const VITE_API_URL = import.meta.env.VITE_API_URL;

function DashboardDoctor() {
    const { doctor, token } = useAuth();
    const navigate = useNavigate();
    
    // --- Data States ---
    const [recentVisits, setRecentVisits] = useState([]);
    const [todaysQueue, setTodaysQueue] = useState([]); 
    const [summary, setSummary] = useState({ total_prescriptions: 0, today_prescriptions: 0, total_unique_patients: 0 });
    const [activityData, setActivityData] = useState([]);
    const [loading, setLoading] = useState(true);

    // --- Action Processing State (Track specific ID being worked on) ---
    const [processingId, setProcessingId] = useState(null); 

    useEffect(() => {
        const loadDashboardData = async () => {
            if (!token) return;
            // Only set global loading on first mount to prevent UI flash on refresh
            if(recentVisits.length === 0) setLoading(true);
            
            try {
                // Parallel fetch for speed
                const [recentRes, queueRes, summaryRes, activityRes] = await Promise.all([
                    fetch(`${VITE_API_URL}/prescriptions/recent`, { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch(`${VITE_API_URL}/appointments?date=${new Date().toLocaleDateString('en-CA')}`, { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch(`${VITE_API_URL}/analytics/summary`, { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch(`${VITE_API_URL}/analytics/activity`, { headers: { 'Authorization': `Bearer ${token}` } })
                ]);

                if (recentRes.ok) setRecentVisits(await recentRes.json());
                if (queueRes.ok) setTodaysQueue(await queueRes.json());
                if (summaryRes.ok) setSummary(await summaryRes.json());
                if (activityRes.ok) setActivityData(await activityRes.json());

            } catch (error) {
                console.error('Error loading dashboard:', error);
            } finally {
                setLoading(false);
            }
        };
        loadDashboardData();
    }, [token, VITE_API_URL]);

    // --- ACTIONS ---

    const handleStartVisit = (appointment) => {
        navigate('/prescription/new', { 
            state: { patientData: appointment, queueMode: true } 
        });
    };

    const handleReprint = async (patientId, date, uiKey) => {
        setProcessingId(`print-${uiKey}`);
        try {
            const res = await fetch(`${VITE_API_URL}/prescriptions/reprint/${patientId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ date }) 
            });
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = 'Prescription_Copy.pdf'; 
                document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url);
            } else {
                alert('Reprint failed. Prescription not found.');
            }
        } catch (e) { console.error(e); }
        finally { setProcessingId(null); }
    };

    const handleEditHistory = async (patientId, dateStr, uiKey) => {
        setProcessingId(`edit-${uiKey}`);
        try {
            // 1. Fetch full patient profile (includes full visit details)
            const res = await fetch(`${VITE_API_URL}/patients/${patientId}/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (res.ok) {
                const fullData = await res.json();
                
                // 2. Find specific visit from history array
                const specificVisit = fullData.timeline.find(t => t.raw_date === dateStr);
                
                if (specificVisit) {
                    navigate('/prescription/new', { 
                        state: { editMode: true, visitData: specificVisit, patientData: fullData.patient } 
                    });
                } else {
                    alert("Could not retrieve detailed data for this visit.");
                }
            }
        } catch (e) { console.error(e); alert("Network Error"); }
        finally { setProcessingId(null); }
    };

    return (
        <div className="bg-slate-50 min-h-screen font-sans pb-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                
                {/* --- HEADER --- */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                    <div>
                        <p className="text-sm font-bold text-indigo-500 uppercase tracking-wide">Doctor Console</p>
                        <h1 className="text-3xl font-extrabold text-slate-900 leading-tight">
                             Dr. {doctor?.full_name}
                        </h1>
                    </div>
                    
                    {/* Share Button Group */}
                    <div className="flex gap-2">
                        <Link 
                            to="/prescription/new" 
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl shadow-lg transition font-bold flex items-center gap-2"
                        >
                            <span>+</span> New Prescription
                        </Link>
                    </div>
                </div>

                {/* --- KPI STATS --- */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <StatCard icon="📅" label="Today's Appointments" value={summary.today_prescriptions} subtext="Booked visits" color="bg-blue-50 border-blue-100 text-blue-700" />
                    <StatCard icon="📄" label="Lifetime Prescriptions" value={summary.total_prescriptions} subtext="Generated so far" color="bg-purple-500 border-purple-100 " />
                    <StatCard icon="👥" label="Patient Database" value={summary.total_unique_patients} subtext="Unique registered" color="bg-green-50 border-green-100 text-green-700" />
                </div>

                {/* --- MAIN GRID --- */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    
                    {/* LEFT COLUMN (2/3): Analytics & History */}
                    <div className="lg:col-span-2 space-y-8">
                        
                       
                        

                        {/* RECENT HISTORY CARD */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                <h3 className="font-bold text-slate-800 text-lg">Recent History</h3>
                                <Link to="/patients" className="text-xs font-bold text-indigo-600 hover:underline uppercase tracking-wide">Directory →</Link>
                            </div>
                            
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        <tr>
                                            <th className="px-6 py-3">Patient</th>
                                            <th className="px-6 py-3">Date</th>
                                            <th className="px-6 py-3">Diagnosis</th>
                                            <th className="px-6 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 text-sm">
                                        {recentVisits.length === 0 ? (
                                             <tr><td colSpan="4" className="p-8 text-center text-slate-400">No records found recently.</td></tr>
                                        ) : recentVisits.map((visit, index) => {
                                            const visitKey = `v-${index}`;
                                            return (
                                            <tr key={visitKey} className="hover:bg-slate-50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-900">{visit.name}</div>
                                                    <div className="text-xs text-slate-500">{visit.age} • {visit.gender}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-mono text-xs font-medium text-slate-600 bg-slate-100 inline-block px-2 py-1 rounded">
                                                        {new Date(visit.visit_date).toLocaleDateString()}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 max-w-[200px]">
                                                    <span className="block truncate text-slate-600">
                                                        {visit.diagnosis || <span className="text-slate-400 italic">No Diagnosis</span>}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2 opacity-100 md:opacity-60 md:group-hover:opacity-100 transition-opacity">
                                                        
                                                        {/* EDIT BUTTON */}
                                                        <button 
                                                            onClick={() => handleEditHistory(visit.patient_id, visit.visit_date, visitKey)}
                                                            disabled={!!processingId}
                                                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-100 transition disabled:opacity-50"
                                                        >
                                                            {processingId === `edit-${visitKey}` ? 'Loading...' : '✏️ Edit'}
                                                        </button>

                                                        {/* PRINT BUTTON */}
                                                        <button 
                                                            onClick={() => handleReprint(visit.patient_id, visit.visit_date, visitKey)}
                                                            disabled={!!processingId}
                                                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition disabled:opacity-50"
                                                        >
                                                            {processingId === `print-${visitKey}` ? '...' : '🖨️ PDF'}
                                                        </button>

                                                    </div>
                                                </td>
                                            </tr>
                                        )})}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>

                    {/* RIGHT COLUMN (1/3): Live Queue */}
                    <div className="lg:col-span-1">
                        <div className="bg-orange-50 rounded-2xl border border-orange-200 sticky top-6 shadow-sm overflow-hidden">
                            <div className="px-6 py-5 border-b border-orange-200/50 flex justify-between items-center bg-orange-100/30">
                                <h3 className="font-bold text-orange-900 text-lg flex items-center gap-2">
                                    <span className="relative flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
                                    </span>
                                    Live Queue
                                </h3>
                                <Link to="/appointments" className="text-[10px] uppercase font-bold text-orange-700 hover:text-orange-900 tracking-wider">View All</Link>
                            </div>
                            
                            <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
                                {todaysQueue.filter(a => !['Completed','Cancelled'].includes(a.status)).length === 0 ? (
                                    <div className="bg-white/50 p-8 rounded-xl border border-dashed border-orange-300 text-center text-gray-500">
                                        <span className="text-3xl block mb-2">✅</span>
                                        <p className="text-sm font-medium">All Clear</p>
                                        <p className="text-xs mt-1 opacity-70">No active patients waiting.</p>
                                    </div>
                                ) : (
                                    todaysQueue.filter(a => !['Completed','Cancelled'].includes(a.status)).map((app) => (
                                        <div key={app.appointment_id} className="bg-white p-4 rounded-xl border border-orange-100 shadow-sm hover:shadow-md transition group">
                                            
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-3">
                                                    {app.serial_number ? 
                                                        <span className="bg-gray-100 text-gray-800 text-base font-mono font-bold px-2 py-0.5 rounded-lg border border-gray-200">#{app.serial_number}</span> 
                                                        : <span className="bg-gray-50 text-gray-400 text-xs px-2 py-0.5 rounded">-</span>
                                                    }
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-900 leading-tight">{app.patient_name}</p>
                                                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                                             <span>{app.visit_time?.substring(0,5) || 'Wait'}</span>
                                                             <span>•</span>
                                                             <span>{app.source}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Prep Data Badge */}
                                            {(app.prep_bp || app.prep_weight) && (
                                                <div className="mb-3 flex gap-2">
                                                    <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-100 font-bold flex items-center gap-1">
                                                        🩺 Vitals Taken
                                                    </span>
                                                    {app.prep_bp && <span className="text-[10px] text-gray-500 py-0.5">BP: {app.prep_bp}</span>}
                                                </div>
                                            )}

                                            <button 
                                                onClick={() => handleStartVisit(app)}
                                                className="w-full bg-orange-100 hover:bg-orange-200 text-orange-800 text-xs font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-md"
                                            >
                                                Start Consultation <span className="transition-transform group-hover:translate-x-1">→</span>
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

// UI Component
const StatCard = ({ icon, label, value, subtext, color }) => (
    <div className={`p-6 rounded-2xl shadow-sm border ${color.split(' ')[2] || ''} ${color.replace('text-', 'bg-').replace('border-', 'bg-opacity-10 ')}`}>
        <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-white shadow-sm ${color.split(' ')[0] !== 'bg-white' ? '' : 'border'}`}>
                {icon}
            </div>
            <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest opacity-60 mb-0.5">{label}</p>
                <p className="text-3xl font-black">{value}</p>
                {subtext && <p className="text-xs opacity-80 mt-0.5">{subtext}</p>}
            </div>
        </div>
    </div>
);

export default DashboardDoctor;