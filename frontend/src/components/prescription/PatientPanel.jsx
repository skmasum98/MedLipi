// frontend/src/components/prescription/PatientPanel.jsx
import React from 'react';

function PatientPanel({ 
    patient, handlePatientChange, 
    patientSearchQuery, handlePatientSearch, 
    patientSearchResults, selectPatient, 
    patientHistory, isHistoryLoading, handleRePrescribe,
    setPatient, setPatientHistory, setPatientSearchQuery 
}) {
    return (
        <fieldset className="p-4 border border-gray-300 rounded-lg mb-6 bg-white shadow-sm">
            <legend className="text-lg font-semibold text-indigo-700 px-2">Patient Details & History</legend>
            
            {/* Search / New Patient Toggle */}
            <div className="flex flex-col md:flex-row gap-4 mb-4">
                <div className="relative flex-1">
                    <input 
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        type="text" 
                        placeholder="Search Existing Patient by Name..." 
                        value={patientSearchQuery} 
                        onChange={handlePatientSearch}
                    />
                    {/* Search Results */}
                    {patientSearchResults.length > 0 && (
                        <ul className="absolute z-10 w-full bg-white border border-gray-400 rounded-md max-h-52 overflow-y-auto shadow-xl mt-1">
                            {patientSearchResults.map(p => (
                                <li key={p.patient_id} 
                                    className="p-3 border-b border-gray-200 cursor-pointer hover:bg-indigo-50 transition-colors"
                                    onClick={() => selectPatient(p)}
                                >
                                    <strong className="font-medium text-gray-800">{p.name}</strong> 
                                    <span className="text-sm text-gray-500 ml-2">({p.age} yrs, {p.gender})</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <button 
                    type="button"
                    onClick={() => {
                        setPatient({ name: '', age: '', gender: 'Male', id: null });
                        setPatientHistory([]);
                        setPatientSearchQuery('');
                    }}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-md transition-colors"
                >
                    New Patient
                </button>
            </div>

            {/* Inputs */}
            <div className="flex flex-wrap gap-4 items-center border-t pt-4">
                <input className="p-2 border border-gray-300 rounded-md flex-1 min-w-[200px]" type="text" name="name" placeholder="Name (Required)" value={patient.name} onChange={handlePatientChange} required />
                <input className="p-2 border border-gray-300 rounded-md w-24" type="number" name="age" placeholder="Age" value={patient.age} onChange={handlePatientChange} />
                <select className="p-2 border border-gray-300 rounded-md" name="gender" value={patient.gender} onChange={handlePatientChange}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                </select>
            </div>

            {/* History Display */}
            {patient.id && (
                <div className="mt-6 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                    <h4 className="font-semibold text-indigo-700 mb-2">Patient History ({patient.name})</h4>
                    {isHistoryLoading ? (
                        <p className="text-indigo-500">Loading history...</p>
                    ) : patientHistory.length > 0 ? (
                        <div className="max-h-48 overflow-y-auto space-y-3">
                            {patientHistory.map((visit, index) => (
                                <div key={index} className="bg-white p-3 rounded-md shadow-sm border border-gray-100">
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="text-sm font-bold text-gray-800">{visit.date} - {visit.diagnosis}</p>
                                        <button type="button" onClick={() => handleRePrescribe(visit.prescriptions)} className="bg-green-500 hover:bg-green-600 text-white text-xs py-1 px-3 rounded-full">Refill</button>
                                    </div>
                                    <ul className="list-disc pl-5 text-xs text-gray-600">
                                        {visit.prescriptions.map((p, i) => (
                                            <li key={i}>{p.generic_name} ({p.strength}): {p.sig} ({p.duration})</li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    ) : <p className="text-gray-500 italic">No history found.</p>}
                </div>
            )}
        </fieldset>
    );
}
export default PatientPanel;