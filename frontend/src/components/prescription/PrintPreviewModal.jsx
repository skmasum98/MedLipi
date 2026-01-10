import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';

const VITE_API_URL = import.meta.env.VITE_API_URL;

function PrintPreviewModal({ isOpen, onClose, patientId, visitDate, onEdit }) {
    const { token } = useAuth();
    const [pdfUrl, setPdfUrl] = useState(null);
    const [useHeader, setUseHeader] = useState(true); // Default: Include Header
    const [loading, setLoading] = useState(false);

    // --- Fetch PDF Blob ---
    const fetchPdf = async () => {
        if (!patientId || !visitDate) return;
        setLoading(true);
        try {
            // Note: The backend logic for ?header=false must handle spacing (empty header space) vs full header.
            // Check your backend reprint route logic.
            const res = await fetch(`${VITE_API_URL}/prescriptions/reprint/${patientId}?header=${useHeader}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ date: visitDate }) 
            });
            
            if(res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                setPdfUrl(url);
            }
        } catch(e) { console.error(e); } 
        finally { setLoading(false); }
    };

    // Re-fetch whenever modal opens or settings change
    useEffect(() => {
        if (isOpen) fetchPdf();
        // Cleanup blob URL on unmount/change to free memory
        return () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); };
    }, [isOpen, useHeader, patientId]);


    // --- Handlers ---
    const handlePrint = () => {
        if (pdfUrl) {
            const printWindow = window.open(pdfUrl);
            if (printWindow) {
                // Wait for PDF to load then print
                // (Browser PDF viewers handle Ctrl+P naturally, but this triggers it programmatically)
                setTimeout(() => printWindow.print(), 1000); 
            }
        }
    };

    if (!isOpen) return null;

    return (
        // Full Screen Backdrop with Blur
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
            
            {/* Modal Content */}
            <div className="bg-white w-[90vw] h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-gray-700">
                
                {/* --- 1. TOP TOOLBAR --- */}
                <div className="bg-slate-800 text-white p-4 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
                    
                    {/* Left: Title & Edit */}
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={onEdit} 
                            className="text-gray-300 hover:text-white hover:bg-slate-700 px-3 py-1.5 rounded transition flex items-center gap-2 text-sm font-medium border border-transparent hover:border-slate-500"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" /></svg>
                            Back to Edit
                        </button>
                        <h2 className="text-lg font-bold tracking-wide">Final Preview</h2>
                    </div>

                    {/* Center: Letterhead Toggle */}
                    <div className="flex items-center bg-slate-700 rounded-lg p-1 border border-slate-600">
                        <button
                            onClick={() => setUseHeader(true)}
                            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${useHeader ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            With Header
                        </button>
                        <button
                            onClick={() => setUseHeader(false)}
                            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${!useHeader ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            Letterhead Mode
                        </button>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-3">
                         <button 
                            onClick={handlePrint}
                            disabled={loading}
                            className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-bold shadow-lg transition-transform active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                         >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                            Print / PDF
                         </button>

                         <button 
                            onClick={onClose}
                            className="bg-slate-700 hover:bg-red-600 text-white w-9 h-9 rounded-full flex items-center justify-center transition-colors font-bold"
                            title="Close & Finish"
                         >
                            ✕
                         </button>
                    </div>
                </div>

                {/* --- 2. PREVIEW AREA --- */}
                <div className="flex-1 bg-gray-500/10 p-4 relative overflow-hidden flex items-center justify-center">
                    
                    {/* Loading State */}
                    {loading && (
                        <div className="absolute inset-0 bg-white/80 z-20 flex flex-col items-center justify-center gap-3">
                            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-indigo-800 font-bold text-sm">Generating Document...</span>
                        </div>
                    )}

                    {/* Error State */}
                    {!loading && !pdfUrl && (
                        <div className="text-red-500 font-bold text-center bg-white p-6 rounded shadow">
                            Failed to load PDF. Try closing and saving again.
                        </div>
                    )}

                    {/* PDF Viewer (Object/Iframe) */}
                    {/* Using an Iframe within a container that simulates Paper background */}
                    {pdfUrl && (
                         <div className="w-full h-full shadow-2xl bg-white rounded-lg overflow-hidden border border-gray-300">
                             <iframe 
                                 src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1&zoom=85`} 
                                 className="w-full h-full border-none"
                                 title="Rx Preview"
                             />
                         </div>
                    )}
                </div>

            </div>
        </div>
    );
}

export default PrintPreviewModal;