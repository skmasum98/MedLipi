import React from 'react';
import Modal from '../Modal';

function MedicationPanel({
    // Drug Search Props
    searchQuery, handleSearch, searchResults, addDrugToPrescription,
    // List Props
    prescriptions, handlePrescriptionItemChange, removePrescriptionItem,
    // Interaction Props
    interactionWarnings,
    // SIG Template Props
    sigTemplates, applyTemplate, setIsSigModalOpen,
    // Modal Props
    isSigModalOpen, handleSaveTemplate, handleDeleteTemplate,
    editingSigTemplate, setEditingSigTemplate, newTemplate, setNewTemplate
}) {

    // --- Helpers for Quick Actions ---
    const quickDurations = ['3 Days', '5 Days', '7 Days', '15 Days', '1 Month', 'Continue'];
    
    // NEW: Quick Timing Instructions
    const quickTimings = ['After Meal', 'Before Meal', 'With Food', 'Empty Stomach', 'At Bedtime'];
    
    // Handler: Set Duration
    const setDuration = (id, val) => handlePrescriptionItemChange(id, 'duration', val);

    // Handler: Append Timing to SIG
    const appendSigTiming = (id, currentVal, timing) => {
        // Avoid duplicating if already present
        if (currentVal.includes(timing)) return;
        
        const newVal = currentVal ? `${currentVal} ${timing}` : timing;
        handlePrescriptionItemChange(id, 'sig_instruction', newVal);
    };

    return (
        <fieldset className="p-5 border border-gray-200 rounded-xl mb-6 bg-white shadow-sm animate-fade-in">
            <div className="flex justify-between items-center mb-4 border-b pb-2 border-gray-100">
                <legend className="text-lg font-bold text-indigo-800">💊 Medications & Dosage</legend>
                <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full font-medium">
                    {prescriptions.length} items
                </span>
            </div>

             {/* 1. Add Medication Search */}
            <div className="mb-6 relative z-30"> 
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Search & Add</label>
                <div className="relative">
                    <input 
                        className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition-all"
                        type="text" 
                        placeholder="Type Brand (e.g. Napa) or Generic..." 
                        value={searchQuery} 
                        onChange={handleSearch} 
                    />
                    <span className="absolute left-3 top-3.5 text-gray-400">🔍</span>
                </div>
                
                {/* Search Results Dropdown */}
                {searchResults.length > 0 && (
                    <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg max-h-64 overflow-y-auto shadow-xl mt-1 text-sm">
                        {searchResults.map(drug => (
                            <li 
                                key={drug.drug_id} 
                                className="p-3 border-b border-gray-50 hover:bg-indigo-50 cursor-pointer flex justify-between items-center transition-colors group" 
                                onClick={() => addDrugToPrescription(drug)}
                            >
                                <div>
                                    <div className="flex items-baseline gap-2">
                                        <strong className="text-gray-900 text-base">{drug.trade_names}</strong>
                                        <span className="text-xs bg-gray-100 text-gray-600 px-1.5 rounded">{drug.strength}</span>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-0.5 group-hover:text-indigo-600">
                                        {drug.generic_name}
                                    </div>
                                </div>
                                {drug.manufacturer && (
                                    <span className="text-[10px] uppercase font-bold text-gray-400 border border-gray-200 px-2 py-0.5 rounded-full group-hover:border-indigo-200 group-hover:text-indigo-500">
                                        {drug.manufacturer}
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* 2. Interaction Warnings */}
            {interactionWarnings.length > 0 && (
                <div className="mb-6 p-4 border-l-4 border-red-500 bg-red-50 rounded-r-lg shadow-sm animate-pulse-slow">
                    <h4 className="font-bold text-red-700 mb-2 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                        Interaction Alert
                    </h4>
                    <ul className="list-disc pl-5 text-sm text-red-800 space-y-1">
                        {interactionWarnings.map((w, i) => (
                            <li key={i}>
                                <span className="font-bold">{w.drug1_name} + {w.drug2_name}:</span> {w.warning_message}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

           {/* 3. Prescription List (The Cards) */}
            <div className="mb-6 space-y-3">
                {prescriptions.length === 0 ? (
                    <div className="text-center p-8 border-2 border-dashed border-gray-200 rounded-lg text-gray-400">
                        Search and select a medicine to begin
                    </div>
                ) : (
                    prescriptions.map((item, index) => (
                        <div key={item.tempId} className="relative bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                            
                            {/* Remove Button */}
                            <button 
                                onClick={() => removePrescriptionItem(item.tempId)}
                                className="absolute top-2 right-2 text-gray-300 hover:text-red-500 p-1 rounded-full hover:bg-red-50 transition-colors"
                                title="Remove"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>

                            <div className="flex flex-col md:flex-row gap-4">
                                
                                {/* Drug Name */}
                                <div className="md:w-1/4">
                                    <div className="flex items-center gap-2">
                                        <span className="flex items-center justify-center w-6 h-6 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full shrink-0">
                                            {index + 1}
                                        </span>
                                        <div>
                                            {/* Show Trade Name (Bold) and Generic (Small) */}
                                            <h4 className="font-bold text-gray-900 leading-tight">
                                                {item.trade_names || item.generic_name}
                                            </h4>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {item.trade_names && `(${item.generic_name})`} 
                                                <span className="font-semibold text-gray-600 ml-1">{item.strength}</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Inputs Section */}
                                <div className="md:w-3/4 grid grid-cols-12 gap-3 items-start">
                                    
                                    {/* Qty */}
                                    <div className="col-span-2">
                                        <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Qty</label>
                                        <input 
                                            className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-center focus:ring-indigo-500 focus:border-indigo-500"
                                            type="text" placeholder="--" 
                                            value={item.quantity} 
                                            onChange={(e) => handlePrescriptionItemChange(item.tempId, 'quantity', e.target.value)} 
                                        />
                                    </div>

                                    {/* SIG (Smart Input with Timing) */}
                                    <div className="col-span-6 relative group">
                                        <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Instruction</label>
                                        <input 
                                            className="w-full p-2 bg-gray-50 border border-gray-200 rounded focus:ring-indigo-500 focus:border-indigo-500"
                                            type="text" 
                                            list={`sig-options-${item.tempId}`} // Unique ID
                                            placeholder="1+0+1..." 
                                            value={item.sig_instruction} 
                                            onChange={(e) => handlePrescriptionItemChange(item.tempId, 'sig_instruction', e.target.value)} 
                                        />
                                        
                                        {/* 1. Datalist for basic templates (e.g. 1+0+1) */}
                                        <datalist id={`sig-options-${item.tempId}`}>
                                            {sigTemplates.map(t => (
                                                <option key={t.template_id} value={t.instruction}>{t.title}</option>
                                            ))}
                                        </datalist>

                                        {/* 2. Hover/Focus Menu for Timing (Meal instructions) */}
                                        {/* Shows when input container is focused or hovered */}
                                        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 shadow-xl rounded-lg p-2 z-20 hidden group-focus-within:flex flex-wrap gap-1 w-full max-w-[200px]">
                                            <p className="w-full text-[10px] text-gray-400 uppercase font-bold text-center mb-1">Add Timing</p>
                                            {quickTimings.map(time => (
                                                <button 
                                                    key={time}
                                                    type="button"
                                                    onMouseDown={(e) => {
                                                        e.preventDefault(); // Prevent blur
                                                        appendSigTiming(item.tempId, item.sig_instruction, time);
                                                    }}
                                                    className="text-xs bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-100 px-2 py-1 rounded transition-colors grow text-center"
                                                >
                                                    {time}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Duration (Smart Chips) */}
                                    <div className="col-span-4 relative group">
                                        <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Duration</label>
                                        <input 
                                            className="w-full p-2 bg-gray-50 border border-gray-200 rounded focus:ring-indigo-500 focus:border-indigo-500"
                                            type="text" placeholder="Days..." 
                                            value={item.duration} 
                                            onChange={(e) => handlePrescriptionItemChange(item.tempId, 'duration', e.target.value)} 
                                        />
                                        
                                        <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 shadow-xl rounded-lg p-2 z-20 hidden group-focus-within:grid grid-cols-2 gap-1 w-32">
                                            {quickDurations.map(dur => (
                                                <button 
                                                    key={dur}
                                                    type="button"
                                                    onMouseDown={(e) => {
                                                        e.preventDefault(); 
                                                        setDuration(item.tempId, dur);
                                                    }}
                                                    className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2 py-1.5 rounded transition-colors text-center"
                                                >
                                                    {dur}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* 4. Footer Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <span className="text-xs text-gray-400 italic">
                    Tip: Click boxes to see quick options.
                </span>
                <button 
                    type="button" 
                    onClick={() => setIsSigModalOpen(true)} 
                    className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center gap-1"
                >
                    <span>⚙️</span> Manage Templates
                </button>
            </div>

            {/* SIG Modal */}
            <Modal isOpen={isSigModalOpen} onClose={() => { setIsSigModalOpen(false); setEditingSigTemplate(null); setNewTemplate({ title: '', instruction: '' }); }} 
                title={editingSigTemplate ? "Edit SIG Template" : "Create SIG Template"}>
                {/* List View */}
                {!editingSigTemplate && (
                    <div className="mb-6">
                        <div className="max-h-64 overflow-y-auto space-y-2 border border-gray-200 p-2 rounded-lg bg-gray-50">
                            {sigTemplates.map(t => (
                                <div key={t.template_id} className="flex justify-between items-center p-3 bg-white rounded border border-gray-200 shadow-sm">
                                    <div>
                                        <div className="text-sm font-bold text-gray-800">{t.title}</div>
                                        <div className="text-xs text-gray-500 font-mono">{t.instruction}</div>
                                    </div>
                                    <div className="space-x-3">
                                        <button type="button" onClick={() => { setEditingSigTemplate(t); setNewTemplate(t); }} className="text-xs text-indigo-600 hover:underline font-medium">Edit</button>
                                        <button type="button" onClick={() => handleDeleteTemplate(t.template_id)} className="text-xs text-red-600 hover:underline font-medium">Delete</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={() => { setEditingSigTemplate({ template_id: null }); setNewTemplate({ title: '', instruction: '' }); }} className="mt-4 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow">+ Create New Template</button>
                    </div>
                )}
                {/* Edit Form */}
                {(editingSigTemplate || !sigTemplates.length) && (
                    <form onSubmit={handleSaveTemplate} className="flex flex-col gap-4 pt-4 border-t">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Title (Short Code)</label>
                            <input className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500" type="text" placeholder="e.g. TID" value={newTemplate.title} onChange={(e) => setNewTemplate({ ...newTemplate, title: e.target.value })} required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Instruction (Full Text)</label>
                            <input className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500" type="text" placeholder="e.g. 1+1+1" value={newTemplate.instruction} onChange={(e) => setNewTemplate({ ...newTemplate, instruction: e.target.value })} required />
                        </div>
                        <div className="flex justify-end space-x-3 mt-2">
                            <button type="button" onClick={() => setEditingSigTemplate(null)} className="px-4 py-2 border rounded-md text-gray-600 hover:bg-gray-100">Cancel</button>
                            <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 shadow">Save</button>
                        </div>
                    </form>
                )}
            </Modal>
        </fieldset>
    );
}
export default MedicationPanel;