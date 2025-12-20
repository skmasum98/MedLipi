import React from 'react';

const Card = ({ label, val, colorClass, icon }) => (
    <div className="bg-gray-800 p-4 sm:p-5 rounded-xl border border-gray-700 shadow-lg flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-lg sm:text-xl shrink-0 ${colorClass.bg} ${colorClass.text}`}>
            {icon}
        </div>
        <div className="min-w-0">
            <div className="text-xs text-gray-500 uppercase font-bold tracking-wide truncate">{label}</div>
            <div className="text-xl sm:text-2xl font-extrabold text-white mt-0.5 truncate">
                {val !== undefined && val !== null ? val.toLocaleString() : 0}
            </div>
        </div>
    </div>
);

const StatsOverview = ({ stats }) => {
    const statCards = [
        { label: "Total Doctors", val: stats?.doctors, colorClass: {bg:'bg-blue-900/30', text:'text-blue-400'}, icon: "👨‍⚕️" },
        { label: "Total Patients", val: stats?.patients, colorClass: {bg:'bg-green-900/30', text:'text-green-400'}, icon: "👥" },
        { label: "Prescriptions", val: stats?.prescriptions, colorClass: {bg:'bg-purple-900/30', text:'text-purple-400'}, icon: "📄" },
        { label: "Active Sessions", val: stats?.activeSessions, colorClass: {bg:'bg-amber-900/30', text:'text-amber-400'}, icon: "🔄" }
    ];

    return (
        <div className="mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Platform Overview</h2>
            
            {/* Grid Layout for better mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                {statCards.map((card, index) => (
                    <Card 
                        key={index}
                        label={card.label}
                        val={card.val}
                        colorClass={card.colorClass}
                        icon={card.icon}
                    />
                ))}
            </div>
            
            {/* Optional: Stats summary row */}
            {(stats?.growthRate || stats?.avgResponse) && (
                <div className="mt-4 sm:mt-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-6">
                        {stats.growthRate && (
                            <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${stats.growthRate >= 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                <span className="text-sm text-gray-300">
                                    <span className="font-bold">{stats.growthRate >= 0 ? '+' : ''}{stats.growthRate}%</span>
                                    <span className="text-gray-500 ml-2">growth this month</span>
                                </span>
                            </div>
                        )}
                        
                        {stats.avgResponse && (
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                <span className="text-sm text-gray-300">
                                    <span className="font-bold">{stats.avgResponse}min</span>
                                    <span className="text-gray-500 ml-2">avg. response time</span>
                                </span>
                            </div>
                        )}
                        
                        {stats.uptime && (
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                <span className="text-sm text-gray-300">
                                    <span className="font-bold">{stats.uptime}%</span>
                                    <span className="text-gray-500 ml-2">system uptime</span>
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default StatsOverview;