import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';

const VITE_API_URL = import.meta.env.VITE_API_URL;

const ICD11Search = ({ onSelect }) => {
    const { token } = useAuth();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);

    // Debounce Search Logic
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (query.length < 3) {
                setResults([]);
                setShowDropdown(false);
                return;
            }

            setLoading(true);
            try {
                const res = await fetch(`${VITE_API_URL}/icd/search?q=${query}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setResults(data);
                    setShowDropdown(true);
                }
            } catch (error) {
                console.error("ICD Search Error", error);
            } finally {
                setLoading(false);
            }
        }, 500); // Wait 500ms after typing stops

        return () => clearTimeout(delayDebounceFn);
    }, [query, token]);

    const handleSelect = (item) => {
        if (onSelect) {
            onSelect({
                code: item.code,
                description: item.title
            });
        }
        setQuery(''); // Clear input
        setResults([]);
        setShowDropdown(false);
    };

    return (
        <div className="relative w-full">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
                Add Provisional Diagnosis (ICD-11)
            </label>
            
            <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Search WHO Database (e.g. Dengue, Diabetes)..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoComplete="off"
            />

            {/* Loading Indicator */}
            {loading && (
                <div className="absolute right-3 top-9 text-xs text-gray-400">
                    Searching WHO...
                </div>
            )}

            {/* Custom Dropdown - 100% Control over styles */}
            {showDropdown && results.length > 0 && (
                <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded-md shadow-xl max-h-60 overflow-y-auto mt-1">
                    {results.map((item, index) => (
                        <li 
                            key={index}
                            className="p-3 border-b border-gray-50 hover:bg-indigo-50 cursor-pointer transition-colors"
                            onClick={() => handleSelect(item)}
                        >
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-800">{item.title}</span>
                                {item.code && (
                                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded font-mono">
                                        {item.code}
                                    </span>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
            
            {showDropdown && results.length === 0 && !loading && (
                <div className="absolute z-50 w-full bg-white border border-gray-200 p-3 text-sm text-gray-500 shadow-xl mt-1 rounded-md">
                    No results found in ICD-11 database.
                </div>
            )}
        </div>
    );
};

export default ICD11Search;