import React from 'react';
import ReactDOM from 'react-dom';

function Modal({ isOpen, onClose, title, children }) {
    if (!isOpen) return null;

    // Use ReactDOM.createPortal to render outside the main component hierarchy
    return ReactDOM.createPortal(
        // Backdrop
        <div 
            className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-start justify-center p-4 sm:p-6 lg:p-8 z-50 overflow-y-auto"
            onClick={onClose} // Close on backdrop click
        >
            {/* Modal Card */}
            <div 
                className="bg-white rounded-xl shadow-2xl max-w-lg w-full transform transition-all mt-10"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
            >
                {/* Modal Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
                    <button 
                        onClick={onClose} 
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label="Close"
                    >
                        {/* Close Icon (X) */}
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                
                {/* Modal Body */}
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>,
        document.body // Attach to the body element
    );
}

export default Modal;