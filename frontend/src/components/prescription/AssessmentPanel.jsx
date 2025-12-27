import React, { useCallback } from 'react'; // Added useCallback
import ICD11Search from './ICD11Search';
import SmartTextarea from './SmartTextarea';

function AssessmentPanel({
    // State
    chiefComplaint, setChiefComplaint,
    history, setHistory,
    investigations, setInvestigations,
    exam, setExam,
    diagnosesList, 
    handleAddDiagnosis, 
    removeDiagnosis
}) {
    
    const handleExamChange = (e) => {
        setExam({ ...exam, [e.target.name]: e.target.value });
    };

    // Helper: Wrap the state setter to match the event signature expected by SmartTextarea
    // Using useCallback prevents unnecessary re-renders of the child components
    const handleCCChange = useCallback((e) => setChiefComplaint(e.target.value), [setChiefComplaint]);
    const handleHistoryChange = useCallback((e) => setHistory(e.target.value), [setHistory]);
    const handleIxChange = useCallback((e) => setInvestigations(e.target.value), [setInvestigations]);
    const handleExamOtherChange = useCallback((e) => setExam(prev => ({ ...prev, other: e.target.value })), [setExam]);

    return (
        <fieldset className="p-5 border border-gray-200 rounded-xl mb-6 bg-white shadow-sm animate-fade-in">
            <legend className="text-lg font-bold text-indigo-700 px-2">Clinical Assessment</legend>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                
                {/* LEFT COL: Subjective */}
                {/* We use z-indexes here to ensure top dropdowns cover bottom inputs if opened */}
                 <div className="flex flex-col gap-4">
                    <div className="relative z-30">
                        <SmartTextarea
                            id="chief-complaint"
                            name="chief-complaint"
                            label="Presenting Complaint (C/C)"
                            category="cc"
                            placeholder="e.g. Fever for 3 days..."
                            value={chiefComplaint}
                            onChange={handleCCChange}
                        />
                    </div>
                    
                    <div className="relative z-20">
                        <SmartTextarea
                            label="History"
                            category="history" // Matches DB category
                            placeholder="e.g. HTN, DM..."
                            value={history}
                            onChange={handleHistoryChange}
                        />
                    </div>

                    <div className="relative z-10">
                        <SmartTextarea
                            label="Investigations"
                            category="ix" // Matches DB category
                            placeholder="e.g. CBC, RBS..."
                            value={investigations}
                            onChange={handleIxChange}
                        />
                    </div>
                </div>

                {/* RIGHT COL: Objective (Vitals Only) */}
                <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 h-full">
                        <label className="block text-sm font-bold text-indigo-800 mb-3 border-b pb-1">Examination Findings (O/E)</label>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-gray-500 block">BP (mmHg)</label>
                                <input type="text" name="bp" value={exam.bp} onChange={handleExamChange} className="w-full p-1 border rounded bg-white" placeholder="120/80" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 block">Pulse (bpm)</label>
                                <input type="text" name="pulse" value={exam.pulse} onChange={handleExamChange} className="w-full p-1 border rounded bg-white" placeholder="72" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 block">Temp (°F)</label>
                                <input type="text" name="temp" value={exam.temp} onChange={handleExamChange} className="w-full p-1 border rounded bg-white" placeholder="98.6" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 block">Weight (kg)</label>
                                <input type="text" name="weight" value={exam.weight} onChange={handleExamChange} className="w-full p-1 border rounded bg-white" placeholder="65" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 block">SpO2 (%)</label>
                                <input type="text" name="spo2" value={exam.spo2} onChange={handleExamChange} className="w-full p-1 border rounded bg-white" placeholder="98" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 block">BMI</label>
                                <input type="text" name="bmi" value={exam.bmi} onChange={handleExamChange} className="w-full p-1 border rounded bg-white" placeholder="22.5" />
                            </div>
                        </div>
                        <div className="mt-3 relative z-10">
                            <SmartTextarea
                                label="Systemic Exam / Others"
                                category="exam"
                                placeholder="Chest: Clear, CVS: S1+S2..."
                                value={exam.other}
                                height="h-20"
                                onChange={handleExamOtherChange}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* --- BOTTOM SECTION: DIAGNOSIS --- */}
            <div className="border-t border-gray-200 pt-6">
                <div className="z-50"> 
                    <ICD11Search onSelect={handleAddDiagnosis} />
                </div>

                <div className="mt-4">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Selected Diagnoses:</label>
                    {diagnosesList.length === 0 ? (
                        <p className="text-sm text-gray-400 italic mt-1">No diagnosis selected yet.</p>
                    ) : (
                        <div className="flex flex-wrap gap-2 mt-2">
                            {diagnosesList.map((item, index) => (
                                <div key={index} className="flex items-center bg-blue-50 border border-blue-200 text-blue-800 px-3 py-2 rounded-md shadow-sm transition-all hover:bg-blue-100">
                                    <div className="flex flex-col leading-tight mr-3">
                                        <span className="font-semibold text-sm">{item.description}</span>
                                        <span className="text-[10px] text-blue-500 uppercase font-mono">{item.code}</span>
                                    </div>
                                    <button type="button" onClick={() => removeDiagnosis(item.code)} className="text-blue-400 hover:text-red-600 hover:bg-red-50 rounded-full p-1 transition-colors">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </fieldset>
    );
}

export default AssessmentPanel;