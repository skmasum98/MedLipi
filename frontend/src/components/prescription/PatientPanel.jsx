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
            <div className="flex flex-col md:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-400">🔍</span>
                    </div>
                    <input 
                        className="w-full pl-10 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                        type="text" 
                        placeholder="Search existing patient by name..." 
                        value={patientSearchQuery} 
                        onChange={handlePatientSearch}
                    />
                    {/* Search Results Dropdown */}
                    {patientSearchResults.length > 0 && (
                        <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg max-h-60 overflow-y-auto shadow-xl mt-1 text-sm">
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
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors border border-gray-300"
                >
                    Reset / New
                </button>
            </div>

            {/* 2. General Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                
                {/* Name (4 Cols) */}
                <div className="md:col-span-4">
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Patient Name <span className="text-red-500">*</span></label>
                    <input 
                        className="w-full p-2 border border-gray-300 rounded-md focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        type="text" name="name" placeholder="Full Name" 
                        value={patient.name} onChange={handlePatientChange} required 
                    />
                </div>

                {/* Mobile (3 Cols) */}
                <div className="md:col-span-3">
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Mobile No</label>
                    <input 
                        className="w-full p-2 border border-gray-300 rounded-md focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        type="text" name="mobile" placeholder="017..." 
                        value={patient.mobile} onChange={handlePatientChange} 
                    />
                </div>

                {/* Gender (2 Cols) */}
                <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Gender</label>
                    <select 
                        className="w-full p-2 border border-gray-300 rounded-md focus:border-indigo-500 bg-white"
                        name="gender" value={patient.gender} onChange={handlePatientChange}
                    >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                    </select>
                </div>

                {/* Email (3 Cols) */}
                <div className="md:col-span-3">
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Email (Optional)</label>
                    <input 
                        className="w-full p-2 border border-gray-300 rounded-md"
                        type="email" name="email" placeholder="patient@mail.com" 
                        value={patient.email} onChange={handlePatientChange} 
                    />
                </div>
            </div>

            {/* 3. Age & DOB Section (The Polish) */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    
                    {/* Manual Age Inputs */}
                    <div className="md:col-span-6 flex gap-2">
                        <div className="flex-1">
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Years</label>
                            <input 
                                className="w-full p-2 border border-gray-300 rounded-md text-center"
                                type="number" name="ageYears" placeholder="0" 
                                value={patient.ageYears} onChange={handlePatientChange} 
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Months</label>
                            <input 
                                className="w-full p-2 border border-gray-300 rounded-md text-center"
                                type="number" name="ageMonths" placeholder="0" max="11"
                                value={patient.ageMonths} onChange={handlePatientChange} 
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Days</label>
                            <input 
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

                    {/* Date of Birth Picker */}
                    <div className="md:col-span-5">
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Date of Birth (Auto-Calculates Age)</label>
                        <input 
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
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Address</label>
                    <textarea 
                        className="w-full p-2 border border-gray-300 rounded-md h-10 resize-none focus:h-20 transition-all"
                        name="address" placeholder="Village, Post Office, District..." 
                        value={patient.address} onChange={handlePatientChange} 
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Referred By</label>
                    <input 
                        className="w-full p-2 border border-gray-300 rounded-md"
                        type="text" name="referred_by" placeholder="Dr. Name / Hospital" 
                        value={patient.referred_by} onChange={handlePatientChange} 
                    />
                </div>
            </div>

            {/* 5. History Display (Existing Logic) */}
            {patient.id && (
                <div className="mt-6 border-t pt-4">
                    {/* ... (Keep existing History display logic) ... */}
                    {/* Reuse the code from previous step here */}
                    <h4 className="font-semibold text-indigo-700 mb-2 text-sm">Patient History</h4>
                    {isHistoryLoading ? <p className="text-xs">Loading...</p> : 
                     patientHistory.length === 0 ? <p className="text-xs text-gray-500">No history.</p> :
                     <div className="max-h-32 overflow-y-auto space-y-2">
                        {patientHistory.map((visit, index) => (
                            <div key={index} className="flex justify-between items-center bg-gray-50 p-2 rounded border text-xs">
                                <span><strong>{visit.date}</strong>: {visit.diagnosis}</span>
                                <button type="button" onClick={() => handleRePrescribe(visit.prescriptions)} className="text-blue-600 hover:underline">Refill</button>
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