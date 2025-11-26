import React from 'react';

function AssessmentPanel({
    // State
    chiefComplaint, setChiefComplaint,
    history, setHistory,
    investigations, setInvestigations,
    exam, setExam,
    diagnosis, diagnosisSearchQuery, handleDiagnosisSearch, diagnosisSearchResults, selectDiagnosis
}) {
    
    // Helper for Exam Changes
    const handleExamChange = (e) => {
        setExam({ ...exam, [e.target.name]: e.target.value });
    };

    return (
        <fieldset className="p-5 border border-gray-200 rounded-xl mb-6 bg-white shadow-sm animate-fade-in">
            <legend className="text-lg font-bold text-indigo-700 px-2">Clinical Assessment</legend>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* LEFT COL: Subjective (Symptoms & History) */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Presenting Complaint / Symptoms (C/C)</label>
                        <textarea 
                            className="w-full p-2 border border-gray-300 rounded-md h-20 focus:ring-indigo-500"
                            placeholder="e.g. Fever for 3 days, Cough..."
                            value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)}
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">History (Medical & Treatment)</label>
                        <textarea 
                            className="w-full p-2 border border-gray-300 rounded-md h-20 focus:ring-indigo-500"
                            placeholder="e.g. HTN, DM, Taking Paracetamol..."
                            value={history} onChange={(e) => setHistory(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Investigations (Lab Reports)</label>
                        <textarea 
                            className="w-full p-2 border border-gray-300 rounded-md h-20 focus:ring-indigo-500"
                            placeholder="e.g. CBC: Hb 10.5, RBS: 7.8..."
                            value={investigations} onChange={(e) => setInvestigations(e.target.value)}
                        />
                    </div>
                </div>

                {/* RIGHT COL: Objective (Vitals & Diagnosis) */}
                <div className="space-y-4">
                    
                    {/* Vitals Grid */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <label className="block text-sm font-bold text-indigo-800 mb-3 border-b pb-1">Examination Findings (O/E)</label>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-gray-500 block">BP (mmHg)</label>
                                <input type="text" name="bp" value={exam.bp} onChange={handleExamChange} className="w-full p-1 border rounded" placeholder="120/80" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 block">Pulse (bpm)</label>
                                <input type="text" name="pulse" value={exam.pulse} onChange={handleExamChange} className="w-full p-1 border rounded" placeholder="72" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 block">Temp (°F)</label>
                                <input type="text" name="temp" value={exam.temp} onChange={handleExamChange} className="w-full p-1 border rounded" placeholder="98.6" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 block">Weight (kg)</label>
                                <input type="text" name="weight" value={exam.weight} onChange={handleExamChange} className="w-full p-1 border rounded" placeholder="65" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 block">SpO2 (%)</label>
                                <input type="text" name="spo2" value={exam.spo2} onChange={handleExamChange} className="w-full p-1 border rounded" placeholder="98" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 block">BMI</label>
                                <input type="text" name="bmi" value={exam.bmi} onChange={handleExamChange} className="w-full p-1 border rounded" placeholder="22.5" />
                            </div>
                        </div>
                        <div className="mt-3">
                            <label className="text-xs text-gray-500 block">Systemic Exam / Others</label>
                            <input type="text" name="other" value={exam.other} onChange={handleExamChange} className="w-full p-1 border rounded" placeholder="Chest: Clear, CVS: S1+S2..." />
                        </div>
                    </div>

                    {/* Diagnosis Search (Moved here) */}
                    <div className="relative">
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Provisional Diagnosis</label>
                        <input 
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500"
                            type="text"
                            placeholder="Search ICD or type..." 
                            value={diagnosisSearchQuery} 
                            onChange={handleDiagnosisSearch}
                        />
                        {(diagnosis.code || diagnosis.description) && (
                            <p className="text-xs mt-1 p-1 bg-indigo-50 border border-indigo-100 rounded text-indigo-700">
                                Selected: <strong>{diagnosis.description || diagnosis.code}</strong>
                            </p>
                        )}
                        {diagnosisSearchResults.length > 0 && (
                            <ul className="absolute z-20 w-full bg-white border border-gray-400 rounded-md max-h-40 overflow-y-auto shadow-xl mt-1">
                                {diagnosisSearchResults.map(d => (
                                    <li key={d.code_id} className="p-2 border-b hover:bg-gray-100 cursor-pointer text-sm" onClick={() => selectDiagnosis(d)}>
                                        <strong>{d.code}</strong> {d.simplified_name}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                </div>
            </div>
        </fieldset>
    );
}

export default AssessmentPanel;