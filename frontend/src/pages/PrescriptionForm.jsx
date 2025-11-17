import React, { useState, useEffect } from 'react';

import { useAuth } from '../hooks/useAuth'; 
import Modal from '../components/Modal';


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
    const [instructionBlocks, setInstructionBlocks] = useState([]); 
    const [newInstructionBlock, setNewInstructionBlock] = useState({ title: '', content: '' });
    const [isInstructionModalOpen, setIsInstructionModalOpen] = useState(false); 
    const [isSigModalOpen, setIsSigModalOpen] = useState(false); 
    const [editingSigTemplate, setEditingSigTemplate] = useState(null); 
    const [editingInstructionBlock, setEditingInstructionBlock] = useState(null); 


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

    const fetchInstructionBlocks = async () => {
        if (!authToken) return;
        try {
            const response = await fetch(`${VITE_API_URL}/templates/instruction`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (response.ok) {
                setInstructionBlocks(await response.json());
            }
        } catch (error) {
            console.error('Failed to fetch instruction blocks:', error);
        }
    };

    fetchTemplates();
    fetchInstructionBlocks();
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

// --- New Handler: One-Click Re-Prescribe ---
const handleRePrescribe = (pastPrescriptions) => {
    // 1. Confirm with the doctor
    if (!window.confirm(`Refill ${pastPrescriptions.length} items from the prescription on ${pastPrescriptions[0].date}?`)) {
        return;
    }

    // 2. Map the past drugs to the current prescription format
    const newItems = pastPrescriptions.map(p => ({
        // Drug Inventory Fields (from history payload)
        // We DON'T have the drug_id in the history payload, so we must add a lookup/fallback

        // NOTE: The backend /history route needs to be updated to include drug_id. 
        // For now, we'll use a placeholder and rely on the name/strength for display.
        // We will fix the backend in Step 3/A.
        drug_id: p.drug_id, 
        generic_name: p.generic_name, 
        strength: p.strength,
        trade_names: p.trade_names,
        counseling_points: 'Warning: Drug ID not loaded from history.', // Fallback counseling point

        // Prescription Fields (from history payload)
        quantity: p.quantity,
        sig_instruction: p.sig, // Note: the history API returns 'sig'
        duration: p.duration,
        tempId: Date.now() + Math.random(), // New unique ID
    }));

    // 3. Update the main prescription list
    setPrescriptions(prevPrescriptions => [...prevPrescriptions, ...newItems]);

    // 4. Set diagnosis/advice (Optional, but useful)
    // Find the diagnosis/advice from the first item (since the history API groups them)
    setDiagnosis(pastPrescriptions[0].diagnosis_text || ''); 
    setAdvice(pastPrescriptions[0].general_advice || ''); 
    
    alert('Prescription items loaded into the form!');
};

const handleSaveTemplate = async (e) => {
    e.preventDefault();


    if (!newTemplate.title || !newTemplate.instruction) {
        alert('Template title and instruction are required.');
        return;
    }

    const templateId = editingSigTemplate?.template_id; 
    const isEditing = !!templateId && typeof templateId === 'number'; 

    const url = isEditing ? 
        `${VITE_API_URL}/templates/sig/${templateId}` : 
        `${VITE_API_URL}/templates/sig`;
    const method = isEditing ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
            body: JSON.stringify(newTemplate),
        });
        
        if (response.ok) {
            // Update the list (read logic)
            const updatedList = isEditing ? 
                sigTemplates.map(t => t.template_id === editingSigTemplate.template_id ? { ...t, ...newTemplate } : t) :
                [...sigTemplates, { ...newTemplate, template_id: (await response.json()).templateId }];
            
            setSigTemplates(updatedList);
            setNewTemplate({ title: '', instruction: '' }); 
            setEditingSigTemplate(null); // Exit editing mode
            alert(`Template ${isEditing ? 'updated' : 'saved'}!`);
            setIsSigModalOpen(false); 
        } else {
            const errorData = await response.json();
            alert(`Error saving template: ${errorData.message}`);
        }
    } catch (error) {
        console.error('Save template failed:', error);
        alert('Network error saving template.');
    }
};

// --- New Handler: Delete SIG Template ---
const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm("Are you sure you want to delete this template?")) return;

    try {
        const response = await fetch(`${VITE_API_URL}/templates/sig/${templateId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            setSigTemplates(sigTemplates.filter(t => t.template_id !== templateId));
            alert('Template deleted successfully!');
        } else {
            const errorData = await response.json();
            alert(`Delete failed: ${errorData.message}`);
        }
    } catch (error) {
        console.error('Delete failed:', error);
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


    // --- Handler to Save a New Instruction Block ---
const handleSaveInstructionBlock = async (e) => {
    e.preventDefault();
    if (!newInstructionBlock.title || !newInstructionBlock.content) {
        alert('Title and content are required.');
        return;
    }

    const blockId = editingInstructionBlock?.block_id; 
    const isEditing = !!blockId && typeof blockId === 'number'; 
    const url = isEditing ? 
        `${VITE_API_URL}/templates/instruction/${blockId}` : 
        `${VITE_API_URL}/templates/instruction`;
    const method = isEditing ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
            body: JSON.stringify(newInstructionBlock),
        });
        
        if (response.ok) {
            // Update the state array
            const updatedList = isEditing ? 
                instructionBlocks.map(b => b.block_id === editingInstructionBlock.block_id ? { ...b, ...newInstructionBlock } : b) :
                [...instructionBlocks, { ...newInstructionBlock, block_id: (await response.json()).blockId }];
            
            setInstructionBlocks(updatedList);
            setNewInstructionBlock({ title: '', content: '' }); 
            setEditingInstructionBlock(null); 
            alert(`Instruction Block ${isEditing ? 'updated' : 'saved'}!`);
            setIsInstructionModalOpen(false); 
        } else {
            const errorData = await response.json();
            alert(`Error ${isEditing ? 'updating' : 'saving'} block: ${errorData.message}`);
        }
    } catch (error) {
        console.error('Save/Update block failed:', error);
        alert('Network error saving block.');
    }
};

// --- New Handler: Delete Instruction Block ---
const handleDeleteInstructionBlock = async (blockId) => {
    if (!window.confirm("Are you sure you want to delete this Instruction Block?")) return;

    try {
        const response = await fetch(`${VITE_API_URL}/templates/instruction/${blockId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            // Filter the deleted item out of the state array
            setInstructionBlocks(instructionBlocks.filter(b => b.block_id !== blockId));
            alert('Instruction Block deleted successfully!');
        } else {
            const errorData = await response.json();
            alert(`Delete failed: ${errorData.message}`);
        }
    } catch (error) {
        console.error('Delete failed:', error);
    }
};

// --- Handler to Apply Instruction Block to Advice ---
const applyInstructionBlock = (content) => {
    // Append the content to the existing advice, adding a newline separator
    setAdvice(prevAdvice => (prevAdvice ? prevAdvice + '\n\n---\n\n' : '') + content);
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
                        {/* ... (loading/no history checks) ... */}
                        {patientHistory.length > 0 && (
                            <div className="max-h-48 overflow-y-auto space-y-3">
                                {patientHistory.map((visit, index) => (
                                    <div key={index} className="bg-white p-3 rounded-md shadow-sm border border-gray-100">
                                        <div className="flex justify-between items-center mb-1">
                                            <p className="text-sm font-bold text-gray-800">
                                                {visit.date} - Diagnosis: {visit.diagnosis || 'N/A'}
                                            </p>
                                            
                                            {/* --- RE-PRESCRIBE BUTTON --- */}
                                            <button
                                                type="button"
                                                onClick={() => handleRePrescribe(visit.prescriptions)} 
                                                className="bg-green-500 hover:bg-green-600 text-white text-xs py-1 px-3 rounded-full transition-colors font-medium shadow-sm"
                                                title="Load this prescription to the current form"
                                            >
                                                Refill / Re-Prescribe
                                            </button>
                                            {/* ------------------------- */}
                                        </div>

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
                <legend className="text-lg font-semibold text-gray-700 px-2">Dosage Instructions</legend>
                
                {/* Saved Templates List and Modal Button */}
                <div className="flex flex-wrap gap-3 mb-4 items-center border-b pb-4 border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mr-2">Quick Commands:</p>

                    {sigTemplates.length === 0 ? (
                        <p className="text-gray-500 italic text-sm mr-4">No templates. </p>
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
                    
                    {/* BUTTON TO OPEN SIG MODAL */}
                    <button 
                        type="button"
                        onClick={() => setIsSigModalOpen(true)}
                        className="px-3 py-1 text-sm border border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700 transition-colors rounded-full font-medium shadow-md ml-auto"
                    >
                        + Create/Manage Templates
                    </button>
                </div>
            </fieldset>

            {/* SIG modal */}
            <Modal 
                isOpen={isSigModalOpen} 
                onClose={() => { 
                    setIsSigModalOpen(false); 
                    setEditingSigTemplate(null); 
                    
                    setNewTemplate({ title: '', instruction: '' }); 
                }} 
                title={editingSigTemplate ? "Edit SIG Template" : "Create New SIG Template"}
            >
                {/* Management/List View */}
                {!editingSigTemplate && (
                    <div className="mb-6">
                        <h4 className="text-lg font-medium mb-2">My Saved Templates</h4>
                        <div className="max-h-40 overflow-y-auto space-y-2 border p-2 rounded-md">
                            {sigTemplates.map(template => (
                                <div key={template.template_id} className="flex justify-between items-center p-2 bg-gray-50 rounded-md">
                                    <span className="text-sm font-medium">{template.title}</span>
                                    <div className="space-x-2">
                                        <button 
                                            type="button" 
                                            onClick={() => { setEditingSigTemplate(template); setNewTemplate(template); }}
                                            className="text-xs text-indigo-600 hover:text-indigo-800"
                                        >
                                            Edit
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => handleDeleteTemplate(template.template_id)}
                                            className="text-xs text-red-600 hover:text-red-800"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button 
                            type="button" 
                            onClick={() => {
                                setEditingSigTemplate({ template_id: null }); 
                                setNewTemplate({ title: '', instruction: '' }); 
                            }}
                            className="mt-4 w-full py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                        >
                            + Create New Template
                        </button>
                    </div>
                )}

                {/* Create/Edit Form View */}
                {(editingSigTemplate || !sigTemplates.length) && (
                    <form onSubmit={handleSaveTemplate} className="flex flex-col gap-4 pt-4 border-t">
                        <p className="text-sm text-gray-600">
                            {editingSigTemplate ? 'Modify the selected template.' : 'Create a new template.'}
                        </p>
                        {/* Title Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Template Title</label>
                            <input 
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                type="text" 
                                placeholder="e.g., TID 7 Days" 
                                value={newTemplate.title} 
                                onChange={(e) => setNewTemplate({ ...newTemplate, title: e.target.value })}
                                required
                            />
                        </div>

                        {/* Instruction Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Instruction (SIG)</label>
                            <input 
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                type="text" 
                                placeholder="e.g., Take 1 tablet three times a day for 7 days" 
                                value={newTemplate.instruction} 
                                onChange={(e) => setNewTemplate({ ...newTemplate, instruction: e.target.value })}
                                required
                            />
                        </div>

                        {/* Modal Actions */}
                        <div className="flex justify-end space-x-3 mt-4">
                            <button 
                                type="button"
                                onClick={() => {
                                    setEditingSigTemplate(null);
                                    setNewTemplate({ title: '', instruction: '' }); 
                                }}
                                className="py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                {editingSigTemplate ? 'Cancel Edit' : 'Cancel'}
                            </button>
                            <button 
                                type="submit" 
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md text-sm transition-colors shadow-md"
                            >
                                {editingSigTemplate ? 'Update Template' : 'Save Template'}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* 4. Patient Guide/Advice */}
            <fieldset className="p-4 border border-gray-300 rounded-lg mb-8">
                <legend className="text-lg font-semibold text-gray-700 px-2">Patient Guide (Instructions)</legend>
                
                {/* Instruction Blocks List and Modal Button */}
                <div className="flex flex-wrap gap-3 mb-4 items-center border-b pb-4 border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mr-2">Quick Blocks:</p>
                    
                    {instructionBlocks.length === 0 ? (
                        <p className="text-gray-500 italic text-sm mr-4">No blocks. </p>
                    ) : (
                        instructionBlocks.map(block => (
                            <button 
                                key={block.block_id} 
                                type="button"
                                title={block.content}
                                className="px-3 py-1 text-sm border border-pink-400 bg-pink-100 text-pink-700 hover:bg-pink-200 transition-colors rounded-full font-medium shadow-sm"
                                onClick={() => applyInstructionBlock(block.content)}
                            >
                                {block.title}
                            </button>
                        ))
                    )}
                    
                    {/* BUTTON TO OPEN MODAL */}
                    <button 
                        type="button"
                        onClick={() => setIsInstructionModalOpen(true)}
                        className="px-3 py-1 text-sm border border-pink-600 bg-pink-600 text-white hover:bg-pink-700 transition-colors rounded-full font-medium shadow-md ml-auto"
                    >
                        + Create/Manage Blocks
                    </button>
                </div>
                
                {/* Main Advice Textarea */}
                <textarea 
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="General Advice (Rest, Follow up, etc.) - Content from blocks is appended here." 
                    value={advice} onChange={(e) => setAdvice(e.target.value)} rows="4"
                ></textarea>
                <textarea 
                    className="w-full p-2 border border-gray-300 rounded-md mb-3 focus:ring-indigo-500 focus:border-indigo-500 mt-4"
                    placeholder="Diagnosis Text (e.g., Viral Fever, Sinusitis)" 
                    value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} rows="2"
                ></textarea>
            </fieldset>
            
            <button 
                type="submit" 
                onClick={handleSubmit} 
                className="w-full py-3 text-xl font-semibold bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors shadow-lg"
            >
                Generate Prescription & Guide
            </button>

            <Modal 
                isOpen={isInstructionModalOpen} 
                onClose={() => { 
                    // Reset all modal-related states on close
                    setIsInstructionModalOpen(false); 
                    setEditingInstructionBlock(null);
                    setNewInstructionBlock({ title: '', content: '' }); 
                }} 
                title={editingInstructionBlock ? "Edit Instruction Block" : "Manage Instruction Blocks"}
            >
                {/* 1. Management/List View */}
                {!editingInstructionBlock && (
                    <div className="mb-6">
                        <h4 className="text-lg font-medium mb-2">My Saved Blocks</h4>
                        <div className="max-h-64 overflow-y-auto space-y-2 border p-2 rounded-md">
                            {instructionBlocks.length === 0 ? (
                                <p className="text-gray-500 italic text-sm p-2">No custom blocks saved.</p>
                            ) : (
                                instructionBlocks.map(block => (
                                    <div key={block.block_id} className="flex justify-between items-center p-2 bg-gray-50 rounded-md">
                                        <span className="text-sm font-medium">{block.title}</span>
                                        <div className="space-x-2">
                                            <button 
                                                type="button" 
                                                onClick={() => { 
                                                    setEditingInstructionBlock(block); 
                                                    setNewInstructionBlock(block); // Pre-fill form
                                                }}
                                                className="text-xs text-indigo-600 hover:text-indigo-800"
                                            >
                                                Edit
                                            </button>
                                            <button 
                                                type="button" 
                                                onClick={() => handleDeleteInstructionBlock(block.block_id)}
                                                className="text-xs text-red-600 hover:text-red-800"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        {/* Button to switch to Create Form */}
                        <button 
                            type="button" 
                            onClick={() => {
                                setEditingInstructionBlock({ block_id: null }); // Signal create new
                                setNewInstructionBlock({ title: '', content: '' }); 
                            }} 
                            className="mt-4 w-full py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                        >
                            + Create New Block
                        </button>
                    </div>
                )}

                {/* 2. Create/Edit Form View */}
                {(editingInstructionBlock || instructionBlocks.length === 0) && (
                    <form onSubmit={handleSaveInstructionBlock} className="flex flex-col gap-4 pt-4 border-t">
                        <p className="text-sm text-gray-600">
                            {editingInstructionBlock ? 'Modify the selected instruction block.' : 'Create a new reusable block.'}
                        </p>
                        
                        {/* Title Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Block Title</label>
                            <input 
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500"
                                type="text" 
                                placeholder="e.g., Dengue Fever Care" 
                                value={newInstructionBlock.title} 
                                onChange={(e) => setNewInstructionBlock({ ...newInstructionBlock, title: e.target.value })}
                                required
                            />
                        </div>

                        {/* Content Textarea */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Detailed Content for Patient Handout</label>
                            <textarea 
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500"
                                placeholder="E.g., Rest well, drink plenty of fluids, and avoid NSAIDs like Ibuprofen." 
                                value={newInstructionBlock.content} 
                                onChange={(e) => setNewInstructionBlock({ ...newInstructionBlock, content: e.target.value })}
                                rows="4"
                                required
                            />
                        </div>

                        {/* Modal Actions */}
                        <div className="flex justify-end space-x-3 mt-4">
                            <button 
                                type="button"
                                onClick={() => {
                                    setEditingInstructionBlock(null);
                                    setNewInstructionBlock({ title: '', content: '' }); // <-- ADD THIS
                                }}
                                className="py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                {editingInstructionBlock ? 'Cancel Edit' : 'Cancel'}
                            </button>
                            <button 
                                type="submit" 
                                className="bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 px-4 rounded-md text-sm transition-colors shadow-md"
                            >
                                {editingInstructionBlock ? 'Update Block' : 'Save Block'}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
}

export default PrescriptionForm;