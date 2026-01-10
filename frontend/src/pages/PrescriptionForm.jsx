import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth'; 
import { useLocation, useNavigate } from 'react-router';

// Import Sub-Components
import PatientPanel from '../components/prescription/PatientPanel';
import MedicationPanel from '../components/prescription/MedicationPanel';
import ClinicalNotesPanel from '../components/prescription/ClinicalNotesPanel';
import AssessmentPanel from '../components/prescription/AssessmentPanel';
import PrintPreviewModal from '../components/prescription/PrintPreviewModal'; // <--- WAS MISSING IN YOUR SNIPPET

const VITE_API_URL = import.meta.env.VITE_API_URL;

function PrescriptionForm() {
    const { token: authToken } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    // --- MODE FLAGS ---
    const isAssistant = location.state?.isAssistant || false; 
    const isQueueMode = location.state?.queueMode || false;
    const isEditMode = location.state?.editMode || false;

    // --- TAB STATE ---
    const [activeTab, setActiveTab] = useState('patient'); 

    // --- PATIENT STATE ---
    const [patient, setPatient] = useState({ 
        name: '', gender: 'Male', id: null, dob: '', age: '', 
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
    const [exam, setExam] = useState({ bp: '', pulse: '', temp: '', weight: '', height: '', bmi: '', spo2: '', other: '' });

    // --- PRESCRIPTION STATE ---
    const [prescriptions, setPrescriptions] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [interactionWarnings, setInteractionWarnings] = useState([]); 

    // --- ADVICE & FOLLOW UP ---
    const [advice, setAdvice] = useState('');
    const [followUp, setFollowUp] = useState('');

    // --- APP STATES ---
    const [originalDate, setOriginalDate] = useState(null);
    const [linkedAppointmentId, setLinkedAppointmentId] = useState(null); 
    const [isReturningPatient, setIsReturningPatient] = useState(false);

    // --- TEMPLATE STATES ---
    const [sigTemplates, setSigTemplates] = useState([]);
    const [instructionBlocks, setInstructionBlocks] = useState([]); 
    const [isSigModalOpen, setIsSigModalOpen] = useState(false); 
    const [isInstructionModalOpen, setIsInstructionModalOpen] = useState(false); 
    const [editingSigTemplate, setEditingSigTemplate] = useState(null); 
    const [editingInstructionBlock, setEditingInstructionBlock] = useState(null); 
    const [newTemplate, setNewTemplate] = useState({ title: '', instruction: '' });
    const [newInstructionBlock, setNewInstructionBlock] = useState({ title: '', content: '' });

    // --- NEW: Preview Modal State ---
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [savedVisitData, setSavedVisitData] = useState(null);


    // --- 1. DATA FETCHING (TEMPLATES) ---
    useEffect(() => {
        if (!authToken || isAssistant) return;
        const fetchData = async () => {
            try {
                const [sigRes, instRes] = await Promise.all([
                    fetch(`${VITE_API_URL}/templates/sig`, { headers: { 'Authorization': `Bearer ${authToken}` } }),
                    fetch(`${VITE_API_URL}/templates/instruction`, { headers: { 'Authorization': `Bearer ${authToken}` } })
                ]);
                if (sigRes.ok) setSigTemplates(await sigRes.json());
                if (instRes.ok) setInstructionBlocks(await instRes.json());
            } catch (error) { console.error('Template fetch failed', error); }
        };
        fetchData();
    }, [authToken, VITE_API_URL, isAssistant]);


    // --- 2. HELPER FUNCTIONS ---
    
    // Parse Patient Object
    const populatePatient = (p) => {
        // Safe Age Parsing logic
        let years = '';
        let months = '';
        let days = '';
        
        if (p.age) {
            const yMatch = String(p.age).match(/(\d+)Y/);
            const mMatch = String(p.age).match(/(\d+)M/);
            const dMatch = String(p.age).match(/(\d+)D/);
            if (yMatch) years = yMatch[1];
            else if (!isNaN(parseInt(p.age))) years = parseInt(p.age);
            if (mMatch) months = mMatch[1];
            if (dMatch) days = dMatch[1];
        }

        return {
            name: p.patient_name || p.name, 
            gender: p.gender, 
            id: p.patient_id,
            dob: p.dob ? p.dob.split('T')[0] : '', 
            age: p.age || '', 
            ageYears: years, ageMonths: months, ageDays: days,
            mobile: p.mobile || '', email: p.email || '', address: p.address || '', referred_by: p.referred_by || ''
        };
    };

    const fetchHistoryForCheck = async (pid) => {
        try {
            const res = await fetch(`${VITE_API_URL}/patients/${pid}/history`, { headers: { 'Authorization': `Bearer ${authToken}` } });
            if (res.ok) {
                const h = await res.json();
                setIsReturningPatient(h.length > 0);
                setPatientHistory(h); 
            }
        } catch(e) {}
    };


    // --- 3. INITIALIZATION LOGIC ---
    useEffect(() => {
        if (location.state) {
            
            // CASE A: EDIT MODE (Doctor Only)
            if (isEditMode) {
                const { visitData, patientData } = location.state;
                setPatient(populatePatient(patientData));
                
                // Assessment Pre-fill
                setChiefComplaint(visitData.chief_complaint || '');
                setHistory(visitData.medical_history || '');
                setInvestigations(visitData.investigations || '');
                setAdvice(visitData.advice || '');
                setFollowUp(visitData.follow_up_date || '');
                
                // Parse Vitals
                if (visitData.examination_findings) {
                    try {
                        const parsed = typeof visitData.examination_findings === 'string' ? JSON.parse(visitData.examination_findings) : visitData.examination_findings;
                        setExam(prev => ({ ...prev, ...parsed }));
                    } catch (e) {}
                }
                
                // Parse Diagnosis List
                if (visitData.diagnosis) {
                    const lines = visitData.diagnosis.split('\n');
                    const parsedDiagnoses = lines.map(line => {
                        const match = line.match(/^\d+\.\s+(.+)\s+\((.+)\)$/);
                        if (match) return { description: match[1], code: match[2] };
                        return null;
                    }).filter(Boolean);
                    setDiagnosesList(parsedDiagnoses.length > 0 ? parsedDiagnoses : [{code:'', description: visitData.diagnosis}]);
                }

                // Prescriptions
                if (visitData.drugs) {
                    setPrescriptions(visitData.drugs.map(d => ({
                        generic_name: d.name, trade_names: d.brand, strength: d.strength,
                        sig_instruction: d.sig, duration: d.duration, quantity: d.quantity,
                        drug_id: d.drug_id, counseling_points: d.counseling_points || '',
                        tempId: Date.now() + Math.random()
                    })));
                }
                setOriginalDate(visitData.raw_date);
                if (patientData.patient_id) fetchHistoryForCheck(patientData.patient_id);
            }
            
            // CASE B: QUEUE MODE / PREP MODE (Doctor New or Assistant Prep)
            else if (isQueueMode && location.state.patientData) {
                const p = location.state.patientData;
                setLinkedAppointmentId(p.appointment_id); 
                setPatient(populatePatient(p));

                // Auto-fill from Assistant Prep
                if (p.prep_cc || p.prep_notes) {
                     setChiefComplaint(p.prep_cc || '');
                     setHistory(p.prep_notes || '');
                } else {
                     setChiefComplaint(p.reason || '');
                }

                if (p.prep_bp || p.prep_weight) {
                    setExam(prev => ({
                        ...prev,
                        bp: p.prep_bp || '', weight: p.prep_weight || '', 
                        pulse: p.prep_pulse || '', temp: p.prep_temp || ''
                    }));
                }

                // Reset Fields
                setPrescriptions([]); 
                setDiagnosesList([]); 
                setAdvice('');
                setOriginalDate(null);
                
                if (p.patient_id) fetchHistoryForCheck(p.patient_id);
            }
        }
    }, [location.state]);


    // --- 4. INTERACTION CHECKER ---
    useEffect(() => {
        if(isAssistant) return;
        const checkInteractions = async () => {
            if (!authToken || prescriptions.length < 2) return setInteractionWarnings([]);
            const drugIds = [...new Set(prescriptions.map(p => p.drug_id).filter(id => id))];
            if (drugIds.length < 2) return setInteractionWarnings([]);
            try {
                const res = await fetch(`${VITE_API_URL}/interactions/check`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                    body: JSON.stringify({ drugIds }),
                });
                if (response.ok) setInteractionWarnings(await response.json());
            } catch (e) {}
        };
        const timer = setTimeout(checkInteractions, 500); 
        return () => clearTimeout(timer); 
    }, [prescriptions, authToken, VITE_API_URL, isAssistant]);


    // --- HANDLERS ---
    
    // PATIENT
    const handlePatientChange = (e) => {
        const { name, value } = e.target;
        let upd = { ...patient, [name]: value };

        if (name === 'dob' && value) {
            const birthDate = new Date(value);
            const today = new Date();
            let y = today.getFullYear() - birthDate.getFullYear();
            let m = today.getMonth() - birthDate.getMonth();
            let d = today.getDate() - birthDate.getDate();
            if (d < 0) { m--; d += new Date(today.getFullYear(), today.getMonth(), 0).getDate(); }
            if (m < 0) { y--; m += 12; }
            upd.ageYears = y; upd.ageMonths = m; upd.ageDays = d; upd.age = y; 
        } 
        setPatient(upd);
    };

    const handlePatientSearch = async (e) => {
        const q = e.target.value;
        setPatientSearchQuery(q);
        if (q.length < 3) return setPatientSearchResults([]);
        try {
            const res = await fetch(`${VITE_API_URL}/patients/search-patient?q=${q}`, { headers: { 'Authorization': `Bearer ${authToken}` } });
            if (res.ok) setPatientSearchResults(await res.json());
        } catch (e) {}
    };

    const selectPatient = (p) => {
        // Use populate logic directly here for manual search
        const pObj = populatePatient(p);
        // manual mapping fallback if needed specifically for search result
        // pObj.ageYears = p.age; 
        setPatient(pObj);
        setPatientSearchQuery('');
        setPatientSearchResults([]);
        fetchHistoryForCheck(p.patient_id);
    };

    const handleRePrescribe = (past) => {
        if (!window.confirm(`Refill ${past.length} items?`)) return;
        const items = past.map(p => ({
            drug_id: p.drug_id, generic_name: p.generic_name, strength: p.strength, trade_names: p.trade_names,
            counseling_points: p.counseling_points || '', quantity: p.quantity, sig_instruction: p.sig, duration: p.duration,
            tempId: Date.now() + Math.random()
        }));
        const valid = items.filter(i => i.drug_id);
        if (valid.length < items.length) alert("Some items skipped (deleted from DB).");
        setPrescriptions(prev => [...prev, ...valid]);
    };

    // DIAGNOSIS
    const handleAddDiagnosis = useCallback((d) => setDiagnosesList(prev => prev.find(x => x.code === d.code) ? prev : [...prev, d]), []);
    const removeDiagnosis = (code) => setDiagnosesList(list => list.filter(d => d.code !== code));

    // MEDICINE
    const handleSearch = async (e) => {
        const q = e.target.value;
        setSearchQuery(q);
        if (q.length < 3) return setSearchResults([]);
        try {
            const res = await fetch(`${VITE_API_URL}/inventory/search?q=${q}`, { headers: { 'Authorization': `Bearer ${authToken}` } });
            if (res.ok) setSearchResults(await res.json());
        } catch (e) {}
    };
    const addDrugToPrescription = (drug) => {
        setPrescriptions([...prescriptions, { ...drug, trade_names: drug.trade_names||'', manufacturer: drug.manufacturer||'', quantity:'', sig_instruction:'', duration:'', tempId: Date.now() }]);
        setSearchResults([]); setSearchQuery('');
    };
    const handlePrescriptionItemChange = (id, f, v) => setPrescriptions(prescriptions.map(p => p.tempId===id ? {...p, [f]:v} : p));
    const applyTemplate = (id, instr) => handlePrescriptionItemChange(id, 'sig_instruction', instr);

    // TEMPLATES
    const handleSaveTemplate = async (e) => {
        e.preventDefault();
        try {
            const url = editingSigTemplate ? `${VITE_API_URL}/templates/sig/${editingSigTemplate.template_id}` : `${VITE_API_URL}/templates/sig`;
            const method = editingSigTemplate ? 'PUT' : 'POST';
            await fetch(url, { method, headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}`}, body: JSON.stringify(newTemplate) });
            alert('Saved'); setIsSigModalOpen(false); 
        } catch(e) { alert('Error'); }
    };
    const handleDeleteTemplate = async (id) => { 
        if(!confirm("Delete?")) return;
        await fetch(`${VITE_API_URL}/templates/sig/${id}`, { method:'DELETE', headers: { 'Authorization': `Bearer ${authToken}` }});
        // Ideally remove from state list here for optimism
    };

    const handleSaveInstructionBlock = async (e) => {
        e.preventDefault();
        try {
            const url = editingInstructionBlock ? `${VITE_API_URL}/templates/instruction/${editingInstructionBlock.block_id}` : `${VITE_API_URL}/templates/instruction`;
            const method = editingInstructionBlock ? 'PUT' : 'POST';
            await fetch(url, { method, headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}`}, body: JSON.stringify(newInstructionBlock) });
            alert('Saved'); setIsInstructionModalOpen(false);
        } catch(e) { alert('Error'); }
    };
    const handleDeleteInstructionBlock = async (id) => { 
        if(!confirm("Delete?")) return;
        await fetch(`${VITE_API_URL}/templates/instruction/${id}`, { method:'DELETE', headers: { 'Authorization': `Bearer ${authToken}` }});
    };
    
    const applyInstructionBlock = (content) => setAdvice(prev => (prev ? prev + '\n\n---\n\n' : '') + content);


    // --- SUBMISSION HANDLER ---
    const handleSubmit = async (e) => {
        e.preventDefault();

        // 1. Assistant Workflow
        if (isAssistant) {
            if (!linkedAppointmentId) return alert("Error: No appointment linked.");
            try {
                const res = await fetch(`${VITE_API_URL}/appointments/${linkedAppointmentId}/prep`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                    body: JSON.stringify({
                        bp: exam.bp, weight: exam.weight, pulse: exam.pulse, temp: exam.temp,
                        chief_complaint: chiefComplaint, notes: history
                    })
                });
                if(res.ok) { alert("Prep Saved!"); navigate('/assistant-dashboard'); }
            } catch(e) {}
            return;
        }

        // 2. Doctor Workflow
        if (!prescriptions.length || !patient.name) { return alert('Add data first'); }

        let ageStr = patient.age;
        if(patient.ageYears) ageStr = `${patient.ageYears}Y ${patient.ageMonths}M ${patient.ageDays}D`.trim();

        const diagStr = diagnosesList.map((d, i) => `${i+1}. ${d.description} (${d.code})`).join('\n');
        
        const payload = {
            original_date: originalDate,
            patient: { ...patient, id: patient.id, age: ageStr },
            prescriptions: prescriptions.filter(p => p.drug_id),
            chief_complaint: chiefComplaint, medical_history: history, examination_findings: exam, investigations,
            diagnosis_text: diagStr, general_advice: advice, follow_up_date: followUp
        };

        const url = originalDate ? `${VITE_API_URL}/prescriptions/update` : `${VITE_API_URL}/prescriptions`;
        const method = originalDate ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (res.ok) {
                // DO NOT DOWNLOAD HERE, OPEN PREVIEW
                setSavedVisitData({
                    patientId: payload.patient.id || data.patientId, // Ensure API returns IDs
                    visitDate: data.timestamp || payload.original_date || new Date().toISOString()
                });
                setOriginalDate(data.timestamp);
                setIsPreviewOpen(true); // Open the Modal
                
                // COMPLETE THE APPOINTMENT in Background
                if (linkedAppointmentId) {
                     fetch(`${VITE_API_URL}/appointments/${linkedAppointmentId}/status`, {
                        method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` }, body: JSON.stringify({ status: 'Completed' })
                    });
                }
            } else { alert('Error: ' + data.message); }
        } catch (e) { alert('Network error'); }
    };

    // Modal Handlers
    const handleClosePreview = () => {
        setIsPreviewOpen(false);
        navigate('/dashboard'); 
    };
    
    const handleContinueEditing = () => {
        setIsPreviewOpen(false);
        // Set update mode context if we just saved a NEW prescription
        // Logic to retrieve the new date/ID if it was a create action is handled in payload logic or simple re-save is update
        if (!originalDate && savedVisitData?.visitDate) {
            setOriginalDate(savedVisitData.visitDate); 
        }
    };


    // --- UI HELPERS ---
    const getTabClass = (name) => `flex-1 py-3 text-sm font-bold text-center border-b-4 transition-colors ${activeTab === name ? 'border-indigo-600 text-indigo-700 bg-indigo-50' : 'border-transparent text-gray-400 hover:text-gray-600'}`;

    return (
        <div className="max-w-5xl mx-auto p-4 my-8 bg-white rounded-xl shadow-xl min-h-[600px] flex flex-col">
            <div className="flex justify-between items-center mb-6 px-2 border-b pb-2">
                 <h2 className={`text-2xl font-extrabold ${isAssistant ? 'text-teal-700' : 'text-indigo-700'}`}>
                    {isAssistant ? "Prep Patient" : (originalDate ? "Edit Rx" : "New Rx")}
                 </h2>
                 {isReturningPatient && <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded font-bold">↻ History</span>}
            </div>
            
            {/* TABS */}
            <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
                <div onClick={() => setActiveTab('patient')} className={getTabClass('patient')}>1. Info</div>
                <div onClick={() => setActiveTab('assessment')} className={getTabClass('assessment')}>2. Assessment</div>
                {!isAssistant && <>
                    <div onClick={() => setActiveTab('medication')} className={getTabClass('medication')}>3. Meds</div>
                    <div onClick={() => setActiveTab('notes')} className={getTabClass('notes')}>4. Plan</div>
                </>}
            </div>

            {/* TAB RENDERING */}
            <div className="flex-1">
                 {activeTab === 'patient' && (
                     <div className="animate-fade-in">
                        <PatientPanel 
                            patient={patient} handlePatientChange={handlePatientChange}
                            patientSearchQuery={patientSearchQuery} handlePatientSearch={handlePatientSearch} patientSearchResults={patientSearchResults}
                            selectPatient={selectPatient} patientHistory={patientHistory} isHistoryLoading={isHistoryLoading} handleRePrescribe={handleRePrescribe}
                        />
                        <button onClick={() => setActiveTab('assessment')} className="float-right mt-4 bg-indigo-600 text-white px-6 py-2 rounded">Next &rarr;</button>
                     </div>
                 )}

                 {activeTab === 'assessment' && (
                    <div className="animate-fade-in">
                        <AssessmentPanel 
                            chiefComplaint={chiefComplaint} setChiefComplaint={setChiefComplaint}
                            history={history} setHistory={setHistory} investigations={investigations} setInvestigations={setInvestigations}
                            exam={exam} setExam={setExam}
                            diagnosesList={diagnosesList} handleAddDiagnosis={handleAddDiagnosis} removeDiagnosis={removeDiagnosis}
                        />
                         {isAssistant ? (
                             <button onClick={handleSubmit} className="float-right mt-4 bg-teal-600 text-white px-6 py-2 rounded font-bold shadow">Save & Finish</button>
                         ) : (
                             <button onClick={() => setActiveTab('medication')} className="float-right mt-4 bg-indigo-600 text-white px-6 py-2 rounded">Next &rarr;</button>
                         )}
                    </div>
                 )}

                 {!isAssistant && activeTab === 'medication' && (
                    <div className="animate-fade-in">
                        <MedicationPanel 
                             searchQuery={searchQuery} handleSearch={handleSearch} searchResults={searchResults} addDrugToPrescription={addDrugToPrescription}
                             prescriptions={prescriptions} handlePrescriptionItemChange={handlePrescriptionItemChange}
                             sigTemplates={sigTemplates} applyTemplate={applyTemplate} setIsSigModalOpen={setIsSigModalOpen} isSigModalOpen={isSigModalOpen} handleSaveTemplate={handleSaveTemplate} handleDeleteTemplate={handleDeleteTemplate} editingSigTemplate={editingSigTemplate} setEditingSigTemplate={setEditingSigTemplate} newTemplate={newTemplate} setNewTemplate={setNewTemplate}
                             interactionWarnings={interactionWarnings} removePrescriptionItem={(id) => setPrescriptions(prescriptions.filter(p => p.tempId !== id))}
                        />
                        <button onClick={() => setActiveTab('notes')} className="float-right mt-4 bg-indigo-600 text-white px-6 py-2 rounded">Next &rarr;</button>
                    </div>
                 )}

                 {!isAssistant && activeTab === 'notes' && (
                     <div className="animate-fade-in">
                        <ClinicalNotesPanel 
                            advice={advice} setAdvice={setAdvice}
                            instructionBlocks={instructionBlocks} applyInstructionBlock={applyInstructionBlock} setIsInstructionModalOpen={setIsInstructionModalOpen} isInstructionModalOpen={isInstructionModalOpen}
                            handleSaveInstructionBlock={handleSaveInstructionBlock} handleDeleteInstructionBlock={handleDeleteInstructionBlock}
                            editingInstructionBlock={editingInstructionBlock} setEditingInstructionBlock={setEditingInstructionBlock} newInstructionBlock={newInstructionBlock} setNewInstructionBlock={setNewInstructionBlock}
                            // AI PROPS
                            diagnosisList={diagnosesList}
                            prescriptions={prescriptions}
                            followUp={followUp} 
                            setFollowUp={setFollowUp} 
                        />
                        <button onClick={handleSubmit} className="float-right mt-6 bg-green-600 text-white font-bold px-8 py-3 rounded shadow-lg">{originalDate ? "Update" : "Generate"}</button>
                     </div>
                 )}
            </div>

            {/* PREVIEW MODAL */}
            <PrintPreviewModal 
                isOpen={isPreviewOpen} 
                onClose={handleClosePreview}
                patientId={savedVisitData?.patientId}
                visitDate={savedVisitData?.visitDate}
                onEdit={handleContinueEditing}
            />
        </div>
    );
}

export default PrescriptionForm;