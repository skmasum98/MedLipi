import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth'; 
import { useLocation, useNavigate } from 'react-router';

// Import Sub-Components
import PatientPanel from '../components/prescription/PatientPanel';
import MedicationPanel from '../components/prescription/MedicationPanel';
import ClinicalNotesPanel from '../components/prescription/ClinicalNotesPanel';
import AssessmentPanel from '../components/prescription/AssessmentPanel';

const VITE_API_URL = import.meta.env.VITE_API_URL;

function PrescriptionForm() {
    const { token: authToken } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    // --- 1. TAB STATE ---
    const [activeTab, setActiveTab] = useState('patient'); 

    // --- PATIENT STATE ---
     const [patient, setPatient] = useState({ 
        name: '', gender: 'Male', id: null, dob: '', 
        ageYears: '', ageMonths: '', ageDays: '',
        mobile: '', email: '', address: '', referred_by: ''
    });
    const [patientSearchQuery, setPatientSearchQuery] = useState(''); 
    const [patientSearchResults, setPatientSearchResults] = useState([]); 
    const [patientHistory, setPatientHistory] = useState([]); 
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);

    // --- ASSESSMENT STATE ---
    const [chiefComplaint, setChiefComplaint] = useState('');
    const [history, setHistory] = useState(''); 
    const [investigations, setInvestigations] = useState('');
    const [diagnosesList, setDiagnosesList] = useState([]); 
    const [exam, setExam] = useState({
        bp: '', pulse: '', temp: '', weight: '', height: '', bmi: '', spo2: '', other: ''
    });

    // --- PRESCRIPTION STATE ---
    const [prescriptions, setPrescriptions] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [interactionWarnings, setInteractionWarnings] = useState([]); 

    // --- ADVICE & FOLLOW UP ---
    const [advice, setAdvice] = useState('');
    const [followUp, setFollowUp] = useState('');

    // --- EDIT MODE STATE ---
    const [originalDate, setOriginalDate] = useState(null);

    // --- TEMPLATES & MODAL STATES ---
    const [sigTemplates, setSigTemplates] = useState([]);
    const [instructionBlocks, setInstructionBlocks] = useState([]); 
    const [isSigModalOpen, setIsSigModalOpen] = useState(false); 
    const [isInstructionModalOpen, setIsInstructionModalOpen] = useState(false); 
    const [editingSigTemplate, setEditingSigTemplate] = useState(null); 
    const [editingInstructionBlock, setEditingInstructionBlock] = useState(null); 
    const [newTemplate, setNewTemplate] = useState({ title: '', instruction: '' });
    const [newInstructionBlock, setNewInstructionBlock] = useState({ title: '', content: '' });


    // --- 1. DATA FETCHING ---
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

    // --- 2. EDIT MODE INITIALIZATION ---
    useEffect(() => {
        if (location.state && location.state.editMode) {
            const { visitData, patientData } = location.state;
            
            // A. Populate Patient
            setPatient({
                name: patientData.name,
                gender: patientData.gender,
                id: patientData.patient_id,
                age: patientData.age,
                dob: patientData.dob || '',
                ageYears: '', ageMonths: '', ageDays: '',
                mobile: patientData.mobile || '',
                email: patientData.email || '',
                address: patientData.address || '',
                referred_by: patientData.referred_by || ''
            });

            // B. Populate Assessment
            setChiefComplaint(visitData.chief_complaint || '');
            setHistory(visitData.medical_history || '');
            setInvestigations(visitData.investigations || '');
            setAdvice(visitData.advice || '');
            setFollowUp(visitData.follow_up_date || '');
            
            // C. Populate Exam
            if (visitData.examination_findings) {
                try {
                    const parsedExam = typeof visitData.examination_findings === 'string' 
                        ? JSON.parse(visitData.examination_findings) 
                        : visitData.examination_findings;
                    setExam({ ...exam, ...parsedExam });
                } catch (e) { console.error("Error parsing exam data", e); }
            }

            // D. Populate Diagnosis
            if (visitData.diagnosis) {
                const lines = visitData.diagnosis.split('\n');
                const parsedDiagnoses = lines.map(line => {
                    // Extract "Description (Code)"
                    const match = line.match(/^\d+\.\s+(.+)\s+\((.+)\)$/);
                    if (match) return { description: match[1], code: match[2] };
                    return null;
                }).filter(Boolean);
                
                // If regex fails (e.g. manual entry), fallback to simple object
                if (parsedDiagnoses.length === 0 && visitData.diagnosis) {
                     setDiagnosesList([{ code: '', description: visitData.diagnosis }]);
                } else {
                     setDiagnosesList(parsedDiagnoses);
                }
            }

            // E. Populate Prescriptions
            if (visitData.drugs) {
                const editPrescriptions = visitData.drugs.map(d => ({
                    generic_name: d.name,
                    trade_names: d.brand,
                    strength: d.strength,
                    sig_instruction: d.sig,
                    duration: d.duration,
                    quantity: d.quantity,
                    drug_id: d.drug_id,
                    counseling_points: d.counseling_points || '',
                    tempId: Date.now() + Math.random()
                }));
                setPrescriptions(editPrescriptions);
            }

            // F. Set Metadata
            setOriginalDate(visitData.raw_date);
        }
    }, [location.state]);


    // --- 3. INTERACTION CHECKER ---
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


    // --- HANDLERS: DIAGNOSIS (ICD-11) ---
    const handleAddDiagnosis = useCallback((newDiagnosis) => {
        setDiagnosesList(prevList => {
            const exists = prevList.find(d => d.code === newDiagnosis.code);
            if (!exists) {
                return [...prevList, newDiagnosis];
            }
            return prevList;
        });
    }, []);

    const removeDiagnosis = (codeToRemove) => {
        setDiagnosesList(diagnosesList.filter(d => d.code !== codeToRemove));
    };


    // --- HANDLERS: PATIENT ---
    const handlePatientChange = (e) => {
        const { name, value } = e.target;
        let updatedPatient = { ...patient, [name]: value };

        if (name === 'dob' && value) {
            const birthDate = new Date(value);
            const today = new Date();
            let years = today.getFullYear() - birthDate.getFullYear();
            let months = today.getMonth() - birthDate.getMonth();
            let days = today.getDate() - birthDate.getDate();
            if (days < 0) { months--; days += new Date(today.getFullYear(), today.getMonth(), 0).getDate(); }
            if (months < 0) { years--; months += 12; }
            updatedPatient.ageYears = years; updatedPatient.ageMonths = months; updatedPatient.ageDays = days;
            updatedPatient.age = years; 
        } 
        else if (['ageYears', 'ageMonths', 'ageDays'].includes(name)) {
            const y = parseInt(updatedPatient.ageYears) || 0;
            const m = parseInt(updatedPatient.ageMonths) || 0;
            const d = parseInt(updatedPatient.ageDays) || 0;
            if (y > 0 || m > 0 || d > 0) {
                const date = new Date();
                date.setFullYear(date.getFullYear() - y);
                date.setMonth(date.getMonth() - m);
                date.setDate(date.getDate() - d);
                updatedPatient.dob = date.toISOString().split('T')[0]; 
                updatedPatient.age = y;
            }
        }
        setPatient(updatedPatient);
    };

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
        setPatient({ 
            name: p.name, gender: p.gender, id: p.patient_id,
            dob: p.dob ? p.dob.split('T')[0] : '', 
            ageYears: p.age, ageMonths: '', ageDays: '',
            mobile: p.mobile || '', email: p.email || '', address: p.address || '', referred_by: p.referred_by || ''
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
        
        // Filter valid drugs
        const validItems = newItems.filter(item => item.drug_id);
        
        setPrescriptions(prev => [...prev, ...validItems]);
        setAdvice(pastPrescriptions[0].general_advice || '');
        alert('Items loaded!');
    };

    // --- HANDLERS: MEDICINE ---
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
        setPrescriptions([...prescriptions, { ...drug, 
            trade_names: drug.trade_names || '',
            manufacturer: drug.manufacturer || '',
            quantity: '', sig_instruction: '', duration: '', tempId: Date.now() 
        }]);
        setSearchResults([]); setSearchQuery('');
    };

    const handlePrescriptionItemChange = (id, field, val) => {
        setPrescriptions(prescriptions.map(item => item.tempId === id ? { ...item, [field]: val } : item));
    };

    const applyInstructionBlock = (content) => setAdvice(prev => (prev ? prev + '\n\n---\n\n' : '') + content);

    // --- HANDLERS: TEMPLATE CRUD ---
    const genericSaveTemplate = async (url, payload, setList, list, editingIdKey, editingItem, setEditingItem, closeModal, typeName) => {
        if (!payload.title || (!payload.instruction && !payload.content)) { alert('Fields required'); return; }
        const id = editingItem?.[editingIdKey];
        const isEditing = !!id && typeof id === 'number';
        const finalUrl = isEditing ? `${url}/${id}` : url;
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const res = await fetch(finalUrl, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                const data = await res.json();
                const newItem = { ...payload, [editingIdKey]: isEditing ? id : data[editingIdKey === 'template_id' ? 'templateId' : 'blockId'] };
                const updatedList = isEditing ? list.map(i => i[editingIdKey] === id ? newItem : i) : [...list, newItem];
                setList(updatedList);
                setEditingItem(null);
                closeModal(false);
                alert(`${typeName} Saved!`);
            } else { alert('Error saving.'); }
        } catch (e) { alert('Network error'); }
    };

    const genericDeleteTemplate = async (url, id, setList, list, idKey) => {
        if (!window.confirm("Delete?")) return;
        try {
            const res = await fetch(`${url}/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${authToken}` } });
            if (res.ok) setList(list.filter(i => i[idKey] !== id));
        } catch (e) { console.error(e); }
    };

    const handleSaveTemplate = (e) => { e.preventDefault(); genericSaveTemplate(`${VITE_API_URL}/templates/sig`, newTemplate, setSigTemplates, sigTemplates, 'template_id', editingSigTemplate, setEditingSigTemplate, setIsSigModalOpen, 'SIG'); setNewTemplate({title:'', instruction:''}); };
    const handleDeleteTemplate = (id) => genericDeleteTemplate(`${VITE_API_URL}/templates/sig`, id, setSigTemplates, sigTemplates, 'template_id');
    const handleSaveInstructionBlock = (e) => { e.preventDefault(); genericSaveTemplate(`${VITE_API_URL}/templates/instruction`, newInstructionBlock, setInstructionBlocks, instructionBlocks, 'block_id', editingInstructionBlock, setEditingInstructionBlock, setIsInstructionModalOpen, 'Block'); setNewInstructionBlock({title:'', content:''}); };
    const handleDeleteInstructionBlock = (id) => genericDeleteTemplate(`${VITE_API_URL}/templates/instruction`, id, setInstructionBlocks, instructionBlocks, 'block_id');
    
    const applyTemplate = (tempId, instr) => handlePrescriptionItemChange(tempId, 'sig_instruction', instr);


    // --- SUBMISSION HANDLER ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!prescriptions.length || !patient.name) { 
            alert('Please complete the patient details and add medications.'); 
            setActiveTab('patient'); return; 
        }

        // 1. Filter out invalid drugs
        const validPrescriptions = prescriptions.filter(p => p.drug_id);
        
        if (!validPrescriptions.length && prescriptions.length > 0) {
             alert('Error: Selected drugs have invalid IDs. Please remove and re-add them from search.');
             return;
        }

        // Age String
        let formattedAge = patient.age || ''; 
        if (patient.ageYears || patient.ageMonths || patient.ageDays) {
            const y = patient.ageYears ? `${patient.ageYears}Y ` : '';
            const m = patient.ageMonths ? `${patient.ageMonths}M ` : '';
            const d = patient.ageDays ? `${patient.ageDays}D` : '';
            formattedAge = (y + m + d).trim();
        }

        // Diagnosis String (From Array)
        const formattedDiagnosisString = diagnosesList.map((d, index) => 
            `${index + 1}. ${d.description} (${d.code})`
        ).join('\n');
        
        const payload = {
            original_date: originalDate, 
            patient: { ...patient, id: patient.id, age: formattedAge },
            prescriptions: validPrescriptions.map(p => ({
                drug_id: p.drug_id, 
                quantity: p.quantity, 
                sig_instruction: p.sig_instruction,
                duration: p.duration, 
                generic_name: p.generic_name, 
                strength: p.strength, 
                trade_names: p.trade_names,
                manufacturer: p.manufacturer,
                counseling_points: p.counseling_points 
            })),
            chief_complaint: chiefComplaint,
            medical_history: history,
            examination_findings: exam, 
            investigations: investigations,
            diagnosis_text: formattedDiagnosisString, 
            general_advice: advice,
            follow_up_date: followUp
        };

        const url = originalDate 
            ? `${VITE_API_URL}/prescriptions/update` 
            : `${VITE_API_URL}/prescriptions`;
        
        const method = originalDate ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = 'prescription.pdf'; document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url);
                
                alert(originalDate ? 'Updated & Printed!' : 'Created & Printed!');

                // Redirect to Patient Record to view updated history
                if (patient.id) {
                    navigate(`/patients/${patient.id}`);
                } else {
                    // Fallback reset
                    setPatient({ name: '', gender: 'Male', id: null, dob: '', ageYears: '', ageMonths: '', ageDays: '', mobile: '', email: '', address: '', referred_by: '' });
                    setPrescriptions([]);
                    setDiagnosesList([]);
                    setAdvice(''); setChiefComplaint(''); setHistory(''); setInvestigations(''); setFollowUp('');
                    setExam({ bp: '', pulse: '', temp: '', weight: '', height: '', bmi: '', spo2: '', other: '' });
                    setOriginalDate(null);
                }
            } else {
                alert('Error generating prescription');
            }
        } catch (e) { console.error(e); alert('Network error'); }
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
            <div className="flex justify-between items-center mb-6 px-2 border-b pb-2">
                <h2 className="text-2xl font-bold text-indigo-700">
                    {originalDate ? "Edit Prescription" : "New Prescription"}
                </h2>
                {originalDate && (
                    <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-semibold">
                        Editing Mode
                    </span>
                )}
            </div>
            
            {/* TABS */}
            <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
                <div onClick={() => setActiveTab('patient')} className={getTabClass('patient')}>1. Patient</div>
                <div onClick={() => setActiveTab('assessment')} className={getTabClass('assessment')}>2. Assessment</div>
                <div onClick={() => setActiveTab('medication')} className={getTabClass('medication')}>3. Medicine</div>
                <div onClick={() => setActiveTab('notes')} className={getTabClass('notes')}>4. Advice</div>
            </div>

            {/* TAB CONTENT */}
            <div className="flex-1">
                {activeTab === 'patient' && (
                    <div className="animate-fade-in">
                        <PatientPanel 
                            patient={patient} setPatient={setPatient}
                            patientSearchQuery={patientSearchQuery} setPatientSearchQuery={setPatientSearchQuery}
                            handlePatientSearch={handlePatientSearch} patientSearchResults={patientSearchResults}
                            selectPatient={selectPatient} patientHistory={patientHistory} isHistoryLoading={isHistoryLoading}
                            handleRePrescribe={handleRePrescribe} handlePatientChange={handlePatientChange}
                        />
                        <div className="flex justify-end mt-4">
                            <button onClick={() => setActiveTab('assessment')} className="bg-indigo-600 text-white px-6 py-2 rounded-md">Next: Assessment &rarr;</button>
                        </div>
                    </div>
                )}

                {activeTab === 'assessment' && (
                    <div className="animate-fade-in">
                        <AssessmentPanel 
                            chiefComplaint={chiefComplaint} setChiefComplaint={setChiefComplaint}
                            history={history} setHistory={setHistory}
                            investigations={investigations} setInvestigations={setInvestigations}
                            exam={exam} setExam={setExam}
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

                        <div className="mt-4 bg-white p-4 rounded border border-gray-300 shadow-sm">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Follow-up Instructions</label>
                            <input 
                                className="w-full p-2 border border-gray-300 rounded-md" 
                                type="text" placeholder="e.g. After 7 days / When needed" 
                                value={followUp} onChange={(e) => setFollowUp(e.target.value)} 
                            />
                        </div>
                        
                        <div className="flex justify-between mt-6 pt-4">
                            <button onClick={() => setActiveTab('medication')} className="text-gray-600 px-4 py-2">&larr; Back</button>
                            <button onClick={handleSubmit} className="bg-green-600 text-white font-bold text-lg px-8 py-3 rounded-md shadow-lg hover:bg-green-700 transition">
                                {originalDate ? "Update & Print" : "Generate Prescription"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default PrescriptionForm;