import React from 'react';
import ICD11Search from './ICD11Search';

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

    return (
        <fieldset className="p-5 border border-gray-200 rounded-xl mb-6 bg-white shadow-sm animate-fade-in">
            <legend className="text-lg font-bold text-indigo-700 px-2">Clinical Assessment</legend>

            {/* --- TOP SECTION: 2 COLUMNS (Inputs & Vitals) --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                
                {/* LEFT COL: Subjective */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Presenting Complaint (C/C)</label>
                        <textarea 
                            className="w-full p-2 border border-gray-300 rounded-md h-20 focus:ring-indigo-500"
                            placeholder="e.g. Fever for 3 days..."
                            value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)}
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">History</label>
                        <textarea 
                            className="w-full p-2 border border-gray-300 rounded-md h-20 focus:ring-indigo-500"
                            placeholder="e.g. HTN, DM..."
                            value={history} onChange={(e) => setHistory(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Investigations</label>
                        <textarea 
                            className="w-full p-2 border border-gray-300 rounded-md h-20 focus:ring-indigo-500"
                            placeholder="e.g. CBC, RBS..."
                            value={investigations} onChange={(e) => setInvestigations(e.target.value)}
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
                        <div className="mt-3">
                            <label className="text-xs text-gray-500 block">Systemic Exam / Others</label>
                            <textarea name="other" value={exam.other} onChange={handleExamChange} className="w-full p-1 border rounded bg-white h-20 resize-none" placeholder="Chest: Clear, CVS: S1+S2..." />
                        </div>
                    </div>
                </div>
            </div>

            {/* --- BOTTOM SECTION: DIAGNOSIS (FULL WIDTH) --- */}
            <div className="border-t border-gray-200 pt-6">
                
                {/* 1. WHO ICD-11 Search Input (Full Width) */}
                <div className="relative z-50"> {/* High Z-Index ensures dropdown floats over everything below */}
                    <ICD11Search onSelect={handleAddDiagnosis} />
                </div>

                {/* 2. Selected Diagnoses List (Chips/Tags) */}
                <div className="mt-4">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Selected Diagnoses:</label>
                    
                    {diagnosesList.length === 0 ? (
                        <p className="text-sm text-gray-400 italic mt-1">No diagnosis selected yet.</p>
                    ) : (
                        <div className="flex flex-wrap gap-2 mt-2">
                            {diagnosesList.map((item, index) => (
                                <div 
                                    key={index} 
                                    className="flex items-center bg-blue-50 border border-blue-200 text-blue-800 px-3 py-2 rounded-md shadow-sm transition-all hover:bg-blue-100"
                                >
                                    <div className="flex flex-col leading-tight mr-3">
                                        <span className="font-semibold text-sm">{item.description}</span>
                                        <span className="text-[10px] text-blue-500 uppercase font-mono">{item.code}</span>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => removeDiagnosis(item.code)}
                                        className="text-blue-400 hover:text-red-600 hover:bg-red-50 rounded-full p-1 transition-colors"
                                        title="Remove"
                                    >
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