// frontend/src/components/prescription/ClinicalNotesPanel.jsx
import React from 'react';
import Modal from '../Modal';

function ClinicalNotesPanel({
    // Advice Props
    advice, setAdvice,
    
    // Instruction Block Props
    instructionBlocks, applyInstructionBlock, setIsInstructionModalOpen,
    // Modal Props
    isInstructionModalOpen, handleSaveInstructionBlock, handleDeleteInstructionBlock,
    editingInstructionBlock, setEditingInstructionBlock, newInstructionBlock, setNewInstructionBlock
}) {
    return (
        <fieldset className="p-4 border border-gray-300 rounded-lg mb-8 bg-white shadow-sm">
            <legend className="text-lg font-semibold text-indigo-700 px-2">Clinical Notes & Guide</legend>

            {/* 1. Quick Instruction Blocks */}
            <div className="flex flex-wrap gap-3 mb-4 items-center border-b pb-4 border-gray-200">
                <p className="text-sm font-medium text-gray-700 mr-2">Templates:</p>
                {instructionBlocks.map(b => (
                    <button key={b.block_id} type="button" className="px-3 py-1 text-sm border border-pink-400 bg-pink-100 text-pink-700 rounded-full hover:bg-pink-200"
                        onClick={() => applyInstructionBlock(b.content)}
                    >
                        {b.title}
                    </button>
                ))}
                <button type="button" onClick={() => setIsInstructionModalOpen(true)} className="px-3 py-1 text-sm border border-pink-600 bg-pink-600 text-white rounded-full ml-auto">+ Manage Blocks</button>
            </div>

            {/* 2. Main Advice Textarea */}
            <label className="block text-sm font-medium text-gray-700 mb-1">Patient Advice</label>
            <textarea className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 mb-4"
                placeholder="General Advice (Rest, Follow up, etc.)" value={advice} onChange={(e) => setAdvice(e.target.value)} rows="4"
            ></textarea>

            {/* 3. Structured Diagnosis */}
            {/* <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis</label>
                <input className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    type="text" placeholder="Search or Type Diagnosis..." value={diagnosisSearchQuery} onChange={handleDiagnosisSearch}
                />
                {(diagnosis.code || diagnosis.description) && (
                    <p className="text-sm mt-2 p-2 bg-indigo-50 border border-indigo-200 rounded-md">
                        <strong className="text-indigo-700">Selected:</strong> {diagnosis.description || diagnosis.code} {diagnosis.code && `(${diagnosis.code})`}
                    </p>
                )}
                {diagnosisSearchResults.length > 0 && (
                    <ul className="absolute z-20 w-full bg-white border border-gray-400 rounded-md max-h-52 overflow-y-auto shadow-xl mt-1">
                        {diagnosisSearchResults.map(d => (
                            <li key={d.code_id} className="p-3 border-b border-gray-200 cursor-pointer hover:bg-indigo-50" onClick={() => selectDiagnosis(d)}>
                                <strong>{d.code}</strong> <span className="text-sm ml-2">{d.simplified_name || d.description}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div> */}

            {/* Instruction Modal (Simplified View for Brevity - Logic matches parent) */}
            <Modal isOpen={isInstructionModalOpen} onClose={() => { setIsInstructionModalOpen(false); setEditingInstructionBlock(null); setNewInstructionBlock({ title: '', content: '' }); }} 
                title={editingInstructionBlock ? "Edit Block" : "Manage Blocks"}>
                 {/* List View */}
                 {!editingInstructionBlock && (
                    <div className="mb-6">
                        <div className="max-h-40 overflow-y-auto space-y-2 border p-2 rounded-md">
                            {instructionBlocks.map(b => (
                                <div key={b.block_id} className="flex justify-between p-2 bg-gray-50 rounded-md">
                                    <span className="text-sm">{b.title}</span>
                                    <div className="space-x-2">
                                        <button type="button" onClick={() => { setEditingInstructionBlock(b); setNewInstructionBlock(b); }} className="text-xs text-indigo-600">Edit</button>
                                        <button type="button" onClick={() => handleDeleteInstructionBlock(b.block_id)} className="text-xs text-red-600">Delete</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={() => { setEditingInstructionBlock({ block_id: null }); setNewInstructionBlock({ title: '', content: '' }); }} className="mt-4 w-full py-2 bg-indigo-600 text-white rounded-md">+ Create New</button>
                    </div>
                )}
                {/* Edit Form */}
                {(editingInstructionBlock || !instructionBlocks.length) && (
                    <form onSubmit={handleSaveInstructionBlock} className="flex flex-col gap-4 pt-4 border-t">
                        <input className="p-2 border rounded-md" type="text" placeholder="Title" value={newInstructionBlock.title} onChange={(e) => setNewInstructionBlock({ ...newInstructionBlock, title: e.target.value })} required />
                        <textarea className="p-2 border rounded-md" placeholder="Content" value={newInstructionBlock.content} onChange={(e) => setNewInstructionBlock({ ...newInstructionBlock, content: e.target.value })} rows="3" required />
                        <div className="flex justify-end space-x-3">
                            <button type="button" onClick={() => setEditingInstructionBlock(null)} className="px-4 py-2 border rounded-md">Cancel</button>
                            <button type="submit" className="px-4 py-2 bg-pink-600 text-white rounded-md">Save</button>
                        </div>
                    </form>
                )}
            </Modal>
        </fieldset>
    );
}
export default ClinicalNotesPanel;