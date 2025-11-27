import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth'; 

// Import Sub-Components
import PatientPanel from '../components/prescription/PatientPanel';
import MedicationPanel from '../components/prescription/MedicationPanel';
import ClinicalNotesPanel from '../components/prescription/ClinicalNotesPanel';
import AssessmentPanel from '../components/prescription/AssessmentPanel';

import ICD11Search from '../components/prescription/ICD11Search';

const VITE_API_URL = import.meta.env.VITE_API_URL;

function PrescriptionForm() {
    const { token: authToken } = useAuth();

    // --- 1. TAB STATE ---
    const [activeTab, setActiveTab] = useState('patient'); // Options: 'patient', 'medication', 'notes'

    // --- EXISTING STATES (Keep all your state variables here) ---
    // Patient
     const [patient, setPatient] = useState({ 
        name: '', 
        gender: 'Male', 
        id: null,
        dob: '', 
        ageYears: '', 
        ageMonths: '', 
        ageDays: '',
        mobile: '',
        email: '',
        address: '',
        referred_by: ''
    });
    const [patientSearchQuery, setPatientSearchQuery] = useState(''); 
    const [patientSearchResults, setPatientSearchResults] = useState([]); 
    const [patientHistory, setPatientHistory] = useState([]); 
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);

    // Prescription
    const [prescriptions, setPrescriptions] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [interactionWarnings, setInteractionWarnings] = useState([]); 

    // Notes
     const [diagnosesList, setDiagnosesList] = useState([]); 

    const [diagnosis, setDiagnosis] = useState({ code: '', description: '' });
    const [diagnosisSearchQuery, setDiagnosisSearchQuery] = useState('');
    const [diagnosisSearchResults, setDiagnosisSearchResults] = useState([]);
    const [advice, setAdvice] = useState('');

    // Templates & Modals
    const [sigTemplates, setSigTemplates] = useState([]);
    const [instructionBlocks, setInstructionBlocks] = useState([]); 
    const [isSigModalOpen, setIsSigModalOpen] = useState(false); 
    const [isInstructionModalOpen, setIsInstructionModalOpen] = useState(false); 
    const [editingSigTemplate, setEditingSigTemplate] = useState(null); 
    const [editingInstructionBlock, setEditingInstructionBlock] = useState(null); 
    const [newTemplate, setNewTemplate] = useState({ title: '', instruction: '' });
    const [newInstructionBlock, setNewInstructionBlock] = useState({ title: '', content: '' });
     // 1. NEW STATES
    const [chiefComplaint, setChiefComplaint] = useState('');
    const [history, setHistory] = useState(''); // Medical/Treatment history merged for UI, can split if needed
    const [investigations, setInvestigations] = useState('');
    const [followUp, setFollowUp] = useState('');
    
    // Exam State (JSON Object)
    const [exam, setExam] = useState({
        bp: '', pulse: '', temp: '', weight: '', height: '', bmi: '', spo2: '', other: ''
    });

    // --- DATA FETCHING EFFECTS (Keep existing useEffects) ---
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
            } catch (error) { console.error('Initial fetch failed:', error); }
        };
        fetchData();
    }, [authToken, VITE_API_URL]);

    // --- INTERACTION CHECKER (Keep existing useEffect) ---
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


    // --- NEW HANDLER: Add Diagnosis from WHO Tool ---
    const handleAddDiagnosis = (newDiagnosis) => {
        // Prevent duplicates (optional check)
        const exists = diagnosesList.find(d => d.code === newDiagnosis.code);
        if (!exists) {
            setDiagnosesList([...diagnosesList, newDiagnosis]);
        }
    };

    // --- NEW HANDLER: Remove Diagnosis ---
    const removeDiagnosis = (codeToRemove) => {
        setDiagnosesList(diagnosesList.filter(d => d.code !== codeToRemove));
    };


    // 2. Create a Smart Change Handler for Patient Data
    const handlePatientChange = (e) => {
        const { name, value } = e.target;
        
        // Create a copy of the state
        let updatedPatient = { ...patient, [name]: value };

        // LOGIC: Auto-calculate DOB or Age
        if (name === 'dob' && value) {
            // If DOB changes -> Calculate Age (Y, M, D)
            const birthDate = new Date(value);
            const today = new Date();
            
            let years = today.getFullYear() - birthDate.getFullYear();
            let months = today.getMonth() - birthDate.getMonth();
            let days = today.getDate() - birthDate.getDate();

            if (days < 0) {
                months--;
                days += new Date(today.getFullYear(), today.getMonth(), 0).getDate();
            }
            if (months < 0) {
                years--;
                months += 12;
            }
            
            updatedPatient.ageYears = years;
            updatedPatient.ageMonths = months;
            updatedPatient.ageDays = days;
            updatedPatient.age = years; // Legacy simple age
        } 
        else if (['ageYears', 'ageMonths', 'ageDays'].includes(name)) {
            // If manual Age changes -> Calculate approximate DOB
            const y = parseInt(updatedPatient.ageYears) || 0;
            const m = parseInt(updatedPatient.ageMonths) || 0;
            const d = parseInt(updatedPatient.ageDays) || 0;

            if (y > 0 || m > 0 || d > 0) {
                const date = new Date();
                date.setFullYear(date.getFullYear() - y);
                date.setMonth(date.getMonth() - m);
                date.setDate(date.getDate() - d);
                updatedPatient.dob = date.toISOString().split('T')[0]; // YYYY-MM-DD
                updatedPatient.age = y;
            }
        }

        setPatient(updatedPatient);
    };


    // --- HANDLERS (Keep all your existing handlers) ---
    // Note: Ensure you have copy-pasted all the handlers (handlePatientSearch, selectPatient, handleRePrescribe, handleSearch, addDrugToPrescription, etc.) 
    // from your previous code into here. 
    // For brevity, I am assuming they are present.
    
    /* ... PASTE ALL YOUR HANDLERS HERE ... */
    // (handlePatientSearch, selectPatient, handleRePrescribe, handleSearch, addDrugToPrescription, 
    // handlePrescriptionItemChange, handleDiagnosisSearch, selectDiagnosis, applyInstructionBlock, 
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
        let ageDetails = { ageYears: p.age, ageMonths: 0, ageDays: 0 };
        if (p.dob) {
            const birthDate = new Date(p.dob);
            const today = new Date();
            // ... (Run the same calculation logic as above, or extract to a helper function) ...
            // For simplicity here, we just set the DOB and let the user see the date
        }
        setPatient({ 
            name: p.name, 
            gender: p.gender, 
            id: p.patient_id,
            dob: p.dob ? p.dob.split('T')[0] : '', // Format YYYY-MM-DD
            ageYears: p.age, // Fallback to stored int
            ageMonths: '', 
            ageDays: '',
            mobile: p.mobile || '',
            email: p.email || '',
            address: p.address || '',
            referred_by: p.referred_by || ''
        });
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

    // handleSaveTemplate, handleDeleteTemplate, handleSaveInstructionBlock, handleDeleteInstructionBlock, applyTemplate)
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



    
    // --- SUBMISSION HANDLER ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!prescriptions.length || !patient.name) { 
            alert('Please complete the patient details and add medications.'); 
            setActiveTab('patient'); // Jump to patient tab if missing
            return; 
        }

        // --- Age Formatting Logic ---
        let formattedAge = patient.age || ''; 
        
        // If we have specific components, build the string
        if (patient.ageYears || patient.ageMonths || patient.ageDays) {
            const y = patient.ageYears ? `${patient.ageYears}Y ` : '';
            const m = patient.ageMonths ? `${patient.ageMonths}M ` : '';
            const d = patient.ageDays ? `${patient.ageDays}D` : '';
            formattedAge = (y + m + d).trim();
        } else if (patient.dob) {
            // Fallback: If we have DOB but state wasn't updated manually
            // (Optional calculation just to be safe)
            const birthDate = new Date(patient.dob);
            const today = new Date();
            let years = today.getFullYear() - birthDate.getFullYear();
            if (today.getMonth() < birthDate.getMonth() || (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) {
                years--;
            }
            if (!formattedAge) formattedAge = `${years}Y`;
        }
        
        const payload = {
            patient: { 
                ...patient, 
                id: patient.id,
                age: formattedAge
            },
            prescriptions: prescriptions.map(p => ({
                drug_id: p.drug_id, 
                quantity: p.quantity, 
                sig_instruction: p.sig_instruction,
                duration: p.duration, 
                generic_name: p.generic_name, 
                strength: p.strength, 
                counseling_points: p.counseling_points
            })),
            chief_complaint: chiefComplaint,
            medical_history: history,
            examination_findings: exam, // Object
            investigations: investigations,
            diagnosis_text: formattedDiagnosisString,
            general_advice: advice,
            follow_up_date: followUp
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
                setPatient({ 
                    name: '', gender: 'Male', id: null, dob: '', 
                    ageYears: '', ageMonths: '', ageDays: '', mobile: '', email: '', address: '', referred_by: ''
                });
                setPrescriptions([]);
                setDiagnosis({ code: '', description: '' });
                setAdvice('');
                setDiagnosisSearchQuery('');
                setChiefComplaint('');
                setHistory('');
                setInvestigations('');
                setFollowUp('');
                setExam({ bp: '', pulse: '', temp: '', weight: '', height: '', bmi: '', spo2: '', other: '' });
            } else {
                alert('Error generating prescription');
            }
        } catch (e) { console.error(e); alert('Network error'); }
        // ... When resetting form, also reset tab:
        // setActiveTab('patient');
    };

    // --- HELPER: TAB CLASS ---
    const getTabClass = (tabName) => {
        const baseClass = "flex-1 py-3 text-sm font-medium text-center cursor-pointer transition-colors border-b-2";
        const activeClass = "border-indigo-600 text-indigo-600 bg-indigo-50";
        const inactiveClass = "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300";
        return `${baseClass} ${activeTab === tabName ? activeClass : inactiveClass}`;
    };

    return (
        <div className="max-w-5xl mx-auto p-4 my-8 bg-white rounded-xl shadow-xl min-h-[600px] flex flex-col">
            <h2 className="text-2xl font-bold text-indigo-700 mb-4 px-2">New Prescription</h2>
            
            {/* --- TAB NAVIGATION BAR --- */}
            <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
                <div onClick={() => setActiveTab('patient')} className={getTabClass('patient')}>1. Patient</div>
                <div onClick={() => setActiveTab('assessment')} className={getTabClass('assessment')}>2. Assessment</div>
                <div onClick={() => setActiveTab('medication')} className={getTabClass('medication')}>3. Medicine</div>
                <div onClick={() => setActiveTab('notes')} className={getTabClass('notes')}>4. Advice</div>
            </div>

            {/* --- TAB CONTENT AREA --- */}
            <div className="flex-1">
                {/* TAB 1: PATIENT */}
                {activeTab === 'patient' && (
                    <div className="animate-fade-in">
                        <PatientPanel 
                            patient={patient} setPatient={setPatient}
                            patientSearchQuery={patientSearchQuery} setPatientSearchQuery={setPatientSearchQuery}
                            handlePatientSearch={handlePatientSearch} patientSearchResults={patientSearchResults}
                            selectPatient={selectPatient} patientHistory={patientHistory} isHistoryLoading={isHistoryLoading}
                            handleRePrescribe={handleRePrescribe} handlePatientChange={(e) => setPatient({...patient, [e.target.name]: e.target.value})}
                        />
                        <div className="flex justify-end mt-4">
                            <button onClick={() => setActiveTab('assessment')} className="bg-indigo-600 text-white px-6 py-2 rounded-md">
                                Next: Assessment &rarr;
                            </button>
                        </div>
                    </div>
                )}

                {/* TAB 2: ASSESSMENT (NEW) */}
                {activeTab === 'assessment' && (
                    <div className="animate-fade-in">
                        <AssessmentPanel 
                            chiefComplaint={chiefComplaint} setChiefComplaint={setChiefComplaint}
                            history={history} setHistory={setHistory}
                            investigations={investigations} setInvestigations={setInvestigations}
                            exam={exam} setExam={setExam}
                            // diagnosis={diagnosis} diagnosisSearchQuery={diagnosisSearchQuery}
                            // handleDiagnosisSearch={handleDiagnosisSearch} diagnosisSearchResults={diagnosisSearchResults}
                            // selectDiagnosis={selectDiagnosis}
                            diagnosesList={diagnosesList} 
                            handleAddDiagnosis={handleAddDiagnosis}
                            removeDiagnosis={removeDiagnosis}
                        />
                        <div className="flex justify-between mt-4">
                            <button onClick={() => setActiveTab('patient')} className="text-gray-600 px-4 py-2">&larr; Back</button>
                            <button onClick={() => setActiveTab('medication')} className="bg-indigo-600 text-white px-6 py-2 rounded-md">Next: Medicines &rarr;</button>
                        </div>
                    </div>
                )}

                {/* TAB 3: MEDICATIONS */}
                {activeTab === 'medication' && (
                    <div className="animate-fade-in">
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
                        <div className="flex justify-between mt-4">
                            <button onClick={() => setActiveTab('assessment')} className="text-gray-600 px-4 py-2">&larr; Back</button>
                            <button onClick={() => setActiveTab('notes')} className="bg-indigo-600 text-white px-6 py-2 rounded-md">Next: Advice &rarr;</button>
                        </div>
                    </div>
                )}

                {/* TAB 4: NOTES & DIAGNOSIS */}
                {activeTab === 'notes' && (
                    <div className="animate-fade-in">
                        <ClinicalNotesPanel 
                            advice={advice} setAdvice={setAdvice}
                            instructionBlocks={instructionBlocks} applyInstructionBlock={applyInstructionBlock}
                            setIsInstructionModalOpen={setIsInstructionModalOpen} isInstructionModalOpen={isInstructionModalOpen}
                            handleSaveInstructionBlock={handleSaveInstructionBlock} handleDeleteInstructionBlock={handleDeleteInstructionBlock}
                            editingInstructionBlock={editingInstructionBlock} setEditingInstructionBlock={setEditingInstructionBlock}
                            newInstructionBlock={newInstructionBlock} setNewInstructionBlock={setNewInstructionBlock}
                        />

                        <div className="mt-4 bg-white p-4 rounded border border-gray-300">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Follow-up Instructions</label>
                            <input 
                                className="w-full p-2 border border-gray-300 rounded-md" 
                                type="text" placeholder="e.g. After 7 days / When needed" 
                                value={followUp} onChange={(e) => setFollowUp(e.target.value)} 
                            />
                        </div>
                        
                        <div className="flex justify-between mt-6 pt-4">
                            <button onClick={() => setActiveTab('medication')} className="text-gray-600 px-4 py-2">&larr; Back</button>
                            <button onClick={handleSubmit} className="bg-green-600 text-white font-bold text-lg px-8 py-3 rounded-md shadow-lg">
                                Generate Prescription
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default PrescriptionForm;