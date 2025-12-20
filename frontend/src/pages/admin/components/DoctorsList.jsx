import React from 'react';

const DoctorsList = ({ doctors, onToggleStatus, onDelete, onViewDetails, onOpenCreate }) => {
    
    // Helper to colorize status
    const statusColor = (status) => 
        status === 'active' 
        ? 'bg-green-500/20 text-green-300 border-green-500/30' 
        : 'bg-red-500/20 text-red-300 border-red-500/30';

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Doctor Directory</h2>
                <button onClick={onOpenCreate} className="bg-green-600 hover:bg-green-500 text-white px-5 py-2.5 rounded-lg font-bold shadow-lg transition-all flex items-center gap-2">
                    <span>+</span> Onboard New
                </button>
            </div>

            <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 shadow-2xl">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-750 text-xs uppercase text-gray-400 border-b border-gray-700">
                        <tr>
                            <th className="p-5 font-bold tracking-wide">Doctor</th>
                            <th className="p-5 font-bold tracking-wide">Contacts</th>
                            <th className="p-5 font-bold tracking-wide">Performance</th>
                            <th className="p-5 font-bold tracking-wide">Status</th>
                            <th className="p-5 text-right font-bold tracking-wide">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700 text-sm">
                        {doctors.map(d => (
                            <tr key={d.doctor_id} className="hover:bg-gray-700/50 transition">
                                <td className="p-5">
                                    <div className="font-bold text-base text-white">{d.full_name}</div>
                                    <div className="text-indigo-400 text-xs mt-1 font-mono tracking-tight uppercase">{d.degree}</div>
                                    <div className="text-gray-500 text-xs mt-0.5">{d.clinic_name}</div>
                                </td>
                                <td className="p-5 text-gray-300">
                                    <div>{d.email}</div>
                                    <div className="text-xs text-gray-500 mt-1">BMDC: {d.bmdc_reg}</div>
                                </td>
                                <td className="p-5">
                                    <span className="text-white font-mono text-lg font-bold">{d.patient_count}</span> 
                                    <span className="text-xs text-gray-500 ml-1">Pts</span>
                                </td>
                                <td className="p-5">
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${statusColor(d.status)}`}>
                                        {d.status}
                                    </span>
                                </td>
                                <td className="p-5 text-right space-x-2">
                                    <button onClick={() => onViewDetails(d)} className="text-xs bg-gray-700 hover:bg-white hover:text-black text-gray-200 px-3 py-1.5 rounded transition">
                                        View
                                    </button>
                                    <button onClick={() => onToggleStatus(d.doctor_id, d.status)} className={`text-xs px-3 py-1.5 rounded transition font-medium ${d.status === 'active' ? 'bg-orange-900 text-orange-200 hover:bg-orange-700' : 'bg-green-900 text-green-200 hover:bg-green-700'}`}>
                                        {d.status === 'active' ? 'Suspend' : 'Activate'}
                                    </button>
                                    <button onClick={() => onDelete(d.doctor_id)} className="text-xs bg-red-900/50 hover:bg-red-600 text-red-200 hover:text-white px-3 py-1.5 rounded transition">
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DoctorsList;