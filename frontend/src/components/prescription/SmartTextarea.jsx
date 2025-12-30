import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';

const VITE_API_URL = import.meta.env.VITE_API_URL;

const SmartTextarea = ({ label, value, onChange, category, placeholder, height = "h-20" }) => {
    const { token } = useAuth();
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const wrapperRef = useRef(null);

    // Helper: Get the current active search term (last part after a comma)
    const getLastSegment = (text) => {
        if (!text) return '';
        // Split by comma or newline
        const segments = text.split(/,\s*|\n/); 
        return segments[segments.length - 1].trim();
    };

    // --- Search Logic ---
    useEffect(() => {
        // 1. Determine what to search for
        const currentSearchTerm = getLastSegment(value);

        const fetchSuggestions = async () => {
            try {
                // Search ONLY using the last typed segment
                const res = await fetch(`${VITE_API_URL}/clinical-templates/search?category=${category}&q=${currentSearchTerm}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setSuggestions(data);
                }
            } catch (error) { console.error(error); }
        };

        const timer = setTimeout(() => {
            // Fetch if focused or typing
            // If text is empty (or ends in comma + space), verify if we want to show all default templates
            fetchSuggestions();
        }, 300);

        return () => clearTimeout(timer);
    }, [value, category, token]); // Re-run when user types

    // --- Handle Click Outside ---
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    // --- CRUD Handlers ---
    const handleSelect = (templateText) => {
        // 1. Split existing text to keep the "History"
        // Regex splits by comma allowing optional spaces
        const segments = value.split(/,\s*/);
        
        // 2. Remove the partial text the user was typing (the last one)
        segments.pop(); 
        
        // 3. Add the selected full template text
        segments.push(templateText);
        
        // 4. Join back with commas
        // Adding ", " at the end prepares for the NEXT item immediately
        const newValue = segments.join(', ') + ', '; 
        
        onChange({ target: { name: category, value: newValue } });
        setShowSuggestions(false);
        
        // Optional: Refocus logic if needed, but usually works fine
    };

    const handleSaveAsTemplate = async () => {
        const textToSave = getLastSegment(value); // Only save the active part, not the whole history
        
        if (!textToSave.trim()) {
            alert('Please type a specific complaint/finding to save.');
            return;
        }
        
        if (!window.confirm(`Save "${textToSave}" as a reuseable template?`)) return;

        try {
            const res = await fetch(`${VITE_API_URL}/clinical-templates`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ category, content: textToSave })
            });
            if (res.ok) {
                alert('Template Saved!');
                // Trigger re-fetch? The effect will handle it on next type
            }
        } catch (e) { alert('Error saving'); }
    };

    const handleDeleteTemplate = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm('Delete this template?')) return;
        try {
            const res = await fetch(`${VITE_API_URL}/clinical-templates/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setSuggestions(suggestions.filter(s => s.template_id !== id));
            }
        } catch (e) { alert('Error deleting'); }
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <div className="flex justify-between items-end mb-1">
                <label htmlFor={category} className="block text-sm font-semibold text-gray-700">{label}</label>
                {/* Only show Save button if there is text typed in the current segment */}
                {getLastSegment(value).length > 2 && (
                    <button 
                        type="button" 
                        onClick={handleSaveAsTemplate}
                        className="text-xs text-indigo-600 hover:underline bg-indigo-50 px-2 py-0.5 rounded"
                    >
                        + Save "{getLastSegment(value)}"
                    </button>
                )}
            </div>
            
            <textarea 
                id={category}
                name={category}
               className={`w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 ${height}`}
                placeholder={placeholder}
                value={value} 
                onChange={(e) => {
                    onChange(e); 
                    setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                autoComplete="off"
            />

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded-md shadow-xl max-h-48 overflow-y-auto mt-1">
                    {suggestions.map((item) => (
                        <li 
                            key={item.template_id} 
                            className="p-2 border-b border-gray-50 hover:bg-indigo-50 cursor-pointer transition-colors flex justify-between items-center group"
                            onClick={() => handleSelect(item.content)}
                        >
                            <span className="text-sm text-gray-700 flex-1 truncate mr-2">{item.content}</span>
                            
                            <button 
                                type="button"
                                onClick={(e) => handleDeleteTemplate(e, item.template_id)}
                                className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                                title="Delete Template"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default SmartTextarea;