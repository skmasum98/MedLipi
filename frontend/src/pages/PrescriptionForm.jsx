import React, { useState, useEffect } from 'react';

import { useAuth } from '../hooks/useAuth'; 


const VITE_API_URL = import.meta.env.VITE_API_URL;


function PrescriptionForm() {
    const [sigTemplates, setSigTemplates] = useState([]);
const [newTemplate, setNewTemplate] = useState({ title: '', instruction: '' });
     const { token: authToken, doctor } = useAuth();
    const [patient, setPatient] = useState({ name: '', age: '', gender: 'Male', id: null });
    const [patientSearchQuery, setPatientSearchQuery] = useState(''); // New search state
    const [patientSearchResults, setPatientSearchResults] = useState([]); // New results state
    const [patientHistory, setPatientHistory] = useState([]); // New history state
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [prescriptions, setPrescriptions] = useState([]);
    const [diagnosis, setDiagnosis] = useState('');
    const [advice, setAdvice] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);

    // --- Fetch Templates on Load ---
useEffect(() => {
    const fetchTemplates = async () => {
        if (!authToken) return;
        try {
            const response = await fetch(`${VITE_API_URL}/templates/sig`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (response.ok) {
                const data = await response.json();
                setSigTemplates(data);
            }
        } catch (error) {
            console.error('Failed to fetch templates:', error);
        }
    };
    fetchTemplates();
}, [authToken, VITE_API_URL]);


// --- New Handler: Search Patient ---
const handlePatientSearch = async (e) => {
    const query = e.target.value;
    setPatientSearchQuery(query);
    if (query.length < 3) return setPatientSearchResults([]);

    try {
        const response = await fetch(`${VITE_API_URL}/patients/search?q=${query}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (response.ok) {
            setPatientSearchResults(await response.json());
        }
    } catch (error) {
        console.error('Patient search failed:', error);
    }
};

// --- New Handler: Select Patient & Load History ---
const selectPatient = async (selectedPatient) => {
    // 1. Fill the form with patient data
    setPatient({ 
        name: selectedPatient.name, 
        age: selectedPatient.age, 
        gender: selectedPatient.gender, 
        id: selectedPatient.patient_id // Store the ID
    });
    setPatientSearchQuery('');
    setPatientSearchResults([]);

    // 2. Fetch History
    setIsHistoryLoading(true);
    try {
        const response = await fetch(`${VITE_API_URL}/patients/${selectedPatient.patient_id}/history`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (response.ok) {
            setPatientHistory(await response.json());
        }
    } catch (error) {
        console.error('Failed to load patient history:', error);
    } finally {
        setIsHistoryLoading(false);
    }
};

const handleSaveTemplate = async (e) => {
    e.preventDefault();
    if (!newTemplate.title || !newTemplate.instruction) {
        alert('Template title and instruction are required.');
        return;
    }

    try {
        const response = await fetch(`${VITE_API_URL}/templates/sig`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(newTemplate),
        });
        
        if (response.ok) {
            const data = await response.json();
            // Add the new template to the state immediately
            setSigTemplates([...sigTemplates, { ...newTemplate, template_id: data.templateId }]);
            setNewTemplate({ title: '', instruction: '' }); // Clear input
            alert('Template saved!');
        } else {
            const errorData = await response.json();
            alert(`Error saving template: ${errorData.message}`);
        }
    } catch (error) {
        console.error('Save template failed:', error);
        alert('Network error saving template.');
    }
};


// --- Handler to Apply Template to a Drug Item ---
const applyTemplate = (tempId, instruction) => {
    handlePrescriptionItemChange(tempId, 'sig_instruction', instruction);
};

    // --- Handlers ---
    const handlePatientChange = (e) => {
        setPatient({ ...patient, [e.target.name]: e.target.value });
    };

    const handleSearch = async (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        if (query.length < 3) return setSearchResults([]);

        try {
            const response = await fetch(`${VITE_API_URL}/inventory/search?q=${query}`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (response.ok) {
                const data = await response.json();
                setSearchResults(data);
            }
        } catch (error) {
            console.error('Search failed:', error);
        }
    };
    
    // Function to add a drug to the prescription list
    const addDrugToPrescription = (drug) => {
        const newPrescription = {
            ...drug,
            quantity: '',
            sig_instruction: '',
            duration: '',
            tempId: Date.now(), // Unique ID for React key/deletion
        };
        setPrescriptions([...prescriptions, newPrescription]);
        setSearchResults([]); // Clear search results
        setSearchQuery(''); // Clear search box
    };

    // Handler for updating a single prescription item (e.g., SIG/Quantity)
    const handlePrescriptionItemChange = (tempId, field, value) => {
        setPrescriptions(prescriptions.map(item => 
            item.tempId === tempId ? { ...item, [field]: value } : item
        ));
    };

    const removePrescriptionItem = (tempId) => {
        setPrescriptions(prescriptions.filter(item => item.tempId !== tempId));
    };

    // --- Submission ---
     const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!prescriptions.length || !patient.name) {
            alert('Please add at least one drug and patient name.');
            return;
        }

        const payload = {
             patient: { ...patient, id: patient.id },
            // Only send necessary fields for prescription submission
            prescriptions: prescriptions.map(p => ({
                drug_id: p.drug_id,
                quantity: p.quantity,
                sig_instruction: p.sig_instruction,
                duration: p.duration,
                generic_name: p.generic_name, 
                strength: p.strength,
                // Include counseling points/trade names for the PDF function to save a DB call
                trade_names: p.trade_names,
                counseling_points: p.counseling_points 
            })),
            diagnosis_text: diagnosis,
            general_advice: advice,
        };
        
        try {
            const response = await fetch(`${VITE_API_URL}/prescriptions`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(payload),
            });
            
            if (response.ok) {
                // SUCCESS: PDF is coming back as a blob
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                // Get the filename from the Content-Disposition header (optional, but good)
                // const filenameMatch = response.headers.get('Content-Disposition').match(/filename="(.+)"/);
                // a.download = filenameMatch ? filenameMatch[1] : 'prescription.pdf';
                const contentDisposition = response.headers.get('Content-Disposition');

                // Check if the header exists and then try to match
                if (contentDisposition) {
                    const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                    a.download = filenameMatch ? filenameMatch[1] : 'prescription.pdf';
                } else {
                    a.download = 'prescription.pdf'; // Fallback filename
                }
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                alert('Prescription saved and PDF is downloading!');

                // Clear the form after successful generation
                setPatient({ name: '', age: '', gender: 'Male' });
                setPrescriptions([]);
                setDiagnosis('');
                setAdvice('');

            } else {
                const errorData = await response.json();
                alert(`Error: ${errorData.message || 'Failed to generate prescription.'}`);
            }
        } catch (error) {
            console.error('Submission Error:', error);
            alert('Network error. Failed to connect to API.');
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-5 border border-gray-200 rounded-xl shadow-lg my-8 bg-white">
            <h2 className="text-3xl font-bold mb-6 text-indigo-700 border-b pb-2">New Patient Encounter & Prescription</h2>
            
            {/* 1. Patient Details */}
             {/* 1. Patient Details */}
            <fieldset className="p-4 border border-gray-300 rounded-lg mb-6">
                <legend className="text-lg font-semibold text-gray-700 px-2">Patient Details & History</legend>
                
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
                        {/* Search Results Dropdown */}
                        {patientSearchResults.length > 0 && (
                            <ul className="absolute z-10 w-full bg-white border border-gray-400 rounded-md max-h-52 overflow-y-auto shadow-xl mt-1">
                                {patientSearchResults.map(p => (
                                    <li 
                                        key={p.patient_id} 
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
                    {/* Clear/New Patient Button */}
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

                {/* Patient Input Fields (Always visible) */}
                <div className="flex flex-wrap gap-4 items-center border-t pt-4">
                    <input 
                        className="p-2 border border-gray-300 rounded-md flex-1 min-w-[200px] focus:ring-indigo-500 focus:border-indigo-500"
                        type="text" name="name" placeholder="Name (Required)" value={patient.name} onChange={handlePatientChange} required 
                    />
                    <input 
                        className="p-2 border border-gray-300 rounded-md w-24 focus:ring-indigo-500 focus:border-indigo-500"
                        type="number" name="age" placeholder="Age" value={patient.age} onChange={handlePatientChange} 
                    />
                    <select 
                        className="p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        name="gender" value={patient.gender} onChange={handlePatientChange}
                    >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                    </select>
                </div>

                {/* Patient History Display Panel */}
                {patient.id && (
                    <div className="mt-6 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                        <h4 className="font-semibold text-indigo-700 mb-2">Patient History ({patient.name})</h4>
                        {isHistoryLoading ? (
                            <p className="text-indigo-500">Loading history...</p>
                        ) : patientHistory.length === 0 ? (
                            <p className="text-gray-500 italic">No past prescriptions found.</p>
                        ) : (
                            <div className="max-h-48 overflow-y-auto space-y-3">
                                {patientHistory.map((visit, index) => (
                                    <div key={index} className="bg-white p-3 rounded-md shadow-sm border border-gray-100">
                                        <p className="text-sm font-bold text-gray-800 mb-1">{visit.date} - Diagnosis: {visit.diagnosis || 'N/A'}</p>
                                        <ul className="list-disc pl-5 text-xs text-gray-600">
                                            {visit.prescriptions.map((p, pIndex) => (
                                                <li key={pIndex}>{p.generic_name} ({p.strength}): {p.sig} ({p.duration})</li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </fieldset>

            {/* 2. Drug Search and Add */}
            <fieldset className="p-4 border border-gray-300 rounded-lg mb-6">
                <legend className="text-lg font-semibold text-gray-700 px-2">Add Medication</legend>
                <input 
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    type="text" placeholder="Search Drug Name (e.g., Napa, Amoxicillin)" value={searchQuery} onChange={handleSearch} 
                />
                
                {searchResults.length > 0 && (
                    <ul className="list-none p-0 mt-2 border border-gray-400 rounded-md max-h-52 overflow-y-auto shadow-md">
                        {searchResults.map(drug => (
                            <li 
                                key={drug.drug_id} 
                                className="p-3 border-b border-gray-200 cursor-pointer hover:bg-indigo-50 transition-colors"
                                onClick={() => addDrugToPrescription(drug)}
                            >
                                <strong className="font-medium text-gray-800">{drug.generic_name}</strong> 
                                <span className="text-sm text-gray-500 ml-2">({drug.trade_names}) - {drug.strength}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </fieldset>

            {/* 3. Prescription List */}
            <fieldset className="p-4 border border-gray-300 rounded-lg mb-6">
                <legend className="text-lg font-semibold text-gray-700 px-2">Prescription List ({prescriptions.length})</legend>
                {prescriptions.length === 0 ? (
                    <p className="text-gray-500 italic">No medications added yet.</p>
                ) : (
                    prescriptions.map(item => (
                        <div key={item.tempId} className="flex flex-wrap gap-2 md:gap-4 items-center border-b border-gray-200 py-3 last:border-b-0">
                            <div className="font-bold text-indigo-600 flex-1 min-w-[150px]">{item.generic_name} ({item.strength})</div>
                            <input 
                                className="p-1 border border-gray-300 rounded-md w-24 focus:ring-indigo-500 focus:border-indigo-500 text-center"
                                type="text" placeholder="Qty" value={item.quantity} 
                                onChange={(e) => handlePrescriptionItemChange(item.tempId, 'quantity', e.target.value)} 
                            />
                            <input 
                                className="p-1 border border-gray-300 rounded-md flex-2 min-w-[200px] focus:ring-indigo-500 focus:border-indigo-500"
                                type="text" placeholder="SIG (e.g., 1+0+1)" value={item.sig_instruction} 
                                onChange={(e) => handlePrescriptionItemChange(item.tempId, 'sig_instruction', e.target.value)} 
                            />
                            <input 
                                className="p-1 border border-gray-300 rounded-md w-28 focus:ring-indigo-500 focus:border-indigo-500 text-center"
                                type="text" placeholder="Duration" value={item.duration} 
                                onChange={(e) => handlePrescriptionItemChange(item.tempId, 'duration', e.target.value)} 
                            />
                            <button 
                                type="button" 
                                onClick={() => removePrescriptionItem(item.tempId)} 
                                className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-md transition-colors"
                            >
                                Remove
                            </button>
                        </div>
                    ))
                )}
            </fieldset>
            
            {/* 3.A SIG Templates */}
            <fieldset className="p-4 border border-gray-300 rounded-lg mb-6">
                <legend className="text-lg font-semibold text-gray-700 px-2">SIG Templates (Dosage Instructions)</legend>
                
                {/* Saved Templates List */}
                <div className="flex flex-wrap gap-3 mb-4">
                    {sigTemplates.length === 0 ? (
                        <p className="text-gray-500 italic">No templates saved yet.</p>
                    ) : (
                        sigTemplates.map(template => (
                            <button 
                                key={template.template_id} 
                                type="button"
                                title={template.instruction}
                                className="px-3 py-1 text-sm border border-indigo-400 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors rounded-full font-medium shadow-sm"
                                onClick={() => {
                                    if (prescriptions.length > 0) {
                                        const latestDrugId = prescriptions[prescriptions.length - 1].tempId;
                                        applyTemplate(latestDrugId, template.instruction);
                                    } else {
                                        alert('Please add a drug first.');
                                    }
                                }}
                            >
                                {template.title}
                            </button>
                        ))
                    )}
                </div>

                {/* Save New Template Form */}
                <form onSubmit={handleSaveTemplate} className="flex flex-col md:flex-row gap-2">
                    <input 
                        className="p-2 border border-gray-300 rounded-md flex-1 focus:ring-indigo-500 focus:border-indigo-500"
                        type="text" 
                        placeholder="Template Title (e.g., TID 7 Days)" 
                        value={newTemplate.title} 
                        onChange={(e) => setNewTemplate({ ...newTemplate, title: e.target.value })}
                        required
                    />
                    <input 
                        className="p-2 border border-gray-300 rounded-md flex-2 focus:ring-indigo-500 focus:border-indigo-500"
                        type="text" 
                        placeholder="Instruction (e.g., 1+0+1 for 7 days)" 
                        value={newTemplate.instruction} 
                        onChange={(e) => setNewTemplate({ ...newTemplate, instruction: e.target.value })}
                        required
                    />
                    <button 
                        type="submit" 
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition-colors shadow-md"
                    >
                        Save Template
                    </button>
                </form>
            </fieldset>

            {/* 4. Patient Guide/Advice */}
            <fieldset className="p-4 border border-gray-300 rounded-lg mb-8">
                <legend className="text-lg font-semibold text-gray-700 px-2">Patient Guide (Instructions)</legend>
                <textarea 
                    className="w-full p-2 border border-gray-300 rounded-md mb-3 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Diagnosis Text (e.g., Viral Fever, Sinusitis)" 
                    value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} rows="2"
                ></textarea>
                <textarea 
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="General Advice (e.g., Rest well, Follow up in 3 days, Avoid cold drinks)" 
                    value={advice} onChange={(e) => setAdvice(e.target.value)} rows="4"
                ></textarea>
            </fieldset>
            
            <button 
                type="submit" 
                onClick={handleSubmit} 
                className="w-full py-3 text-xl font-semibold bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors shadow-lg"
            >
                Generate Prescription & Guide
            </button>
        </div>
    );
}

export default PrescriptionForm;