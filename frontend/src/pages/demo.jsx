// frontend/src/pages/PrescriptionForm.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth'; 

// Import the new Sub-Components
import PatientPanel from '../components/prescription/PatientPanel';
import MedicationPanel from '../components/prescription/MedicationPanel';
import ClinicalNotesPanel from '../components/prescription/ClinicalNotesPanel';

const VITE_API_URL = import.meta.env.VITE_API_URL;

function PrescriptionForm() {
    const { token: authToken } = useAuth();

    // --- STATE MANAGEMENT ---
    // Patient
    const [patient, setPatient] = useState({ name: '', age: '', gender: 'Male', id: null });
    const [patientSearchQuery, setPatientSearchQuery] = useState(''); 
    const [patientSearchResults, setPatientSearchResults] = useState([]); 
    const [patientHistory, setPatientHistory] = useState([]); 
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);

    // Prescription / Drugs
    const [prescriptions, setPrescriptions] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [interactionWarnings, setInteractionWarnings] = useState([]); 

    // Clinical Notes / Diagnosis
    const [diagnosis, setDiagnosis] = useState({ code: '', description: '' });
    const [diagnosisSearchQuery, setDiagnosisSearchQuery] = useState('');
    const [diagnosisSearchResults, setDiagnosisSearchResults] = useState([]);
    const [advice, setAdvice] = useState('');

    // Templates (SIG & Instructions)
    const [sigTemplates, setSigTemplates] = useState([]);
    const [instructionBlocks, setInstructionBlocks] = useState([]); 
    
    // Modal/Edit States
    const [isSigModalOpen, setIsSigModalOpen] = useState(false); 
    const [isInstructionModalOpen, setIsInstructionModalOpen] = useState(false); 
    const [editingSigTemplate, setEditingSigTemplate] = useState(null); 
    const [editingInstructionBlock, setEditingInstructionBlock] = useState(null); 
    const [newTemplate, setNewTemplate] = useState({ title: '', instruction: '' });
    const [newInstructionBlock, setNewInstructionBlock] = useState({ title: '', content: '' });


    // --- INITIAL DATA FETCHING ---
    useEffect(() => {
        if (!authToken) return;
        
        const fetchData = async () => {
            try {
                const [sigRes, instRes] = await Promise.all([
                    fetch(`${VITE_API_URL}/templates/sig`, { headers: { 'Authorization': `Bearer ${authToken}` } }),
                    fetch(`${VITE_API_URL}/templates/instruction`, { headers: { 'Authorization': `Bearer ${authToken}` } })
                ]);
                if (sigRes.ok) setSigTemplates(await sigRes.json());
                if (instRes.ok) setInstructionBlocks(await instRes.json());
            } catch (error) {
                console.error('Initial fetch failed:', error);
            }
        };
        fetchData();
    }, [authToken, VITE_API_URL]);

    // --- INTERACTION CHECKER ---
    useEffect(() => {
        const checkInteractions = async () => {
            if (!authToken || prescriptions.length < 2) return setInteractionWarnings([]);
            const drugIds = [...new Set(prescriptions.map(p => p.drug_id).filter(id => id))];
            if (drugIds.length < 2) return setInteractionWarnings([]);

            try {
                const response = await fetch(`${VITE_API_URL}/interactions/check`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                    body: JSON.stringify({ drugIds }),
                });
                if (response.ok) setInteractionWarnings(await response.json());
            } catch (e) { console.error(e); }
        };
        const timer = setTimeout(checkInteractions, 500); 
        return () => clearTimeout(timer); 
    }, [prescriptions, authToken, VITE_API_URL]);


    // --- HANDLERS: PATIENT ---
    const handlePatientSearch = async (e) => {
        const query = e.target.value;
        setPatientSearchQuery(query);
        if (query.length < 3) return setPatientSearchResults([]);
        try {
            const res = await fetch(`${VITE_API_URL}/patients/search?q=${query}`, { headers: { 'Authorization': `Bearer ${authToken}` } });
            if (res.ok) setPatientSearchResults(await res.json());
        } catch (e) { console.error(e); }
    };

    const selectPatient = async (p) => {
        setPatient({ name: p.name, age: p.age, gender: p.gender, id: p.patient_id });
        setPatientSearchQuery('');
        setPatientSearchResults([]);
        setIsHistoryLoading(true);
        try {
            const res = await fetch(`${VITE_API_URL}/patients/${p.patient_id}/history`, { headers: { 'Authorization': `Bearer ${authToken}` } });
            if (res.ok) setPatientHistory(await res.json());
        } catch (e) { console.error(e); } finally { setIsHistoryLoading(false); }
    };

    const handleRePrescribe = (pastPrescriptions) => {
        if (!window.confirm(`Refill ${pastPrescriptions.length} items?`)) return;
        const newItems = pastPrescriptions.map(p => ({
            drug_id: p.drug_id, generic_name: p.generic_name, strength: p.strength, trade_names: p.trade_names,
            counseling_points: p.counseling_points || '', quantity: p.quantity, sig_instruction: p.sig, duration: p.duration,
            tempId: Date.now() + Math.random()
        }));
        setPrescriptions(prev => [...prev, ...newItems]);
        setDiagnosis(pastPrescriptions[0].diagnosis_text ? { code: '', description: pastPrescriptions[0].diagnosis_text } : { code: '', description: '' });
        setAdvice(pastPrescriptions[0].general_advice || '');
        alert('Items loaded!');
    };

    // --- HANDLERS: MEDICATIONS ---
    const handleSearch = async (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        if (query.length < 3) return setSearchResults([]);
        try {
            const res = await fetch(`${VITE_API_URL}/inventory/search?q=${query}`, { headers: { 'Authorization': `Bearer ${authToken}` } });
            if (res.ok) setSearchResults(await res.json());
        } catch (e) { console.error(e); }
    };

    const addDrugToPrescription = (drug) => {
        setPrescriptions([...prescriptions, { ...drug, quantity: '', sig_instruction: '', duration: '', tempId: Date.now() }]);
        setSearchResults([]); setSearchQuery('');
    };

    const handlePrescriptionItemChange = (id, field, val) => {
        setPrescriptions(prescriptions.map(item => item.tempId === id ? { ...item, [field]: val } : item));
    };

    // --- HANDLERS: DIAGNOSIS & ADVICE ---
    const handleDiagnosisSearch = async (e) => {
        const query = e.target.value;
        setDiagnosisSearchQuery(query);
        setDiagnosis({ code: query, description: '' });
        if (query.length < 3) return setDiagnosisSearchResults([]);
        try {
            const res = await fetch(`${VITE_API_URL}/diagnoses/search?q=${query}`, { headers: { 'Authorization': `Bearer ${authToken}` } });
            if (res.ok) setDiagnosisSearchResults(await res.json());
        } catch (e) { console.error(e); }
    };

    const selectDiagnosis = (d) => {
        setDiagnosis({ code: d.code, description: d.description });
        setDiagnosisSearchQuery(''); setDiagnosisSearchResults([]);
    };

    const applyInstructionBlock = (content) => setAdvice(prev => (prev ? prev + '\n\n---\n\n' : '') + content);

    // --- HANDLERS: TEMPLATES (SIG & INSTRUCTION CRUD) ---
    // (Ideally, these handlers could also be moved to a custom hook 'useTemplates', but we keep here for now)
    const saveTemplate = async (type, item, editingItem, setList, list, closeModal) => {
        // Generic save function logic (simplified for brevity in this example)
        // You can copy the exact handleSaveTemplate logic from your previous code here
        // For now, I assume you keep the distinct handlers `handleSaveTemplate` and `handleSaveInstructionBlock`
    };
    
    // ... (Copy handleSaveTemplate, handleDeleteTemplate, handleSaveInstructionBlock, handleDeleteInstructionBlock from previous code) ...
    // ... Just ensure they update the state variables defined at the top of this file ...
    
    // Re-declaring logic for clarity in this view:
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

const applyTemplate = (tempId, instr) => handlePrescriptionItemChange(tempId, 'sig_instruction', instr);

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


    // --- SUBMISSION ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!prescriptions.length || !patient.name) { alert('Add patient and drugs.'); return; }
        
        const payload = {
            patient: { ...patient, id: patient.id },
            prescriptions: prescriptions.map(p => ({
                drug_id: p.drug_id, quantity: p.quantity, sig_instruction: p.sig_instruction,
                duration: p.duration, generic_name: p.generic_name, strength: p.strength, counseling_points: p.counseling_points
            })),
            diagnosis_text: diagnosis.description || diagnosis.code,
            general_advice: advice,
        };

        try {
            const res = await fetch(`${VITE_API_URL}/prescriptions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = 'prescription.pdf'; document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url);
                
                // Reset Form
                setPatient({ name: '', age: '', gender: 'Male', id: null });
                setPrescriptions([]);
                setDiagnosis({ code: '', description: '' });
                setAdvice('');
                setDiagnosisSearchQuery('');
            } else {
                alert('Error generating prescription');
            }
        } catch (e) { console.error(e); alert('Network error'); }
    };

    return (
        <div className="max-w-7xl mx-auto p-5 my-8">
            <h2 className="text-3xl font-bold mb-6 text-indigo-700 border-b pb-2">New Patient Encounter</h2>
            
            <PatientPanel 
                patient={patient} setPatient={setPatient}
                patientSearchQuery={patientSearchQuery} setPatientSearchQuery={setPatientSearchQuery}
                handlePatientSearch={handlePatientSearch} patientSearchResults={patientSearchResults}
                selectPatient={selectPatient} patientHistory={patientHistory} isHistoryLoading={isHistoryLoading}
                handleRePrescribe={handleRePrescribe} handlePatientChange={(e) => setPatient({...patient, [e.target.name]: e.target.value})}
            />

            <MedicationPanel 
                searchQuery={searchQuery} handleSearch={handleSearch} searchResults={searchResults} addDrugToPrescription={addDrugToPrescription}
                prescriptions={prescriptions} handlePrescriptionItemChange={handlePrescriptionItemChange} removePrescriptionItem={(id) => setPrescriptions(prescriptions.filter(p => p.tempId !== id))}
                interactionWarnings={interactionWarnings}
                sigTemplates={sigTemplates} applyTemplate={applyTemplate} 
                setIsSigModalOpen={setIsSigModalOpen} isSigModalOpen={isSigModalOpen}
                handleSaveTemplate={handleSaveTemplate} handleDeleteTemplate={handleDeleteTemplate}
                editingSigTemplate={editingSigTemplate} setEditingSigTemplate={setEditingSigTemplate}
                newTemplate={newTemplate} setNewTemplate={setNewTemplate}
            />

            <ClinicalNotesPanel 
                advice={advice} setAdvice={setAdvice}
                diagnosis={diagnosis} diagnosisSearchQuery={diagnosisSearchQuery} handleDiagnosisSearch={handleDiagnosisSearch}
                diagnosisSearchResults={diagnosisSearchResults} selectDiagnosis={selectDiagnosis}
                instructionBlocks={instructionBlocks} applyInstructionBlock={applyInstructionBlock}
                setIsInstructionModalOpen={setIsInstructionModalOpen} isInstructionModalOpen={isInstructionModalOpen}
                handleSaveInstructionBlock={handleSaveInstructionBlock} handleDeleteInstructionBlock={handleDeleteInstructionBlock}
                editingInstructionBlock={editingInstructionBlock} setEditingInstructionBlock={setEditingInstructionBlock}
                newInstructionBlock={newInstructionBlock} setNewInstructionBlock={setNewInstructionBlock}
            />

            <button onClick={handleSubmit} className="w-full py-3 text-xl font-semibold bg-green-600 hover:bg-green-700 text-white rounded-md shadow-lg transition-colors">
                Generate Prescription & Guide
            </button>
        </div>
    );
}

export default PrescriptionForm;