import React, { useState, useEffect, useRef } from 'react';

function PatientPanel({ 
    patient, handlePatientChange, 
    patientSearchQuery, handlePatientSearch, 
    patientSearchResults, selectPatient, 
    patientHistory, isHistoryLoading, handleRePrescribe,
    setPatient, setPatientHistory, setPatientSearchQuery 
}) {
    const [showResults, setShowResults] = useState(false);
    const searchRef = useRef(null);

    // Auto-show results when search results update
    useEffect(() => {
        if (patientSearchResults && patientSearchResults.length > 0) {
            setShowResults(true);
        } else {
            setShowResults(false);
        }
    }, [patientSearchResults]);

    // Handle click outside to close dropdown
    useEffect(() => {
        function handleClickOutside(event) {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowResults(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [searchRef]);


    return (
        <fieldset className="p-5 border border-gray-200 rounded-xl mb-6 bg-white shadow-sm overflow-visible z-20 relative">
            <legend className="text-lg font-bold text-indigo-700 px-2 flex items-center gap-2">
                👤 Patient Details
            </legend>
            
            {/* 1. Search Bar */}
            <div className="flex flex-col md:flex-row gap-3 mb-6 relative z-50">
                <div className="flex-1 relative" ref={searchRef}>
                    <label htmlFor="patient-search" className="sr-only">Search Patient</label>
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-400">🔍</span>
                    </div>
                    <input 
                        id="patient-search"
                        name="patient-search"
                        className="w-full pl-10 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                        type="text" 
                        placeholder="Search existing patient by name or phone..." 
                        value={patientSearchQuery} 
                        onChange={(e) => {
                            // Call parent handler
                            handlePatientSearch(e); 
                            // Ensure UI knows we are typing
                            if(e.target.value.length > 0) setShowResults(true);
                        }}
                        autoComplete="off"
                        onFocus={() => { if(patientSearchResults.length > 0) setShowResults(true); }}
                    />
                    
                    {/* Search Results Dropdown */}
                    {showResults && patientSearchResults.length > 0 && (
                        <div className="absolute z-50 top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden ring-1 ring-black ring-opacity-5">
                            <ul className="max-h-60 overflow-y-auto">
                                {patientSearchResults.map(p => (
                                    <li 
                                        key={p.patient_id} 
                                        className="p-3 border-b border-gray-100 hover:bg-indigo-50 cursor-pointer flex justify-between items-center group transition-colors"
                                        onClick={() => {
                                            selectPatient(p);
                                            setShowResults(false);
                                        }}
                                        role="button" // Accessibility hint
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-gray-800 group-hover:text-indigo-700">{p.name}</span>
                                            <span className="text-xs text-gray-500">{p.mobile || 'No Mobile'}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] bg-gray-100 px-2 py-1 rounded text-gray-500 font-bold block mb-0.5">
                                                ID: {p.patient_id}
                                            </span>
                                            <span className="text-[10px] text-gray-400">{p.gender}, {p.age}</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
                
                <button 
                    type="button"
                    onClick={() => {
                        setPatient({ 
                            name: '', gender: 'Male', id: null, dob: '', 
                            ageYears: '', ageMonths: '', ageDays: '', mobile: '', email: '', address: '', referred_by: ''
                        });
                        setPatientHistory([]);
                        setPatientSearchQuery('');
                        setShowResults(false);
                    }}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors border border-gray-300 h-[42px]"
                >
                    Reset
                </button>
            </div>

            {/* 2. General Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* ... (The Rest of Your Inputs - No changes needed except fixing autocomplete="off") ... */}
                
                {/* Example fixed Input */}
                <div className="md:col-span-4">
                    <label htmlFor="patient-name" className="block text-xs font-semibold text-gray-500 uppercase mb-1">Patient Name <span className="text-red-500">*</span></label>
                    <input 
                        id="patient-name"
                        className="w-full p-2 border border-gray-300 rounded-md focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        type="text" name="name" placeholder="Full Name" 
                        value={patient.name} onChange={handlePatientChange} required 
                        autoComplete="off"
                    />
                </div>
                
                <div className="md:col-span-3">
                    <label htmlFor="patient-mobile" className="block text-xs font-semibold text-gray-500 uppercase mb-1">Mobile No</label>
                    <input 
                        id="patient-mobile"
                        className="w-full p-2 border border-gray-300 rounded-md focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        type="text" name="mobile" placeholder="017..." 
                        value={patient.mobile} onChange={handlePatientChange} 
                        autoComplete="off"
                    />
                </div>
                
                 {/* ... (Paste your Gender, Email inputs here - ensure IDs are unique) ... */}
                 
                <div className="md:col-span-2">
                    <label htmlFor="patient-gender" className="block text-xs font-semibold text-gray-500 uppercase mb-1">Gender</label>
                    <select 
                        id="patient-gender"
                        className="w-full p-2 border border-gray-300 rounded-md focus:border-indigo-500 bg-white"
                        name="gender" value={patient.gender} onChange={handlePatientChange}
                    >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                    </select>
                </div>

                <div className="md:col-span-3">
                    <label htmlFor="patient-email" className="block text-xs font-semibold text-gray-500 uppercase mb-1">Email</label>
                    <input 
                        id="patient-email"
                        className="w-full p-2 border border-gray-300 rounded-md"
                        type="email" name="email" placeholder="Email"
                        value={patient.email} onChange={handlePatientChange} 
                        autoComplete="off"
                    />
                </div>

            </div>

             {/* ... Age Section & Address Section ... */}
             <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                 {/* (Age Logic from previous code - Make sure IDs match labels) */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    
                    {/* Manual Age Inputs */}
                    <div className="md:col-span-6 flex gap-2">
                        <div className="flex-1">
                            <label htmlFor="age-years" className="block text-xs font-semibold text-gray-500 uppercase mb-1">Years</label>
                            <input id="age-years" className="w-full p-2 border border-gray-300 rounded-md text-center" type="number" name="ageYears" placeholder="0" value={patient.ageYears} onChange={handlePatientChange} />
                        </div>
                        <div className="flex-1">
                            <label htmlFor="age-months" className="block text-xs font-semibold text-gray-500 uppercase mb-1">Months</label>
                            <input id="age-months" className="w-full p-2 border border-gray-300 rounded-md text-center" type="number" name="ageMonths" placeholder="0" max="11" value={patient.ageMonths} onChange={handlePatientChange} />
                        </div>
                        <div className="flex-1">
                            <label htmlFor="age-days" className="block text-xs font-semibold text-gray-500 uppercase mb-1">Days</label>
                            <input id="age-days" className="w-full p-2 border border-gray-300 rounded-md text-center" type="number" name="ageDays" placeholder="0" max="31" value={patient.ageDays} onChange={handlePatientChange} />
                        </div>
                    </div>
                    
                    <div className="md:col-span-1 flex justify-center pb-3 text-gray-400 font-bold text-xs">OR</div>

                    <div className="md:col-span-5">
                        <label htmlFor="patient-dob" className="block text-xs font-semibold text-gray-500 uppercase mb-1">Date of Birth</label>
                        <input id="patient-dob" className="w-full p-2 border border-gray-300 rounded-md cursor-pointer" type="date" name="dob" value={patient.dob} onChange={handlePatientChange} />
                    </div>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                 <div>
                    <label htmlFor="patient-address" className="block text-xs font-semibold text-gray-500 uppercase mb-1">Address</label>
                    <textarea 
                        id="patient-address"
                        autoComplete="off" // Fixed Typo
                        className="w-full p-2 border border-gray-300 rounded-md h-10 resize-none focus:h-20 transition-all"
                        name="address" placeholder="Address..." 
                        value={patient.address} onChange={handlePatientChange} 
                    />
                </div>
                <div>
                    <label htmlFor="patient-referral" className="block text-xs font-semibold text-gray-500 uppercase mb-1">Referred By</label>
                    <input id="patient-referral" className="w-full p-2 border border-gray-300 rounded-md" type="text" name="referred_by" placeholder="Referral" value={patient.referred_by} onChange={handlePatientChange} autoComplete="off" />
                </div>
             </div>


            {/* 5. History Display */}
            {patient.id && (
                <div className="mt-6 border-t pt-4">
                    <h4 className="font-semibold text-indigo-700 mb-2 text-sm flex items-center gap-2">
                        <span>📜</span> Patient History
                    </h4>
                    {isHistoryLoading ? <div className="text-xs text-gray-500 flex gap-2"><div className="animate-spin w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full"></div> Loading...</div> : 
                     patientHistory.length === 0 ? <p className="text-xs text-gray-500 italic">No past prescriptions found.</p> :
                     <div className="max-h-40 overflow-y-auto space-y-2 pr-1 custom-scrollbar border border-gray-100 rounded bg-gray-50/50 p-2">
                        {patientHistory.map((visit, index) => (
                            <div key={index} className="flex justify-between items-center bg-white p-2.5 rounded shadow-sm border border-gray-200 hover:border-indigo-300 transition-colors text-xs">
                                <div className="flex gap-3 items-center">
                                    <span className="font-mono font-bold text-gray-700 bg-gray-100 px-1.5 rounded">{visit.date}</span>
                                    <span className="text-gray-600 truncate max-w-[200px]" title={visit.diagnosis}>
                                        {visit.diagnosis || <span className="text-gray-400 italic">No Diagnosis</span>}
                                    </span>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={() => handleRePrescribe(visit.prescriptions)} 
                                    className="text-white bg-indigo-500 hover:bg-indigo-600 px-3 py-1 rounded font-medium flex items-center gap-1 transition-all"
                                >
                                    <span>↻</span> Refill
                                </button>
                            </div>
                        ))}
                     </div>
                    }
                </div>
            )}
        </fieldset>
    );
}

export default PatientPanel;