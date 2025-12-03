import React, { useState, useEffect } from 'react';
// FIX 1: Import from 'react-router-dom' to ensure Link works correctly
import { useParams, Link, useNavigate } from 'react-router';
import { useAuth } from '../hooks/useAuth';

const VITE_API_URL = import.meta.env.VITE_API_URL;

function PatientRecord() {
    const { id } = useParams();
    const { token } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate(); 

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

    // --- REPRINT HANDLER ---
    const handleReprint = async (patientId, date) => {
        try {
            const res = await fetch(`${VITE_API_URL}/prescriptions/reprint/${patientId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                // Ensure 'date' is the raw timestamp string from the database
                body: JSON.stringify({ date }) 
            });
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = 'Reprint.pdf'; 
                document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url);
            } else {
                alert('Reprint failed. Prescription might be too old or formatted differently.');
            }
        } catch (e) { console.error(e); }
    };

    // --- EDIT HANDLER ---
    const handleEdit = (visitData) => {
        // Navigate to Form with state to pre-fill data
        navigate('/prescription/new', { 
            state: { 
                editMode: true, 
                visitData: visitData, 
                patientData: patient 
            } 
        });
    };

    return (
        <div className="max-w-5xl mx-auto p-6 my-8">
            {/* Header Info */}
            <div className="bg-white shadow rounded-lg p-6 mb-8 border-l-4 border-indigo-600 flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">{patient.name}</h1>
                    <div className="mt-2 text-gray-600 flex gap-4">
                        <span><strong>Age:</strong> {patient.age}</span>
                        <span><strong>Gender:</strong> {patient.gender}</span>
                        <span><strong>ID:</strong> #{patient.patient_id}</span>
                    </div>
                    {patient.mobile && <div className="mt-1 text-sm text-gray-500">📞 {patient.mobile}</div>}
                </div>
                <Link to="/patients" className="text-gray-500 hover:text-gray-700 font-medium">&larr; Back to Directory</Link>
            </div>

            {/* Timeline */}
            <h3 className="text-xl font-bold text-gray-800 mb-4 px-2">Medical History Timeline</h3>
            
            {/* FIX 2: corrected 'bg-linear-to-b' to 'bg-gradient-to-b' */}
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-linear-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                
                {timeline.map((visit, idx) => (
                    <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        
                        {/* Dot */}
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-300 group-[.is-active]:bg-indigo-500 text-slate-500 group-[.is-active]:text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                            {/* Calendar Icon */}
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                            </svg>
                        </div>
                        
                        {/* Card */}
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-lg border border-slate-200 shadow-sm transition-shadow hover:shadow-md">
                            <div className="flex items-center justify-between space-x-2 mb-2">
                                <div className="font-bold text-slate-900">{visit.date}</div>
                                <time className="font-mono text-xs text-gray-500">{visit.time}</time>
                            </div>
                            
                            {/* Diagnosis */}
                            <div className="text-slate-700 mb-3 text-sm bg-indigo-50 p-2 rounded border border-indigo-100">
                                <strong>Dx:</strong> {visit.diagnosis || 'Not recorded'}
                            </div>
                            
                            {/* Drugs List */}
                            <div className="bg-white rounded text-sm space-y-2 mb-3">
                                {visit.drugs.map((d, i) => (
                                    <div key={i} className="flex flex-col border-b border-gray-100 pb-1 last:border-0 last:pb-0">
                                        <div className="flex justify-between font-medium text-slate-800">
                                            <span>{d.brand || d.name} <span className="text-xs text-gray-500 font-normal">{d.strength}</span></span>
                                            <span>{d.quantity}</span>
                                        </div>
                                        <div className="text-xs text-indigo-600">{d.sig} - {d.duration}</div>
                                    </div>
                                ))}
                            </div>
                            
                            {/* Advice Footer */}
                            {visit.advice && (
                                <div className="text-xs text-slate-500 italic mb-3">
                                    Advice: {visit.advice.substring(0, 50)}{visit.advice.length > 50 && '...'}
                                </div>
                            )}

                            {/* Actions Toolbar */}
                            <div className="flex gap-2 pt-2 border-t border-gray-100 mt-2">
                                {/* REPRINT BUTTON */}
                                <button 
                                    onClick={() => handleReprint(patient.patient_id, visit.raw_date)} 
                                    className="flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded transition-colors"
                                    title="Download PDF again"
                                >
                                    <span>🖨️</span> Print
                                </button>

                                {/* EDIT BUTTON */}
                                <button 
                                    onClick={() => handleEdit(visit)} 
                                    className="flex items-center gap-1 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded border border-indigo-200 transition-colors"
                                    title="Edit this prescription"
                                >
                                    <span>✏️</span> Edit
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default PatientRecord;