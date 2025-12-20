import React from 'react';
import { Eye, Power, Trash2, Phone, Mail, Users, Award } from 'lucide-react';

const DoctorsList = ({ doctors, onToggleStatus, onDelete, onViewDetails, onOpenCreate }) => {
    
    // Helper to colorize status
    const statusColor = (status) => 
        status === 'active' 
        ? 'bg-green-500/20 text-green-300 border-green-500/30' 
        : 'bg-red-500/20 text-red-300 border-red-500/30';

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white">Doctor Directory</h2>
                    <p className="text-gray-400 text-sm mt-1">
                        {doctors.length} doctor{doctors.length !== 1 ? 's' : ''} registered
                    </p>
                </div>
                <button 
                    onClick={onOpenCreate} 
                    className="w-full sm:w-auto bg-green-600 hover:bg-green-500 text-white px-5 py-2.5 rounded-lg font-bold shadow-lg transition-all flex items-center justify-center gap-2"
                >
                    <span className="text-lg">+</span> Onboard New Doctor
                </button>
            </div>

            {/* Desktop Table (hidden on mobile) */}
            <div className="hidden lg:block bg-gray-800 rounded-xl overflow-hidden border border-gray-700 shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead className="bg-gray-750 text-xs uppercase text-gray-400 border-b border-gray-700">
                            <tr>
                                <th className="p-4 lg:p-5 font-bold tracking-wide">Doctor</th>
                                <th className="p-4 lg:p-5 font-bold tracking-wide">Contacts</th>
                                <th className="p-4 lg:p-5 font-bold tracking-wide">Performance</th>
                                <th className="p-4 lg:p-5 font-bold tracking-wide">Status</th>
                                <th className="p-4 lg:p-5 text-right font-bold tracking-wide">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700 text-sm">
                            {doctors.map(d => (
                                <tr key={d.doctor_id} className="hover:bg-gray-700/50 transition">
                                    <td className="p-4 lg:p-5">
                                        <div className="font-bold text-base text-white">{d.full_name}</div>
                                        <div className="text-indigo-400 text-xs mt-1 font-mono tracking-tight uppercase flex items-center gap-1">
                                            <Award size={12} />
                                            {d.degree}
                                        </div>
                                        <div className="text-gray-500 text-xs mt-0.5">{d.clinic_name}</div>
                                    </td>
                                    <td className="p-4 lg:p-5 text-gray-300">
                                        <div className="flex items-center gap-2">
                                            <Mail size={14} />
                                            {d.email}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                                            <span>BMDC: {d.bmdc_reg}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 lg:p-5">
                                        <div className="flex items-center gap-2">
                                            <Users size={16} />
                                            <span className="text-white font-mono text-lg font-bold">{d.patient_count}</span> 
                                            <span className="text-xs text-gray-500">Pts</span>
                                        </div>
                                    </td>
                                    <td className="p-4 lg:p-5">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${statusColor(d.status)}`}>
                                            {d.status}
                                        </span>
                                    </td>
                                    <td className="p-4 lg:p-5 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                onClick={() => onViewDetails(d)} 
                                                className="text-xs bg-gray-700 hover:bg-white hover:text-black text-gray-200 px-3 py-1.5 rounded transition flex items-center gap-1"
                                            >
                                                <Eye size={14} />
                                                View
                                            </button>
                                            <button 
                                                onClick={() => onToggleStatus(d.doctor_id, d.status)} 
                                                className={`text-xs px-3 py-1.5 rounded transition font-medium flex items-center gap-1 ${d.status === 'active' ? 'bg-orange-900 text-orange-200 hover:bg-orange-700' : 'bg-green-900 text-green-200 hover:bg-green-700'}`}
                                            >
                                                <Power size={14} />
                                                {d.status === 'active' ? 'Suspend' : 'Activate'}
                                            </button>
                                            <button 
                                                onClick={() => onDelete(d.doctor_id)} 
                                                className="text-xs bg-red-900/50 hover:bg-red-600 text-red-200 hover:text-white px-3 py-1.5 rounded transition flex items-center gap-1"
                                            >
                                                <Trash2 size={14} />
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Cards (shown on mobile) */}
            <div className="lg:hidden space-y-4">
                {doctors.map(d => (
                    <div key={d.doctor_id} className="bg-gray-800 rounded-xl border border-gray-700 shadow-lg p-4">
                        {/* Header with name and status */}
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-bold text-lg text-white">{d.full_name}</h3>
                                <div className="text-indigo-400 text-xs mt-1 font-mono tracking-tight uppercase flex items-center gap-1">
                                    <Award size={12} />
                                    {d.degree}
                                </div>
                                <p className="text-gray-500 text-sm mt-0.5">{d.clinic_name}</p>
                            </div>
                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${statusColor(d.status)}`}>
                                {d.status}
                            </span>
                        </div>

                        {/* Contact Info */}
                        <div className="space-y-2 mb-4">
                            <div className="flex items-center gap-2 text-gray-300">
                                <Mail size={14} className="text-gray-500" />
                                <span className="text-sm truncate">{d.email}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-500 text-sm">
                                <span>BMDC: {d.bmdc_reg}</span>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center justify-between mb-4 p-3 bg-gray-900/50 rounded-lg">
                            <div className="text-center">
                                <div className="flex items-center gap-2">
                                    <Users size={16} className="text-gray-400" />
                                    <span className="text-white font-mono text-xl font-bold">{d.patient_count}</span>
                                </div>
                                <span className="text-xs text-gray-500">Patients</span>
                            </div>
                            <div className="text-center">
                                <div className="text-white font-mono text-xl font-bold">4.8</div>
                                <span className="text-xs text-gray-500">Rating</span>
                            </div>
                            <div className="text-center">
                                <div className="text-white font-mono text-xl font-bold">98%</div>
                                <span className="text-xs text-gray-500">Satisfaction</span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-2">
                            <button 
                                onClick={() => onViewDetails(d)} 
                                className="flex-1 bg-gray-700 hover:bg-white hover:text-black text-gray-200 px-4 py-2.5 rounded-lg transition flex items-center justify-center gap-2"
                            >
                                <Eye size={16} />
                                View Details
                            </button>
                            <button 
                                onClick={() => onToggleStatus(d.doctor_id, d.status)} 
                                className={`flex-1 px-4 py-2.5 rounded-lg transition font-medium flex items-center justify-center gap-2 ${d.status === 'active' ? 'bg-orange-900 text-orange-200 hover:bg-orange-700' : 'bg-green-900 text-green-200 hover:bg-green-700'}`}
                            >
                                <Power size={16} />
                                {d.status === 'active' ? 'Suspend' : 'Activate'}
                            </button>
                            <button 
                                onClick={() => onDelete(d.doctor_id)} 
                                className="flex-1 bg-red-900/50 hover:bg-red-600 text-red-200 hover:text-white px-4 py-2.5 rounded-lg transition flex items-center justify-center gap-2"
                            >
                                <Trash2 size={16} />
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {doctors.length === 0 && (
                <div className="text-center py-12">
                    <div className="inline-block p-6 bg-gray-800 rounded-full mb-4">
                        <Users size={48} className="text-gray-500" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">No Doctors Found</h3>
                    <p className="text-gray-400 mb-6">Get started by onboarding your first doctor</p>
                    <button 
                        onClick={onOpenCreate} 
                        className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-lg font-bold shadow-lg transition-all flex items-center gap-2 mx-auto"
                    >
                        <span className="text-lg">+</span> Onboard First Doctor
                    </button>
                </div>
            )}
        </div>
    );
};

export default DoctorsList;