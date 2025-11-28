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
        <fieldset className="p-4 border border-gray-200 rounded-xl mb-8 bg-white shadow-sm animate-fade-in">
            <legend className="text-lg font-bold text-indigo-700 px-2">Advice & Instructions</legend>

            {/* 1. Quick Instruction Blocks */}
            <div className="flex flex-wrap gap-3 mb-4 items-center border-b pb-4 border-gray-100">
                <p className="text-sm font-medium text-gray-700 mr-2">Templates:</p>
                {instructionBlocks.length === 0 ? (
                    <span className="text-xs text-gray-400 italic">No templates saved.</span>
                ) : (
                    instructionBlocks.map(b => (
                        <button key={b.block_id} type="button" className="px-3 py-1 text-sm border border-pink-400 bg-pink-50 text-pink-700 rounded-full hover:bg-pink-100 transition-colors"
                            onClick={() => applyInstructionBlock(b.content)}
                        >
                            {b.title}
                        </button>
                    ))
                )}
                <button type="button" onClick={() => setIsInstructionModalOpen(true)} className="px-3 py-1 text-sm border border-pink-600 bg-pink-600 text-white rounded-full ml-auto hover:bg-pink-700 transition-colors shadow-sm">+ Manage Blocks</button>
            </div>

            {/* 2. Main Advice Textarea */}
            <label className="block text-sm font-semibold text-gray-700 mb-1">Patient Advice / Upodesh</label>
            <textarea className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 mb-2 transition-shadow"
                placeholder="General Advice (Rest, Follow up, etc.)" value={advice} onChange={(e) => setAdvice(e.target.value)} rows="6"
            ></textarea>

            {/* REMOVED: Commented out Diagnosis Section */}

            {/* Instruction Modal */}
            <Modal isOpen={isInstructionModalOpen} onClose={() => { setIsInstructionModalOpen(false); setEditingInstructionBlock(null); setNewInstructionBlock({ title: '', content: '' }); }} 
                title={editingInstructionBlock ? "Edit Block" : "Manage Blocks"}>
                 {/* List View */}
                 {!editingInstructionBlock && (
                    <div className="mb-6">
                        <div className="max-h-64 overflow-y-auto space-y-2 border p-2 rounded-md bg-gray-50">
                            {instructionBlocks.map(b => (
                                <div key={b.block_id} className="flex justify-between items-center p-2 bg-white rounded border border-gray-200 shadow-sm">
                                    <span className="text-sm font-medium text-gray-800">{b.title}</span>
                                    <div className="space-x-2">
                                        <button type="button" onClick={() => { setEditingInstructionBlock(b); setNewInstructionBlock(b); }} className="text-xs text-indigo-600 hover:underline">Edit</button>
                                        <button type="button" onClick={() => handleDeleteInstructionBlock(b.block_id)} className="text-xs text-red-600 hover:underline">Delete</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={() => { setEditingInstructionBlock({ block_id: null }); setNewInstructionBlock({ title: '', content: '' }); }} className="mt-4 w-full py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 shadow-md">+ Create New</button>
                    </div>
                )}
                {/* Edit Form */}
                {(editingInstructionBlock || !instructionBlocks.length) && (
                    <form onSubmit={handleSaveInstructionBlock} className="flex flex-col gap-4 pt-4 border-t">
                        <input className="p-2 border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500" type="text" placeholder="Block Title (e.g. Dengue)" value={newInstructionBlock.title} onChange={(e) => setNewInstructionBlock({ ...newInstructionBlock, title: e.target.value })} required />
                        <textarea className="p-2 border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500" placeholder="Detailed Content" value={newInstructionBlock.content} onChange={(e) => setNewInstructionBlock({ ...newInstructionBlock, content: e.target.value })} rows="4" required />
                        <div className="flex justify-end space-x-3">
                            <button type="button" onClick={() => setEditingInstructionBlock(null)} className="px-4 py-2 border rounded-md text-gray-600 hover:bg-gray-50">Cancel</button>
                            <button type="submit" className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 shadow-md">Save</button>
                        </div>
                    </form>
                )}
            </Modal>
        </fieldset>
    );
}
export default ClinicalNotesPanel;