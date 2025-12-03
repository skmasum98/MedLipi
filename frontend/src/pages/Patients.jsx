import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../hooks/useAuth';

const VITE_API_URL = import.meta.env.VITE_API_URL;

function Patients() {
    const { token } = useAuth();
    
    // Data State
    const [patients, setPatients] = useState([]);
    const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, total: 0 });
    const [loading, setLoading] = useState(false);

    // Search & Filter State
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState({ 
        gender: '', 
        address: '', 
        diagnosis: '',
        startDate: '',
        endDate: '' 
    });
    const [showFilters, setShowFilters] = useState(false); 

    // --- Fetch Function ---
    const fetchPatients = async (page = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page,
                limit: 10,
                q: search,
                ...filters
            });

            Object.keys(filters).forEach(key => {
                if (!filters[key]) params.delete(key);
            });

            const res = await fetch(`${VITE_API_URL}/patients?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const responseData = await res.json();
                setPatients(responseData.data);
                setPagination(responseData.pagination);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Debounced Search Effect
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchPatients(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [search, filters]); 

    // --- Handlers ---
    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    // --- NEW: Reset Handler ---
    const handleReset = () => {
        setSearch(''); // Clear main search
        setFilters({ gender: '', address: '', diagnosis: '', startDate: '', endDate: '' }); // Clear all filters
        // useEffect will automatically trigger fetchPatients(1) because states changed
    };

    const handlePageChange = (newPage) => {
        if (newPage > 0 && newPage <= pagination.totalPages) {
            fetchPatients(newPage);
        }
    };

    // Check if any filter is active (to visually highlight the button or show badge)
    const isFilterActive = Object.values(filters).some(x => x !== '') || search !== '';

    return (
        <div className="max-w-6xl mx-auto p-6 my-8">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-gray-800">Patient Directory</h2>
                <Link to="/prescription/new" className="bg-indigo-600 text-white px-5 py-2 rounded-lg shadow hover:bg-indigo-700 transition font-medium">
                    + New Patient
                </Link>
            </div>

            {/* --- SEARCH & FILTER BAR --- */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <input 
                            className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                            type="text" 
                            placeholder="Search by Name or Mobile Number..." 
                            value={search} onChange={(e) => setSearch(e.target.value)} 
                        />
                        <span className="absolute left-3 top-3.5 text-gray-400">🔍</span>
                        
                        {/* 'X' button inside search bar to clear just text */}
                        {search && (
                            <button 
                                onClick={() => setSearch('')}
                                className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                    
                    <button 
                        onClick={() => setShowFilters(!showFilters)}
                        className={`px-4 py-2 border rounded-lg flex items-center gap-2 transition ${showFilters || Object.values(filters).some(x=>x) ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                    >
                        <span>Filter</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
                    </button>
                </div>

                {/* Advanced Filters */}
                {showFilters && (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mt-4 pt-4 border-t border-gray-100 animate-fade-in relative">
                        
                        {/* Gender */}
                        <div className="md:col-span-2">
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Gender</label>
                            <select name="gender" value={filters.gender} onChange={handleFilterChange} className="w-full p-2 border rounded-md text-sm bg-white">
                                <option value="">All</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        {/* Date Range */}
                        <div className="md:col-span-4 flex gap-2">
                            <div className="flex-1">
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Visit From</label>
                                <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="w-full p-2 border rounded-md text-sm text-gray-600" />
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Visit To</label>
                                <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="w-full p-2 border rounded-md text-sm text-gray-600" />
                            </div>
                        </div>

                        {/* Diagnosis */}
                        <div className="md:col-span-3">
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Disease / Diagnosis</label>
                            <input type="text" name="diagnosis" value={filters.diagnosis} onChange={handleFilterChange} className="w-full p-2 border rounded-md text-sm" placeholder="e.g. Fever" />
                        </div>

                        {/* Address */}
                        <div className="md:col-span-3">
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Address</label>
                            <input type="text" name="address" value={filters.address} onChange={handleFilterChange} className="w-full p-2 border rounded-md text-sm" placeholder="e.g. Dhaka" />
                        </div>

                        {/* --- CLEAR BUTTON --- */}
                        {isFilterActive && (
                            <div className="md:col-span-12 flex justify-end mt-2">
                                <button 
                                    onClick={handleReset}
                                    className="text-sm text-red-600 hover:text-red-800 flex items-center gap-1 font-medium bg-red-50 hover:bg-red-100 px-3 py-1 rounded transition-colors"
                                >
                                    <span>✕</span> Clear All Filters
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* --- TABLE (Keep Existing) --- */}
            <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Age / Gender</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan="5" className="p-8 text-center text-gray-500">Loading directory...</td></tr>
                        ) : patients.length === 0 ? (
                            <tr><td colSpan="5" className="p-8 text-center text-gray-500">No patients found.</td></tr>
                        ) : (
                            patients.map(p => (
                                <tr key={p.patient_id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{p.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-600 text-sm">{p.mobile || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-600 text-sm">
                                        <span className="bg-gray-100 px-2 py-1 rounded text-xs">{p.age || 'N/A'}</span>
                                        <span className="ml-2">{p.gender}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm truncate max-w-[150px]">{p.address || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <Link to={`/patients/${p.patient_id}`} className="text-indigo-600 hover:text-indigo-900 font-semibold">
                                            View History &rarr;
                                        </Link>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                
                {/* --- PAGINATION (Keep Existing) --- */}
                {!loading && patients.length > 0 && (
                    <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
                        <span className="text-sm text-gray-700">
                            Showing page <span className="font-bold">{pagination.currentPage}</span> of <span className="font-bold">{pagination.totalPages}</span> 
                            <span className="text-gray-500 ml-1">({pagination.total} Total)</span>
                        </span>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => handlePageChange(pagination.currentPage - 1)}
                                disabled={pagination.currentPage === 1}
                                className={`px-3 py-1 rounded border text-sm ${pagination.currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white hover:bg-gray-100 text-gray-700'}`}
                            >
                                Previous
                            </button>
                            <button 
                                onClick={() => handlePageChange(pagination.currentPage + 1)}
                                disabled={pagination.currentPage === pagination.totalPages}
                                className={`px-3 py-1 rounded border text-sm ${pagination.currentPage === pagination.totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white hover:bg-gray-100 text-gray-700'}`}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Patients;