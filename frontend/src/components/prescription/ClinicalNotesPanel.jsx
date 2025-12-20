import React, { useState } from 'react';
import Modal from '../Modal';
import { useAuth } from '../../hooks/useAuth'; // Import Auth for token

const VITE_API_URL = import.meta.env.VITE_API_URL;

function ClinicalNotesPanel({
    // Advice Props
    advice, setAdvice,
    
    // Instruction Block Props
    instructionBlocks, applyInstructionBlock, setIsInstructionModalOpen,
    
    // Modal Props
    isInstructionModalOpen, handleSaveInstructionBlock, handleDeleteInstructionBlock,
    editingInstructionBlock, setEditingInstructionBlock, newInstructionBlock, setNewInstructionBlock,

    // NEW PROPS for AI Context (passed from parent)
    diagnosisList, // List of diagnoses (array)
    prescriptions,  // List of meds (array)

    // New Props for Follow Up Date
    followUp, setFollowUp 
}) {
    const { token } = useAuth();
    const [isGenerating, setIsGenerating] = useState(false);

    // --- AI Handler ---
    const handleGenerateAI = async () => {
        // Validation
        const diagnosisText = diagnosisList?.map(d => d.description).join(', ');
        if (!diagnosisText && (!prescriptions || prescriptions.length === 0)) {
            alert("Please add a Diagnosis or Medication first so the AI knows what to advise!");
            return;
        }

        setIsGenerating(true);
        try {
            const res = await fetch(`${VITE_API_URL}/ai/generate-advice`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ 
                    diagnosis: diagnosisText,
                    medicines: prescriptions 
                }),
            });

            const data = await res.json();
            if (res.ok) {
                // Append AI advice to existing advice with a newline
                setAdvice(prev => prev ? prev + "\n\n" + data.advice : data.advice);
            } else {
                alert(data.message || "AI Generation Failed");
            }
        } catch (error) {
            console.error(error);
            alert("Network Error: Could not reach AI service.");
        } finally {
            setIsGenerating(false);
        }
    };

    // --- Helper: Quick Date Calculator ---
    const setQuickFollowUp = (days) => {
        const date = new Date();
        date.setDate(date.getDate() + days);
        // Format to YYYY-MM-DD for the input[type="date"]
        const dateString = date.toISOString().split('T')[0];
        setFollowUp(dateString);
    };

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

            {/* 2. Main Advice Textarea & AI Button */}
            <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-semibold text-gray-700">Patient Advice / Upodesh</label>
                
                {/* --- AI MAGIC BUTTON --- */}
                <button 
                    type="button" 
                    onClick={handleGenerateAI}
                    disabled={isGenerating}
                    className={`flex items-center gap-1 px-3 py-1 text-xs font-bold text-white rounded-md shadow transition-all
                        ${isGenerating ? 'bg-gray-400 cursor-not-allowed' : 'bg-linear-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700'}
                    `}
                >
                    {isGenerating ? (
                        <>
                            <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            Generating...
                        </>
                    ) : (
                        <>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                            Generate with AI
                        </>
                    )}
                </button>
                {/* ----------------------- */}
            </div>

            <textarea className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 mb-2 transition-shadow"
                placeholder="General Advice (Rest, Follow up, etc.)" value={advice} onChange={(e) => setAdvice(e.target.value)} rows="6"
            ></textarea>

            <div className="mt-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <label className="block text-sm font-bold text-indigo-800 mb-2">Follow-up Visit</label>
                
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                    {/* Actual Date Input */}
                    <div className="relative flex-1 w-full">
                         <input 
                            className="w-full p-2 border border-gray-300 rounded-md cursor-pointer focus:ring-indigo-500 focus:border-indigo-500" 
                            type="date" 
                            value={followUp} 
                            onChange={(e) => setFollowUp(e.target.value)} 
                        />
                    </div>

                    {/* Quick Buttons */}
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setQuickFollowUp(3)} className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-300 rounded shadow-sm hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition">+3 Days</button>
                        <button type="button" onClick={() => setQuickFollowUp(7)} className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-300 rounded shadow-sm hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition">+7 Days</button>
                        <button type="button" onClick={() => setQuickFollowUp(15)} className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-300 rounded shadow-sm hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition">+15 Days</button>
                        <button type="button" onClick={() => setQuickFollowUp(30)} className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-300 rounded shadow-sm hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition">+1 Month</button>
                    </div>
                </div>
            </div>

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