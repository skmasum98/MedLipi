import React from 'react';

function PatientPanel({ 
    patient, handlePatientChange, 
    patientSearchQuery, handlePatientSearch, 
    patientSearchResults, selectPatient, 
    patientHistory, isHistoryLoading, handleRePrescribe,
    setPatient, setPatientHistory, setPatientSearchQuery 
}) {
    return (
        <fieldset className="p-5 border border-gray-200 rounded-xl mb-6 bg-white shadow-sm">
            <legend className="text-lg font-bold text-indigo-700 px-2 flex items-center gap-2">
                👤 Patient Details
            </legend>
            
            {/* 1. Search Bar */}
            <div className="flex flex-col md:flex-row gap-3 mb-6 relative">
                <div className="flex-1 relative">
                    <label htmlFor="patient-search" className="sr-only">Search Patient</label>
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-400">🔍</span>
                    </div>
                    <input 
                        id="patient-search"
                        name="patient-search"
                        className="w-full pl-10 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                        type="text" 
                        placeholder="Search existing patient by name..." 
                        value={patientSearchQuery} 
                        onChange={handlePatientSearch}
                        autoComplete="off"
                    />
                    
                    {/* Search Results Dropdown */}
                    {patientSearchResults.length > 0 && (
                        <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg max-h-60 overflow-y-auto shadow-xl mt-1 text-sm left-0">
                            {patientSearchResults.map(p => (
                                <li key={p.patient_id} 
                                    className="p-3 border-b border-gray-100 cursor-pointer hover:bg-indigo-50 transition-colors flex justify-between"
                                    onClick={() => selectPatient(p)}
                                >
                                    <div>
                                        <strong className="text-gray-800 block">{p.name}</strong>
                                        <span className="text-gray-500 text-xs">{p.mobile}</span>
                                    </div>
                                    <span className="text-indigo-600 font-medium text-xs bg-indigo-100 px-2 py-1 rounded-full h-fit">
                                        {p.age} Y / {p.gender}
                                    </span>
                                </li>
                            ))}
                        </ul>
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
                    }}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors border border-gray-300 h-full min-h-[42px]"
                >
                    Reset / New
                </button>
            </div>

            {/* 2. General Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                
                {/* Name */}
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

                {/* Mobile */}
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

                {/* Gender */}
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

                {/* Email */}
                <div className="md:col-span-3">
                    <label htmlFor="patient-email" className="block text-xs font-semibold text-gray-500 uppercase mb-1">Email (Optional)</label>
                    <input 
                        id="patient-email"
                        className="w-full p-2 border border-gray-300 rounded-md"
                        type="email" name="email" placeholder="patient@mail.com" 
                        value={patient.email} onChange={handlePatientChange} 
                        autoComplete="off"
                    />
                </div>
            </div>

            {/* 3. Age & DOB Section */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    
                    {/* Manual Age Inputs */}
                    <div className="md:col-span-6 flex gap-2">
                        <div className="flex-1">
                            <label htmlFor="age-years" className="block text-xs font-semibold text-gray-500 uppercase mb-1">Years</label>
                            <input 
                                id="age-years"
                                className="w-full p-2 border border-gray-300 rounded-md text-center"
                                type="number" name="ageYears" placeholder="0" 
                                value={patient.ageYears} onChange={handlePatientChange} 
                            />
                        </div>
                        <div className="flex-1">
                            <label htmlFor="age-months" className="block text-xs font-semibold text-gray-500 uppercase mb-1">Months</label>
                            <input 
                                id="age-months"
                                className="w-full p-2 border border-gray-300 rounded-md text-center"
                                type="number" name="ageMonths" placeholder="0" max="11"
                                value={patient.ageMonths} onChange={handlePatientChange} 
                            />
                        </div>
                        <div className="flex-1">
                            <label htmlFor="age-days" className="block text-xs font-semibold text-gray-500 uppercase mb-1">Days</label>
                            <input 
                                id="age-days"
                                className="w-full p-2 border border-gray-300 rounded-md text-center"
                                type="number" name="ageDays" placeholder="0" max="31"
                                value={patient.ageDays} onChange={handlePatientChange} 
                            />
                        </div>
                    </div>

                    {/* OR Divider */}
                    <div className="md:col-span-1 flex justify-center pb-3 text-gray-400 font-bold text-xs">
                        OR
                    </div>

                    {/* DOB Picker */}
                    <div className="md:col-span-5">
                        <label htmlFor="patient-dob" className="block text-xs font-semibold text-gray-500 uppercase mb-1">Date of Birth</label>
                        <input 
                            id="patient-dob"
                            className="w-full p-2 border border-gray-300 rounded-md cursor-pointer"
                            type="date" name="dob" 
                            value={patient.dob} onChange={handlePatientChange} 
                        />
                    </div>
                </div>
            </div>

            {/* 4. Address & Referral */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                    <label htmlFor="patient-address" className="block text-xs font-semibold text-gray-500 uppercase mb-1">Address</label>
                    <textarea 
                        id="patient-address"
                        autocomplete="off"
                        className="w-full p-2 border border-gray-300 rounded-md h-10 resize-none focus:h-20 transition-all"
                        name="address" placeholder="Village, Post Office, District..." 
                        value={patient.address} onChange={handlePatientChange} 
                    />
                </div>
                <div>
                    <label htmlFor="patient-referral" className="block text-xs font-semibold text-gray-500 uppercase mb-1">Referred By</label>
                    <input 
                        id="patient-referral"
                        className="w-full p-2 border border-gray-300 rounded-md"
                        type="text" name="referred_by" placeholder="Dr. Name / Hospital" 
                        value={patient.referred_by} onChange={handlePatientChange} 
                        autoComplete="off"
                    />
                </div>
            </div>

            {/* 5. History Display */}
            {patient.id && (
                <div className="mt-6 border-t pt-4">
                    <h4 className="font-semibold text-indigo-700 mb-2 text-sm">Patient History</h4>
                    {isHistoryLoading ? <p className="text-xs text-gray-500">Loading history...</p> : 
                     patientHistory.length === 0 ? <p className="text-xs text-gray-500 italic">No past prescriptions found.</p> :
                     <div className="max-h-32 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                        {patientHistory.map((visit, index) => (
                            <div key={index} className="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-100 hover:bg-gray-100 transition text-xs">
                                <div className="flex gap-2">
                                    <span className="font-bold text-gray-700">{visit.date}</span>
                                    <span className="text-gray-500 truncate max-w-[150px]">{visit.diagnosis || 'No Dx'}</span>
                                </div>
                                <button type="button" onClick={() => handleRePrescribe(visit.prescriptions)} className="text-indigo-600 font-bold hover:underline">
                                    Refill Rx ↻
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