import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { useAuth } from '../hooks/useAuth';

const VITE_API_URL = import.meta.env.VITE_API_URL;

function PatientRecord() {
    const { id } = useParams();
    const { token } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [reprintLoading, setReprintLoading] = useState(null);
    const navigate = useNavigate();

    const fetchRecord = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${VITE_API_URL}/patients/${id}/profile`, {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!res.ok) {
                throw new Error(res.status === 404 ? 'Patient not found' : 'Failed to load patient data');
            }
            
            const result = await res.json();
            setData(result);
        } catch (error) {
            console.error('Error fetching patient record:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    }, [id, token]);

    useEffect(() => {
        fetchRecord();
    }, [fetchRecord]);

    // Format date for display
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    // Format time for display
    const formatTime = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    // Calculate age from date of birth if available
    const calculateAge = (dob) => {
        if (!dob) return data?.patient?.age || 'N/A';
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    // Handle reprint with loading state
    const handleReprint = async (patientId, rawDate, visitDate) => {
        setReprintLoading(visitDate);
        try {
            const res = await fetch(`${VITE_API_URL}/prescriptions/reprint/${patientId}`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ date: rawDate }) 
            });
            
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Prescription_${patientId}_${new Date(rawDate).toISOString().split('T')[0]}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            } else {
                const errorData = await res.json();
                alert(`Reprint failed: ${errorData.message || 'Prescription might be too old or formatted differently.'}`);
            }
        } catch (e) { 
            console.error('Reprint error:', e);
            alert('Failed to generate reprint. Please try again.');
        } finally {
            setReprintLoading(null);
        }
    };

    // Handle edit navigation
    const handleEdit = (visitData) => {
        navigate('/prescription/new', { 
            state: { 
                editMode: true, 
                visitData: visitData, 
                patientData: data.patient 
            } 
        });
    };

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="animate-pulse">
                        <div className="h-8 bg-gray-200 rounded w-48 mb-8"></div>
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="bg-white rounded-xl shadow-sm p-6">
                                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (error || !data) {
        return (
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            {error?.includes('not found') ? 'Patient Not Found' : 'Unable to Load Record'}
                        </h2>
                        <p className="text-gray-600 mb-6 max-w-md mx-auto">
                            {error || 'The patient record could not be loaded. Please check the patient ID and try again.'}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Link
                                to="/patients"
                                className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                Back to Directory
                            </Link>
                            <button
                                onClick={fetchRecord}
                                className="inline-flex items-center justify-center px-5 py-3 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Try Again
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const { patient, timeline } = data;

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Patient Record</h1>
                            <p className="mt-2 text-gray-600">Complete medical history and timeline</p>
                        </div>
                        <Link
                            to="/patients"
                            className="inline-flex items-center px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back to Directory
                        </Link>
                    </div>

                    {/* Patient Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-6">
                            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                                <div className="flex-1">
                                    <div className="flex items-start gap-4">
                                        <div className="shrink-0">
                                            <div className="w-16 h-16 bg-indigo-100 rounded-xl flex items-center justify-center">
                                                <span className="text-2xl font-bold text-indigo-800">
                                                    {patient.name?.charAt(0) || 'P'}
                                                </span>
                                            </div>
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-gray-900 mb-2">{patient.name}</h2>
                                            <div className="flex flex-wrap gap-4 mb-3">
                                                <div className="flex items-center">
                                                    <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                    </svg>
                                                    <span className="text-gray-600">
                                                        {calculateAge(patient.dob)} years, {patient.gender || 'Not specified'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center">
                                                    <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                                                    </svg>
                                                    <span className="text-gray-600">ID: {patient.patient_id}</span>
                                                </div>
                                            </div>
                                            {patient.mobile && (
                                                <div className="flex items-center text-gray-600">
                                                    <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                    </svg>
                                                    <span>{patient.mobile}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="lg:text-right">
                                    <div className="inline-flex flex-col gap-2">
                                        <Link
                                            to={`/prescription/new?patientId=${patient.patient_id}`}
                                            className="inline-flex items-center justify-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                                        >
                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                            </svg>
                                            New Prescription
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Timeline Section */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">Medical History Timeline</h3>
                            <p className="text-gray-600 text-sm mt-1">
                                {timeline.length} visit{timeline.length !== 1 ? 's' : ''} recorded
                            </p>
                        </div>
                        {timeline.length > 0 && (
                            <div className="text-sm text-gray-500">
                                Latest visit: {formatDate(timeline[0]?.raw_date)}
                            </div>
                        )}
                    </div>

                    {timeline.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h4 className="text-lg font-medium text-gray-900 mb-2">No Medical History</h4>
                            <p className="text-gray-600 mb-6 max-w-md mx-auto">
                                This patient doesn't have any recorded visits yet. Create a new prescription to start their medical history.
                            </p>
                            <Link
                                to={`/prescription/new?patientId=${patient.patient_id}`}
                                className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                Create First Prescription
                            </Link>
                        </div>
                    ) : (
                        <div className="relative">
                            {/* Timeline line */}
                            <div className="absolute left-4 md:left-1/2 transform md:-translate-x-1/2 top-0 bottom-0 w-0.5 bg-gray-200"></div>

                            <div className="space-y-8">
                                {timeline.map((visit, idx) => (
                                    <div key={idx} className="relative">
                                        {/* Timeline dot */}
                                        <div className="absolute left-4 md:left-1/2 transform md:-translate-x-1/2 -translate-y-1/2 top-8 w-3 h-3 bg-indigo-500 rounded-full border-4 border-white shadow-md"></div>

                                        {/* Card container */}
                                        <div className={`ml-12 md:ml-0 ${idx % 2 === 0 ? 'md:pr-8 md:mr-1/2 md:pl-0' : 'md:pl-8 md:ml-1/2 md:pr-0'}`}>
                                            {/* Visit Card */}
                                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
                                                {/* Card Header */}
                                                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                        <div className="flex items-center">
                                                            <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                            </svg>
                                                            <span className="font-semibold text-gray-900">
                                                                {formatDate(visit.raw_date)}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center text-sm text-gray-500">
                                                            <svg className="w-4 h-4 text-gray-400 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            {formatTime(visit.raw_date)}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Card Body */}
                                                <div className="p-6">
                                                    {/* Diagnosis */}
                                                    {visit.diagnosis && (
                                                        <div className="mb-4">
                                                            <div className="text-sm font-medium text-gray-500 mb-1">Diagnosis</div>
                                                            <div className="text-gray-900 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
                                                                {visit.diagnosis}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Prescription */}
                                                    <div className="mb-4">
                                                        <div className="text-sm font-medium text-gray-500 mb-2">Prescription</div>
                                                        <div className="space-y-3">
                                                            {visit.drugs.map((drug, drugIdx) => (
                                                                <div key={drugIdx} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                                                                    <div className="flex justify-between items-start mb-1">
                                                                        <div className="font-medium text-gray-900">
                                                                            {drug.brand || drug.name}
                                                                            {drug.strength && (
                                                                                <span className="ml-2 text-sm text-gray-600">
                                                                                    ({drug.strength})
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="text-sm font-medium text-gray-700">
                                                                            {drug.quantity}
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-sm text-gray-600 space-y-0.5">
                                                                        <div>
                                                                            <span className="text-gray-500">Dosage: </span>
                                                                            {drug.sig}
                                                                        </div>
                                                                        {drug.duration && (
                                                                            <div>
                                                                                <span className="text-gray-500">Duration: </span>
                                                                                {drug.duration}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Additional Notes */}
                                                    {(visit.advice || visit.notes) && (
                                                        <div className="mb-4">
                                                            <div className="text-sm font-medium text-gray-500 mb-1">Additional Notes</div>
                                                            <div className="text-sm text-gray-700 bg-gray-50 border border-gray-100 rounded-lg px-4 py-3">
                                                                {visit.advice || visit.notes}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Action Buttons */}
                                                    <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
                                                        <button
                                                            onClick={() =>
                                                                handleReprint(
                                                                    patient.patient_id,
                                                                    new Date(visit.raw_date).toISOString(), // ✅ FIX
                                                                    visit.raw_date
                                                                )}
                                                            disabled={reprintLoading === visit.date}
                                                            className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                        >
                                                            {reprintLoading === visit.date ? (
                                                                <>
                                                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                    </svg>
                                                                    Printing...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                                                    </svg>
                                                                    Print
                                                                </>
                                                            )}
                                                        </button>

                                                        <button
                                                            onClick={() => handleEdit(visit)}
                                                            className="inline-flex items-center px-3 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                                                        >
                                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                            Edit
                                                        </button>

                                                        <Link
                                                            to={`/patients/${patient.patient_id}/visit/${visit.visit_id || idx}`}
                                                            className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                                                        >
                                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                            </svg>
                                                            View Details
                                                        </Link>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default PatientRecord;