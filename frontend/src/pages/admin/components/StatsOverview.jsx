import React from 'react';

const Card = ({ label, val, colorClass, icon }) => (
    <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 shadow-lg flex items-center gap-4 flex-1">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${colorClass.bg} ${colorClass.text}`}>
            {icon}
        </div>
        <div>
            <div className="text-xs text-gray-500 uppercase font-bold tracking-wide">{label}</div>
            <div className="text-2xl font-extrabold text-white mt-0.5">{val || 0}</div>
        </div>
    </div>
);

const StatsOverview = ({ stats }) => {
    return (
        <div className="flex gap-6 mb-8">
            <Card label="Total Doctors" val={stats.doctors} colorClass={{bg:'bg-blue-900/30', text:'text-blue-400'}} icon="👨‍⚕️" />
            <Card label="Total Patients" val={stats.patients} colorClass={{bg:'bg-green-900/30', text:'text-green-400'}} icon="👥" />
            <Card label="Prescriptions" val={stats.prescriptions} colorClass={{bg:'bg-purple-900/30', text:'text-purple-400'}} icon="📄" />
        </div>
    );
};

export default StatsOverview;