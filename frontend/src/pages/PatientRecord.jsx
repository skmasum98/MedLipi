import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { useAuth } from '../hooks/useAuth';

const VITE_API_URL = import.meta.env.VITE_API_URL;

function PatientRecord() {
    const { id } = useParams();
    const { token } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRecord = async () => {
            try {
                const res = await fetch(`${VITE_API_URL}/patients/${id}/profile`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) setData(await res.json());
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchRecord();
    }, [id, token]);

    if (loading) return <div className="p-8 text-center">Loading Record...</div>;
    if (!data) return <div className="p-8 text-center">Patient not found.</div>;

    const { patient, timeline } = data;

    return (
        <div className="max-w-5xl mx-auto p-6 my-8">
            {/* Header Info */}
            <div className="bg-white shadow rounded-lg p-6 mb-8 border-l-4 border-indigo-600 flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">{patient.name}</h1>
                    <div className="mt-2 text-gray-600 flex gap-4">
                        <span><strong>Age:</strong> {patient.age} Years</span>
                        <span><strong>Gender:</strong> {patient.gender}</span>
                        <span><strong>ID:</strong> #{patient.patient_id}</span>
                    </div>
                </div>
                <Link to="/patients" className="text-gray-500 hover:text-gray-700">&larr; Back to Directory</Link>
            </div>

            {/* Timeline */}
            <h3 className="text-xl font-bold text-gray-800 mb-4 px-2">Medical History Timeline</h3>
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-linear-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                
                {timeline.map((visit, idx) => (
                    <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        
                        {/* Dot */}
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-300 group-[.is-active]:bg-indigo-500 text-slate-500 group-[.is-active]:text-emerald-50 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                            <svg className="fill-current" xmlns="http://www.w3.org/2000/svg" width="12" height="10">
                                <path fillRule="nonzero" d="M10.422 1.257 4.655 7.025 2.553 4.923A.916.916 0 0 0 1.257 6.22l2.75 2.75a.916.916 0 0 0 1.296 0l6.415-6.416a.916.916 0 0 0-1.296-1.296Z" />
                            </svg>
                        </div>
                        
                        {/* Card */}
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                            <div className="flex items-center justify-between space-x-2 mb-1">
                                <div className="font-bold text-slate-900">{visit.date}</div>
                                <time className="font-caveat font-medium text-indigo-500">{visit.time}</time>
                            </div>
                            <div className="text-slate-500 mb-2 text-sm">
                                <strong>Diagnosis:</strong> {visit.diagnosis || 'Not recorded'}
                            </div>
                            
                            {/* Drugs List */}
                            <div className="bg-slate-50 p-3 rounded text-sm space-y-1 mb-2 border border-slate-100">
                                {visit.drugs.map((d, i) => (
                                    <div key={i} className="flex justify-between">
                                        <span className="font-medium text-slate-700">{d.brand || d.name}</span>
                                        <span className="text-slate-500">{d.sig}</span>
                                    </div>
                                ))}
                            </div>
                            
                            {visit.advice && (
                                <div className="text-xs text-slate-400 italic mt-2 border-t pt-2">
                                    Advice: {visit.advice.substring(0, 60)}...
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default PatientRecord;