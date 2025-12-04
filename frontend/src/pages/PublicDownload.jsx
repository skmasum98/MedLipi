import React from 'react';
import { useParams } from 'react-router';

const VITE_API_URL = import.meta.env.VITE_API_URL;

function PublicDownload() {
    const { uid } = useParams();

    const handleDownload = () => {
        // Direct link to the PDF stream in backend
        window.location.href = `${VITE_API_URL}/public/prescription/${uid}`;
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
            <div className="bg-white p-8 rounded-xl shadow-xl max-w-md w-full text-center border border-gray-100">
                <div className="mb-6 flex justify-center">
                    {/* Icon */}
                    <div className="bg-indigo-100 p-4 rounded-full">
                        <svg className="w-12 h-12 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 011.414.586l4 4a1 1 0 01.586 1.414V19a2 2 0 01-2 2z"></path></svg>
                    </div>
                </div>
                
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Digital Prescription</h1>
                <p className="text-gray-500 mb-8">
                    Your doctor has shared a digital copy of your prescription. Click below to view or download it.
                </p>

                <button 
                    onClick={handleDownload}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 shadow-md flex items-center justify-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                    Download PDF
                </button>

                <p className="mt-6 text-xs text-gray-400">
                    Powered by MedLipi
                </p>
            </div>
        </div>
    );
}

export default PublicDownload;