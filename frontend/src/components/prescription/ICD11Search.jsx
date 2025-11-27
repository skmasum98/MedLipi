import React, { useEffect } from 'react';
import * as ECT from '@whoicd/icd11ect';
import '@whoicd/icd11ect/style.css';

const ICD11Search = ({ onSelect }) => {
    const iNo = "1"; // Instance Number for the WHO tool

    useEffect(() => {
        // 1. Configure Settings
        const settings = {
            apiServerUrl: 'https://icd11restapi-developer-test.azurewebsites.net', // Dev URL
            autoBind: false, // We bind manually in React
            language: 'en', // You can change to 'es', 'ar', etc.
        };

        // 2. Configure Callbacks
        const callbacks = {
            selectedEntityFunction: (selectedEntity) => {
                // Extract Code and Title
                // Example selectedEntity: { code: "CA20", title: "Pharyngitis", ... }
                
                if (onSelect) {
                    onSelect({
                        code: selectedEntity.code,
                        description: selectedEntity.title,
                        selectedText: selectedEntity.selectedText
                    });
                }

                // Clear the search box after selection
                ECT.Handler.clear(iNo);
            },
        };

        // 3. Initialize
        ECT.Handler.configure(settings, callbacks);
        ECT.Handler.bind(iNo);

    }, [onSelect]);

    return (
        <div className="icd11-search-container relative">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
                Add Provisional Diagnosis (ICD-11)
            </label>
            
            {/* The Input element used by ECT */}
            <input
                type="text"
                className="ctw-input w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                autoComplete="off"
                placeholder="Type to search (e.g. Fever, Diabetes)..."
                data-ctw-ino={iNo} 
            />

            {/* The Results Dropdown used by ECT */}
            <div 
                className="ctw-window absolute z-50 bg-white shadow-xl border border-gray-200 rounded-b-md w-full mt-1" 
                data-ctw-ino={iNo}
                style={{ maxHeight: '300px', overflowY: 'auto' }}
            ></div>
        </div>
    );
};

export default ICD11Search;