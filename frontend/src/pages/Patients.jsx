import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../hooks/useAuth';

const VITE_API_URL = import.meta.env.VITE_API_URL;

function Patients() {
    const { token } = useAuth();
    
    // Data State
    const [patients, setPatients] = useState([]);
    const [pagination, setPagination] = useState({ 
        currentPage: 1, 
        totalPages: 1, 
        total: 0,
        limit: 10 
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    // Fetch patients with useCallback to prevent unnecessary re-renders
    const fetchPatients = useCallback(async (page = 1) => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({
                page: page,
                limit: pagination.limit,
                ...(debouncedSearch && { q: debouncedSearch }),
                ...filters
            });

            // Remove empty filter values
            Object.keys(filters).forEach(key => {
                if (!filters[key]) params.delete(key);
            });

            const response = await fetch(`${VITE_API_URL}/patients?${params.toString()}`, {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const responseData = await response.json();
            setPatients(responseData.data || []);
            setPagination(prev => ({
                ...prev,
                ...responseData.pagination,
                currentPage: page
            }));
        } catch (err) {
            console.error('Error fetching patients:', err);
            setError('Failed to load patients. Please try again.');
            setPatients([]);
        } finally {
            setLoading(false);
        }
    }, [token, debouncedSearch, filters, pagination.limit]);

    // Initial fetch and when filters/debouncedSearch change
    useEffect(() => {
        fetchPatients(1);
    }, [fetchPatients]);

    // Handlers
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleReset = () => {
        setSearch('');
        setFilters({ 
            gender: '', 
            address: '', 
            diagnosis: '', 
            startDate: '', 
            endDate: '' 
        });
        setShowFilters(false);
    };

    const handlePageChange = (newPage) => {
        if (newPage > 0 && newPage <= pagination.totalPages) {
            fetchPatients(newPage);
            // Scroll to top of table
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const clearSearch = () => {
        setSearch('');
    };

    // Check if any filter is active
    const isFilterActive = Object.values(filters).some(x => x !== '') || search !== '';

    // Format date for display
    const formatDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // Calculate age from date of birth if available
    const calculateAge = (dob) => {
        if (!dob) return 'N/A';
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    // Generate page numbers for pagination
    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;
        let start = Math.max(1, pagination.currentPage - Math.floor(maxVisible / 2));
        let end = Math.min(pagination.totalPages, start + maxVisible - 1);
        
        if (end - start + 1 < maxVisible) {
            start = Math.max(1, end - maxVisible + 1);
        }
        
        for (let i = start; i <= end; i++) {
            pages.push(i);
        }
        return pages;
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Patient Directory</h1>
                            <p className="mt-2 text-gray-600">
                                Manage and view all patient records in one place
                            </p>
                        </div>
                        <Link 
                            to="/patients/new" 
                            className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200 shadow-sm"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            New Patient
                        </Link>
                    </div>
                </div>

                {/* Search and Filter Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
                    <div className="p-6">
                        {/* Search Bar */}
                        <div className="flex flex-col sm:flex-row gap-3 mb-4">
                            <div className="relative flex-1">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out"
                                    placeholder="Search patients by name, mobile, or ID..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    aria-label="Search patients"
                                />
                                {search && (
                                    <button
                                        onClick={clearSearch}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                                        aria-label="Clear search"
                                    >
                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                            
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`inline-flex items-center justify-center px-4 py-3 border rounded-lg font-medium transition-all duration-200 ${
                                    showFilters || isFilterActive
                                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                }`}
                                aria-expanded={showFilters}
                                aria-controls="filter-section"
                            >
                                <svg className={`w-5 h-5 mr-2 ${isFilterActive ? 'animate-pulse' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                </svg>
                                Filters
                                {isFilterActive && (
                                    <span className="ml-2 inline-flex items-center justify-center w-6 h-6 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-600">
                                        {Object.values(filters).filter(x => x !== '').length + (search ? 1 : 0)}
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* Advanced Filters */}
                        {showFilters && (
                            <div 
                                id="filter-section"
                                className="mt-4 pt-6 border-t border-gray-200 animate-fadeIn"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                                    {/* Gender */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Gender
                                        </label>
                                        <select
                                            name="gender"
                                            value={filters.gender}
                                            onChange={handleFilterChange}
                                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                                        >
                                            <option value="">All Genders</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>

                                    {/* Diagnosis */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Diagnosis
                                        </label>
                                        <input
                                            type="text"
                                            name="diagnosis"
                                            value={filters.diagnosis}
                                            onChange={handleFilterChange}
                                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                                            placeholder="e.g., Fever, Diabetes"
                                        />
                                    </div>

                                    {/* Address */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Address
                                        </label>
                                        <input
                                            type="text"
                                            name="address"
                                            value={filters.address}
                                            onChange={handleFilterChange}
                                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                                            placeholder="e.g., Dhaka"
                                        />
                                    </div>

                                    {/* Start Date */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            From Date
                                        </label>
                                        <input
                                            type="date"
                                            name="startDate"
                                            value={filters.startDate}
                                            onChange={handleFilterChange}
                                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                                        />
                                    </div>

                                    {/* End Date */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            To Date
                                        </label>
                                        <input
                                            type="date"
                                            name="endDate"
                                            value={filters.endDate}
                                            onChange={handleFilterChange}
                                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                                        />
                                    </div>
                                </div>

                                {/* Filter Actions */}
                                {isFilterActive && (
                                    <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                                        <div className="text-sm text-gray-600">
                                            <span className="font-medium">
                                                {Object.values(filters).filter(x => x !== '').length}
                                            </span> active filter(s)
                                        </div>
                                        <button
                                            onClick={handleReset}
                                            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                                        >
                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                            Clear All Filters
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Patients Table Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {/* Table Header */}
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-semibold text-gray-900">
                                Patients ({pagination.total})
                            </h2>
                            <div className="text-sm text-gray-500">
                                Page {pagination.currentPage} of {pagination.totalPages}
                            </div>
                        </div>
                    </div>

                    {/* Loading State */}
                    {loading ? (
                        <div className="py-16 text-center">
                            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
                            <p className="text-gray-600">Loading patients...</p>
                        </div>
                    ) : error ? (
                        <div className="py-16 text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <p className="text-gray-900 font-medium mb-2">Unable to load patients</p>
                            <p className="text-gray-600 mb-4">{error}</p>
                            <button
                                onClick={() => fetchPatients(pagination.currentPage)}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                Try Again
                            </button>
                        </div>
                    ) : patients.length === 0 ? (
                        <div className="py-16 text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <p className="text-gray-900 font-medium mb-2">No patients found</p>
                            <p className="text-gray-600 mb-4">
                                {isFilterActive 
                                    ? "Try adjusting your filters or search terms"
                                    : "Get started by adding your first patient"
                                }
                            </p>
                            {!isFilterActive && (
                                <Link
                                    to="/patients/new"
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                    Add First Patient
                                </Link>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* Table - Responsive Design */}
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Patient Details
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                                                Contact
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Demographics
                                            </th>
                                            {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                                                Last Visit
                                            </th> */}
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {patients.map((patient) => (
                                            <tr 
                                                key={patient.patient_id} 
                                                className="hover:bg-gray-50 transition-colors duration-150"
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center">
                                                        <div className="shrink-0 h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-4">
                                                            <span className="text-indigo-800 font-semibold">
                                                                {patient.name?.charAt(0) || 'P'}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {patient.name || 'Unknown'}
                                                            </div>
                                                            <div className="text-sm text-gray-500">
                                                                ID: {patient.patient_id || 'N/A'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden lg:table-cell">
                                                    <div className="space-y-1">
                                                        {patient.mobile && (
                                                            <div className="flex items-center">
                                                                <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                                </svg>
                                                                {patient.mobile}
                                                            </div>
                                                        )}
                                                        {patient.email && (
                                                            <div className="flex items-center text-gray-600">
                                                                <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                                </svg>
                                                                {patient.email}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center">
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                                                                {calculateAge(patient.dob)} yrs
                                                            </span>
                                                            <span className="text-sm text-gray-600">
                                                                {patient.gender || 'Not specified'}
                                                            </span>
                                                        </div>
                                                        {patient.address && (
                                                            <div className="text-sm text-gray-500 truncate max-w-xs">
                                                                {patient.address}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                                                    {patient.last_visit_date ? (
                                                        <div>
                                                            <div>{formatDate(patient.last_visit_date)}</div>
                                                            {patient.last_diagnosis && (
                                                                <div className="text-xs text-gray-400 truncate max-w-xs">
                                                                    {patient.last_diagnosis}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400">No visits yet</span>
                                                    )}
                                                </td> */}
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <Link
                                                        to={`/patients/${patient.patient_id}`}
                                                        className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                                                    >
                                                        View Details
                                                        <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                                        </svg>
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {pagination.totalPages > 1 && (
                                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                        <div className="text-sm text-gray-700">
                                            Showing <span className="font-semibold">
                                                {Math.min((pagination.currentPage - 1) * pagination.limit + 1, pagination.total)}
                                            </span> to <span className="font-semibold">
                                                {Math.min(pagination.currentPage * pagination.limit, pagination.total)}
                                            </span> of <span className="font-semibold">{pagination.total}</span> patients
                                        </div>
                                        
                                        <div className="flex items-center space-x-2">
                                            {/* Previous Button */}
                                            <button
                                                onClick={() => handlePageChange(pagination.currentPage - 1)}
                                                disabled={pagination.currentPage === 1}
                                                className={`inline-flex items-center px-3 py-2 border rounded-lg text-sm font-medium transition-colors duration-200 ${
                                                    pagination.currentPage === 1
                                                        ? 'border-gray-200 text-gray-400 cursor-not-allowed bg-gray-50'
                                                        : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                                                }`}
                                            >
                                                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                                </svg>
                                                Previous
                                            </button>

                                            {/* Page Numbers */}
                                            <div className="hidden md:flex items-center space-x-1">
                                                {getPageNumbers().map((pageNum) => (
                                                    <button
                                                        key={pageNum}
                                                        onClick={() => handlePageChange(pageNum)}
                                                        className={`inline-flex items-center justify-center w-10 h-10 rounded-lg text-sm font-medium transition-colors duration-200 ${
                                                            pageNum === pagination.currentPage
                                                                ? 'bg-indigo-600 text-white'
                                                                : 'text-gray-700 hover:bg-gray-100'
                                                        }`}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Mobile Page Indicator */}
                                            <div className="md:hidden text-sm font-medium text-gray-700">
                                                Page {pagination.currentPage} of {pagination.totalPages}
                                            </div>

                                            {/* Next Button */}
                                            <button
                                                onClick={() => handlePageChange(pagination.currentPage + 1)}
                                                disabled={pagination.currentPage === pagination.totalPages}
                                                className={`inline-flex items-center px-3 py-2 border rounded-lg text-sm font-medium transition-colors duration-200 ${
                                                    pagination.currentPage === pagination.totalPages
                                                        ? 'border-gray-200 text-gray-400 cursor-not-allowed bg-gray-50'
                                                        : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                                                }`}
                                            >
                                                Next
                                                <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Add custom CSS for animations */}
                <style jsx>{`
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(-10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    .animate-fadeIn {
                        animation: fadeIn 0.3s ease-out;
                    }
                `}</style>
            </div>
        </div>
    );
}

export default Patients;