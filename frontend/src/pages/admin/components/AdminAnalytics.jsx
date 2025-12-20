import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const AdminAnalytics = ({ analytics }) => {
    if (!analytics) return <div className="text-gray-400 p-10 text-center">Loading Analytics...</div>;

    const { patient_growth, top_medicines, system_health } = analytics;

    return (
        <div className="animate-fade-in space-y-8">
            <h2 className="text-2xl font-bold text-white">System Reports</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* 1. Growth Metrics */}
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-xl">
                    <h3 className="font-bold text-gray-400 uppercase text-xs mb-6">Patient Registrations (MoM)</h3>
                    <div className="flex justify-around items-end py-4">
                        <div className="text-center">
                            <div className="text-4xl font-extrabold text-gray-600 mb-2">{patient_growth.last_month}</div>
                            <div className="text-xs text-gray-500 uppercase tracking-wide font-bold">Last Month</div>
                        </div>
                        <div className="text-3xl text-gray-700 pb-6">➜</div>
                        <div className="text-center">
                            <div className="text-5xl font-extrabold text-white mb-2">{patient_growth.this_month}</div>
                            <div className="text-xs text-indigo-400 uppercase tracking-wide font-bold">Current Month</div>
                        </div>
                    </div>
                    <div className="mt-8 pt-4 border-t border-gray-700 text-center text-sm">
                        {patient_growth.this_month >= patient_growth.last_month ? (
                            <span className="text-green-400 bg-green-900/30 px-2 py-1 rounded">▲ Positive Trend</span>
                        ) : (
                            <span className="text-red-400 bg-red-900/30 px-2 py-1 rounded">▼ Downtrend</span>
                        )} 
                        <span className="text-gray-500 ml-2">in user acquisition</span>
                    </div>
                </div>

                {/* 2. Medicine Stats */}
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-xl flex flex-col">
                    <h3 className="font-bold text-gray-400 uppercase text-xs mb-4">Top 5 Prescribed Generics</h3>
                    
                    {/* Important: Fixed height and minWidth for Recharts in Flex/Grid */}
                    <div className="flex-1 w-full" style={{ minHeight: '250px', minWidth: 0 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={top_medicines} layout="vertical" margin={{ left: 10, right: 30 }}>
                                <XAxis type="number" hide />
                                <YAxis 
                                    dataKey="generic_name" 
                                    type="category" 
                                    width={120} 
                                    tick={{fill:'#9ca3af', fontSize: 11, fontWeight: 600}} 
                                    interval={0}
                                />
                                <Tooltip 
                                    cursor={{fill: '#374151'}} 
                                    contentStyle={{backgroundColor:'#1f2937', borderColor:'#4b5563', color:'white', borderRadius: '8px'}} 
                                    itemStyle={{color: '#a5b4fc'}}
                                />
                                <Bar dataKey="usage_count" barSize={24} radius={[0, 4, 4, 0]}>
                                    {top_medicines.map((entry, index) => (
                                        <Cell key={index} fill={['#60a5fa', '#34d399', '#f472b6', '#a78bfa', '#fcd34d'][index % 5]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 3. System Health Bar */}
                <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-6 rounded-xl border border-gray-700 lg:col-span-2 flex items-center gap-6 shadow-xl">
                    <div className="p-3 bg-indigo-500/20 rounded-lg text-indigo-400">
                         {/* Database Icon */}
                         <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-lg">System Database</h3>
                        <div className="flex gap-6 mt-1 text-sm">
                             <p className="text-gray-400">Size: <span className="text-white font-mono">{system_health?.db_size_mb || '0'} MB</span></p>
                             <p className="text-gray-400">Status: <span className="text-green-400 font-bold">● Healthy</span></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminAnalytics;