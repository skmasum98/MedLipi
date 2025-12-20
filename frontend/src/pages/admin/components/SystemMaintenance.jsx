import React, { useState } from 'react';

const VITE_API_URL = import.meta.env.VITE_API_URL;

const SystemMaintenance = ({ analytics, token }) => {
    const [logs, setLogs] = useState([]);
    const [processing, setProcessing] = useState(false);

    const performAction = async (action, label) => {
        if (!confirm(`Run action: "${label}"? This might take a moment.`)) return;
        
        setProcessing(true);
        setLogs(prev => [`⏳ Starting: ${label}...`, ...prev]);

        try {
            const res = await fetch(`${VITE_API_URL}/admin/maintenance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ action })
            });
            
            const data = await res.json();
            if (res.ok) {
                setLogs(prev => [`✅ Success: ${data.message}`, ...prev]);
            } else {
                setLogs(prev => [`❌ Error: ${data.message}`, ...prev]);
            }
        } catch (e) {
            setLogs(prev => [`❌ Network Error`, ...prev]);
        } finally {
            setProcessing(false);
        }
    };

    const health = analytics?.system_health || {};

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
            
            {/* Status Panel */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg">
                <h3 className="font-bold text-gray-400 uppercase text-xs mb-6">Database Health Status</h3>
                
                <div className="space-y-6">
                    <div className="flex items-center gap-4">
                         <div className="w-16 h-16 rounded-full bg-green-900/30 text-green-500 flex items-center justify-center text-3xl shadow-inner border border-green-500/20">
                            🛡️
                         </div>
                         <div>
                             <p className="text-sm text-gray-400">Total Size</p>
                             <p className="text-3xl font-extrabold text-white">{health.db_size_mb || '0'} MB</p>
                         </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <StatusMetric label="Connection" value="OK" color="text-green-400" />
                        <StatusMetric label="Load Status" value="Low" color="text-blue-400" />
                        <StatusMetric label="Active Users" value={health.active_users || 0} color="text-indigo-400" />
                        <StatusMetric label="Version" value="v2.5.0" color="text-gray-500" />
                    </div>
                </div>
            </div>

            {/* Tools Panel */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg flex flex-col">
                 <h3 className="font-bold text-gray-400 uppercase text-xs mb-6">Maintenance Tools</h3>
                 
                 <div className="space-y-4 flex-1">
                     <ActionButton 
                        icon="🧹" title="Optimize Tables" desc="Defrag database to reclaim space."
                        onClick={() => performAction('optimize_db', 'Optimize Tables')}
                        loading={processing}
                     />
                     <ActionButton 
                        icon="🗑️" title="Purge Old Appointments" desc="Delete data older than 2 years."
                        onClick={() => performAction('delete_old_appts', 'Delete Old Appointments')}
                        loading={processing}
                     />
                 </div>

                 {/* Console Log */}
                 <div className="mt-6 bg-black rounded-lg p-3 font-mono text-xs text-green-400 h-32 overflow-y-auto border border-gray-700">
                     <div className="opacity-50 mb-2">// System Console</div>
                     {logs.map((log, i) => <div key={i}>{log}</div>)}
                     {logs.length === 0 && <div className="text-gray-600">Waiting for command...</div>}
                 </div>
            </div>

        </div>
    );
};

// UI Helpers
const StatusMetric = ({label, value, color}) => (
    <div className="bg-gray-900/50 p-3 rounded border border-gray-700">
        <p className="text-[10px] uppercase font-bold text-gray-500">{label}</p>
        <p className={`text-lg font-mono font-bold ${color}`}>{value}</p>
    </div>
);

const ActionButton = ({ icon, title, desc, onClick, loading }) => (
    <button 
        onClick={onClick}
        disabled={loading}
        className="w-full bg-gray-700 hover:bg-indigo-600 group p-4 rounded-lg flex items-center gap-4 transition-all text-left border border-gray-600 hover:border-indigo-500 disabled:opacity-50"
    >
        <div className="text-2xl group-hover:scale-110 transition-transform">{icon}</div>
        <div>
            <div className="font-bold text-white text-sm">{title}</div>
            <div className="text-xs text-gray-400 group-hover:text-indigo-200">{desc}</div>
        </div>
    </button>
);

export default SystemMaintenance;