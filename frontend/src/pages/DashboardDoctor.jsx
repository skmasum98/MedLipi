import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../hooks/useAuth';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const VITE_API_URL = import.meta.env.VITE_API_URL;

function DashboardDoctor() {
    const { doctor, token } = useAuth();
    const navigate = useNavigate();
    
    // Data States
    const [recentVisits, setRecentVisits] = useState([]);
    const [todaysQueue, setTodaysQueue] = useState([]); 
    const [summary, setSummary] = useState({ total_prescriptions: 0, today_prescriptions: 0, total_unique_patients: 0 });
    const [activityData, setActivityData] = useState([]);
    const [loading, setLoading] = useState(true);

    // Action States
    const [processingId, setProcessingId] = useState(null); // To show spinner on specific buttons

    useEffect(() => {
        const loadDashboardData = async () => {
            if (!token) return;
            setLoading(true);
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

    // --- HANDLER: START NEW VISIT (From Queue) ---
    const handleStartVisit = (appointment) => {
        navigate('/prescription/new', { 
            state: { 
                patientData: appointment, 
                queueMode: true 
            } 
        });
    };

    // --- HANDLER: REPRINT (From History) ---
    const handleReprint = async (patientId, date, visitId) => {
        setProcessingId(`print-${visitId}`);
        try {
            const res = await fetch(`${VITE_API_URL}/prescriptions/reprint/${patientId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ date }) 
            });
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = 'Reprint.pdf'; 
                document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url);
            } else {
                alert('Reprint failed. Prescription might be too old.');
            }
        } catch (e) { console.error(e); }
        finally { setProcessingId(null); }
    };

    // --- HANDLER: EDIT (From History) ---
    const handleEditHistory = async (patientId, dateStr, visitId) => {
        setProcessingId(`edit-${visitId}`);
        try {
            // 1. Fetch full patient profile to get the specific visit data
            const res = await fetch(`${VITE_API_URL}/patients/${patientId}/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (res.ok) {
                const fullData = await res.json();
                
                // 2. Find the exact visit
                const specificVisit = fullData.timeline.find(t => t.raw_date === dateStr);
                
                if (specificVisit) {
                    // 3. Navigate with data
                    navigate('/prescription/new', { 
                        state: { 
                            editMode: true, 
                            visitData: specificVisit, 
                            patientData: fullData.patient 
                        } 
                    });
                } else {
                    alert("Could not load full details for this visit.");
                }
            }
        } catch (e) { console.error(e); }
        finally { setProcessingId(null); }
    };

    return (
        <div className="min-w-0 min-h-0 bg-slate-50 pb-12 font-sans">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                
                {/* --- HEADER --- */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                    <div>
                        <p className="text-sm font-semibold text-indigo-500 uppercase tracking-wide">Doctor Dashboard</p>
                        <h1 className="text-3xl font-extrabold text-slate-900">
                             Dr. {doctor?.full_name}
                        </h1>
                    </div>
                    <Link 
                        to="/prescription/new" 
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-indigo-500/30 transition-all font-bold flex items-center gap-2"
                    >
                        <span>+</span> New Prescription
                    </Link>
                </div>

                {/* --- STATS OVERVIEW --- */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <StatCard icon="📅" label="Appointments Today" value={summary.today_prescriptions} subtext="Booked visits" color="bg-blue-50 border-blue-100 text-blue-700" />
                    <StatCard icon="📄" label="Total Prescriptions" value={summary.total_prescriptions} subtext="Lifetime records" color="bg-purple-50 border-purple-100 text-purple-700" />
                    <StatCard icon="👥" label="Total Patients" value={summary.total_unique_patients} subtext="Unique registered" color="bg-green-50 border-green-100 text-green-700" />
                </div>

                {/* --- MAIN DASHBOARD GRID --- */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* LEFT (2/3): Activity Chart & History */}
                    <div className="lg:col-span-2 space-y-8">
                        
                        

                        {/* 2. Recent History (Rich Table) */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                <h3 className="font-bold text-slate-800">Recent Visits</h3>
                                <Link to="/patients" className="text-sm font-semibold text-indigo-600 hover:underline">View All Records</Link>
                            </div>
                            
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                                        <tr>
                                            <th className="px-6 py-3">Patient</th>
                                            <th className="px-6 py-3">Date</th>
                                            <th className="px-6 py-3">Diagnosis</th>
                                            <th className="px-6 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {recentVisits.map((visit, index) => {
                                            const visitKey = `visit-${index}`;
                                            return (
                                            <tr key={visitKey} className="hover:bg-indigo-50/30 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-900">{visit.name}</div>
                                                    <div className="text-xs text-slate-500">{visit.age} • {visit.gender}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded font-mono">
                                                        {new Date(visit.visit_date).toLocaleDateString()}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="block truncate max-w-[150px] text-sm text-slate-700">
                                                        {visit.diagnosis || '-'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {/* EDIT BUTTON */}
                                                        <button 
                                                            onClick={() => handleEditHistory(visit.patient_id, visit.visit_date, visitKey)}
                                                            disabled={!!processingId}
                                                            className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
                                                            title="Edit this prescription"
                                                        >
                                                            {processingId === `edit-${visitKey}` ? 
                                                                <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div> 
                                                                : <span>✏️</span>
                                                            }
                                                        </button>

                                                        {/* PRINT BUTTON */}
                                                        <button 
                                                            onClick={() => handleReprint(visit.patient_id, visit.visit_date, visitKey)}
                                                            disabled={!!processingId}
                                                            className="p-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                                                            title="Print Copy"
                                                        >
                                                             {processingId === `print-${visitKey}` ? 
                                                                <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></div> 
                                                                : <span>🖨️</span>
                                                            }
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )})}
                                    </tbody>
                                </table>
                                {recentVisits.length === 0 && <div className="p-8 text-center text-slate-400">No recent history found.</div>}
                            </div>
                        </div>

                        {/* 1. Chart */}
                        {/* <div className="md:hidden bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                                📊 Patient Trends <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Last 7 Days</span>
                            </h3>
                            <div style={{ width: '100%', height: 280, minWidth: 0 }}>
                                {activityData.length > 0 ? (
                                    <ResponsiveContainer>
                                        <AreaChart data={activityData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                                            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                                            <Area type="monotone" dataKey="patients" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorPv)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-slate-400">No activity data yet</div>
                                )}
                            </div>
                        </div> */}

                    </div>

                    {/* RIGHT (1/3): Live Queue */}
                    <div className="lg:col-span-1">
                        <div className="bg-orange-50 rounded-2xl p-6 border border-orange-200 sticky top-6 shadow-sm">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-orange-900 text-lg flex items-center gap-2">
                                    <span className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                                    </span>
                                    Live Queue
                                </h3>
                                <Link to="/appointments" className="text-xs font-bold text-orange-700 hover:underline">Manage</Link>
                            </div>
                            
                            <div className="space-y-3">
                                {loading ? (
                                    <p className="text-center text-sm text-gray-500 py-4">Checking Queue...</p>
                                ) : todaysQueue.filter(a => a.status !== 'Completed' && a.status !== 'Cancelled').length === 0 ? (
                                    <div className="bg-white/50 p-6 rounded-xl border border-dashed border-orange-300 text-center text-gray-500">
                                        <div className="text-3xl mb-2">☕</div>
                                        <p className="text-sm font-medium">All Caught Up</p>
                                        <p className="text-xs mt-1 opacity-70">No active patients waiting.</p>
                                    </div>
                                ) : (
                                    todaysQueue.filter(a => a.status !== 'Completed' && a.status !== 'Cancelled').map((app) => (
                                        <div key={app.appointment_id} className="bg-white p-4 rounded-xl border border-orange-100 shadow-sm hover:shadow-md transition">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-3">
                                                    {app.serial_number ? 
                                                        <span className="bg-gray-100 text-gray-800 text-lg font-mono font-bold px-2 rounded-md">#{app.serial_number}</span> 
                                                        : <span className="bg-gray-100 text-gray-500 px-2 rounded-md">--</span>
                                                    }
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-900">{app.patient_name}</p>
                                                        <p className="text-xs text-gray-500">{app.visit_time ? app.visit_time.substring(0,5) : 'Time: TBD'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Prep Data Indicator */}
                                            {(app.prep_bp || app.prep_weight) && (
                                                <div className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded mb-3 flex gap-2">
                                                    <span>✓ Vitals Ready</span>
                                                    {app.prep_bp && <span>BP: {app.prep_bp}</span>}
                                                </div>
                                            )}

                                            <button 
                                                onClick={() => handleStartVisit(app)}
                                                className="w-full bg-orange-100 text-orange-800 text-xs font-bold py-2 rounded-lg hover:bg-orange-200 transition flex items-center justify-center gap-2 group"
                                            >
                                                Start Consultation 
                                                <span className="group-hover:translate-x-1 transition-transform">→</span>
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

// Stats UI Helper
const StatCard = ({ icon, label, value, subtext, color }) => (
    <div className={`p-6 rounded-2xl shadow-sm border ${color.split(' ')[2] ? '' : 'border-gray-100'} ${color.replace('text-', 'bg-').replace('border-', 'bg-opacity-10 ')}`}>
        <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-white shadow-sm ${color.split(' ')[0] !== 'bg-white' ? '' : 'border'}`}>
                {icon}
            </div>
            <div>
                <p className="text-xs font-bold uppercase tracking-wider opacity-60">{label}</p>
                <p className="text-2xl font-black">{value}</p>
                {subtext && <p className="text-[10px] opacity-80 mt-0.5">{subtext}</p>}
            </div>
        </div>
    </div>
);

export default DashboardDoctor;