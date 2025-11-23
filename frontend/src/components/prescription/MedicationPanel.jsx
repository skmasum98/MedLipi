// frontend/src/components/prescription/MedicationPanel.jsx
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
    return (
        <fieldset className="p-4 border border-gray-300 rounded-lg mb-6 bg-white shadow-sm">
            <legend className="text-lg font-semibold text-indigo-700 px-2">Medications & SIG</legend>

            {/* 1. Add Medication */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Search Drug</label>
                <input 
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    type="text" placeholder="Search Drug Name (e.g., Napa, Amoxicillin)" value={searchQuery} onChange={handleSearch} 
                />
                {searchResults.length > 0 && (
                    <ul className="list-none p-0 mt-2 border border-gray-400 rounded-md max-h-52 overflow-y-auto shadow-md bg-white">
                        {searchResults.map(drug => (
                            <li key={drug.drug_id} className="p-3 border-b border-gray-200 cursor-pointer hover:bg-indigo-50" onClick={() => addDrugToPrescription(drug)}>
                                <strong>{drug.generic_name}</strong> <span className="text-sm text-gray-500">({drug.trade_names}) - {drug.strength}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* 2. Warnings */}
            {interactionWarnings.length > 0 && (
                <div className="mb-6 p-4 border border-red-400 bg-red-100 rounded-lg">
                    <h4 className="font-semibold text-red-700 mb-2">⚠️ DRUG INTERACTION ALERT</h4>
                    <ul className="list-disc pl-5 text-sm text-red-800">
                        {interactionWarnings.map((w, i) => (
                            <li key={i}>
                                <span className={w.severity === 'High' ? 'text-red-900 font-bold' : ''}>{w.severity} Risk: </span> 
                                {w.drug1_name} & {w.drug2_name}. <p className="text-xs italic">{w.warning_message}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* 3. Prescription List */}
            <div className="mb-6">
                <h4 className="font-medium text-gray-700 mb-2">Prescription List</h4>
                {prescriptions.length === 0 ? <p className="text-gray-500 italic">No medications added.</p> : (
                    prescriptions.map(item => (
                        <div key={item.tempId} className="flex flex-wrap gap-2 items-center border-b border-gray-200 py-3">
                            <div className="font-bold text-indigo-600 flex-1 min-w-[150px]">{item.generic_name} ({item.strength})</div>
                            <input className="p-1 border border-gray-300 rounded-md w-24 text-center" type="text" placeholder="Qty" value={item.quantity} onChange={(e) => handlePrescriptionItemChange(item.tempId, 'quantity', e.target.value)} />
                            <input className="p-1 border border-gray-300 rounded-md flex-2 min-w-[200px]" type="text" placeholder="SIG" value={item.sig_instruction} onChange={(e) => handlePrescriptionItemChange(item.tempId, 'sig_instruction', e.target.value)} />
                            <input className="p-1 border border-gray-300 rounded-md w-28 text-center" type="text" placeholder="Duration" value={item.duration} onChange={(e) => handlePrescriptionItemChange(item.tempId, 'duration', e.target.value)} />
                            <button type="button" onClick={() => removePrescriptionItem(item.tempId)} className="bg-red-500 text-white px-3 py-1 rounded-md">X</button>
                        </div>
                    ))
                )}
            </div>

            {/* 4. SIG Templates (Quick Buttons) */}
            <div className="flex flex-wrap gap-3 items-center border-t pt-4 border-gray-200">
                <p className="text-sm font-medium text-gray-700">Quick SIG:</p>
                {sigTemplates.map(t => (
                    <button key={t.template_id} type="button" className="px-3 py-1 text-sm border border-indigo-400 bg-indigo-100 text-indigo-700 rounded-full hover:bg-indigo-200"
                        onClick={() => {
                            if (prescriptions.length > 0) applyTemplate(prescriptions[prescriptions.length - 1].tempId, t.instruction);
                            else alert('Add a drug first.');
                        }}
                    >
                        {t.title}
                    </button>
                ))}
                <button type="button" onClick={() => setIsSigModalOpen(true)} className="px-3 py-1 text-sm border border-indigo-600 bg-indigo-600 text-white rounded-full ml-auto">+ Manage Templates</button>
            </div>

            {/* SIG Modal */}
            <Modal isOpen={isSigModalOpen} onClose={() => { setIsSigModalOpen(false); setEditingSigTemplate(null); setNewTemplate({ title: '', instruction: '' }); }} 
                title={editingSigTemplate ? "Edit SIG Template" : "Create SIG Template"}>
                {/* List View */}
                {!editingSigTemplate && (
                    <div className="mb-6">
                        <div className="max-h-40 overflow-y-auto space-y-2 border p-2 rounded-md">
                            {sigTemplates.map(t => (
                                <div key={t.template_id} className="flex justify-between p-2 bg-gray-50 rounded-md">
                                    <span className="text-sm">{t.title}</span>
                                    <div className="space-x-2">
                                        <button type="button" onClick={() => { setEditingSigTemplate(t); setNewTemplate(t); }} className="text-xs text-indigo-600">Edit</button>
                                        <button type="button" onClick={() => handleDeleteTemplate(t.template_id)} className="text-xs text-red-600">Delete</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={() => { setEditingSigTemplate({ template_id: null }); setNewTemplate({ title: '', instruction: '' }); }} className="mt-4 w-full py-2 bg-indigo-600 text-white rounded-md">+ Create New</button>
                    </div>
                )}
                {/* Edit Form */}
                {(editingSigTemplate || !sigTemplates.length) && (
                    <form onSubmit={handleSaveTemplate} className="flex flex-col gap-4 pt-4 border-t">
                        <input className="p-2 border rounded-md" type="text" placeholder="Title (e.g., TID)" value={newTemplate.title} onChange={(e) => setNewTemplate({ ...newTemplate, title: e.target.value })} required />
                        <input className="p-2 border rounded-md" type="text" placeholder="Instruction" value={newTemplate.instruction} onChange={(e) => setNewTemplate({ ...newTemplate, instruction: e.target.value })} required />
                        <div className="flex justify-end space-x-3">
                            <button type="button" onClick={() => setEditingSigTemplate(null)} className="px-4 py-2 border rounded-md">Cancel</button>
                            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md">Save</button>
                        </div>
                    </form>
                )}
            </Modal>
        </fieldset>
    );
}
export default MedicationPanel;