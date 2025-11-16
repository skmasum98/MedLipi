import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';

const VITE_API_URL = import.meta.env.VITE_API_URL;

function PrescriptionForm({ authToken }) {
    const [patient, setPatient] = useState({ name: '', age: '', gender: 'Male' });
    const [prescriptions, setPrescriptions] = useState([]);
    const [diagnosis, setDiagnosis] = useState('');
    const [advice, setAdvice] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);

    // --- Handlers ---
    const handlePatientChange = (e) => {
        setPatient({ ...patient, [e.target.name]: e.target.value });
    };

    const handleSearch = async (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        if (query.length < 3) return setSearchResults([]);

        try {
            const response = await fetch(`${VITE_API_URL}/inventory/search?q=${query}`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (response.ok) {
                const data = await response.json();
                setSearchResults(data);
            }
        } catch (error) {
            console.error('Search failed:', error);
        }
    };
    
    // Function to add a drug to the prescription list
    const addDrugToPrescription = (drug) => {
        const newPrescription = {
            ...drug,
            quantity: '',
            sig_instruction: '',
            duration: '',
            tempId: Date.now(), // Unique ID for React key/deletion
        };
        setPrescriptions([...prescriptions, newPrescription]);
        setSearchResults([]); // Clear search results
        setSearchQuery(''); // Clear search box
    };

    // Handler for updating a single prescription item (e.g., SIG/Quantity)
    const handlePrescriptionItemChange = (tempId, field, value) => {
        setPrescriptions(prescriptions.map(item => 
            item.tempId === tempId ? { ...item, [field]: value } : item
        ));
    };

    const removePrescriptionItem = (tempId) => {
        setPrescriptions(prescriptions.filter(item => item.tempId !== tempId));
    };

    // --- Submission ---
     const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!prescriptions.length || !patient.name) {
            alert('Please add at least one drug and patient name.');
            return;
        }

        const payload = {
            patient,
            // Only send necessary fields for prescription submission
            prescriptions: prescriptions.map(p => ({
                drug_id: p.drug_id,
                quantity: p.quantity,
                sig_instruction: p.sig_instruction,
                duration: p.duration,
                generic_name: p.generic_name, 
                strength: p.strength,
                // Include counseling points/trade names for the PDF function to save a DB call
                trade_names: p.trade_names,
                counseling_points: p.counseling_points 
            })),
            diagnosis_text: diagnosis,
            general_advice: advice,
        };
        
        try {
            const response = await fetch(`${VITE_API_URL}/prescriptions`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(payload),
            });
            
            if (response.ok) {
                // SUCCESS: PDF is coming back as a blob
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                // Get the filename from the Content-Disposition header (optional, but good)
                // const filenameMatch = response.headers.get('Content-Disposition').match(/filename="(.+)"/);
                // a.download = filenameMatch ? filenameMatch[1] : 'prescription.pdf';
                const contentDisposition = response.headers.get('Content-Disposition');

                // Check if the header exists and then try to match
                if (contentDisposition) {
                    const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                    a.download = filenameMatch ? filenameMatch[1] : 'prescription.pdf';
                } else {
                    a.download = 'prescription.pdf'; // Fallback filename
                }
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                alert('Prescription saved and PDF is downloading!');

                // Clear the form after successful generation
                setPatient({ name: '', age: '', gender: 'Male' });
                setPrescriptions([]);
                setDiagnosis('');
                setAdvice('');

            } else {
                const errorData = await response.json();
                alert(`Error: ${errorData.message || 'Failed to generate prescription.'}`);
            }
        } catch (error) {
            console.error('Submission Error:', error);
            alert('Network error. Failed to connect to API.');
        }
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '20px auto', padding: '20px', border: '1px solid #ddd' }}>
            <h2>New Patient Encounter & Prescription</h2>
            
            {/* 1. Patient Details */}
            <fieldset style={{ marginBottom: '20px' }}>
                <legend>Patient Details</legend>
                <input type="text" name="name" placeholder="Name (Required)" value={patient.name} onChange={handlePatientChange} required />
                <input type="number" name="age" placeholder="Age" value={patient.age} onChange={handlePatientChange} style={{ margin: '0 10px' }} />
                <select name="gender" value={patient.gender} onChange={handlePatientChange}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                </select>
            </fieldset>

            {/* 2. Drug Search and Add */}
            <fieldset style={{ marginBottom: '20px' }}>
                <legend>Add Medication</legend>
                <input type="text" placeholder="Search Drug Name (e.g., Napa, Amoxicillin)" value={searchQuery} onChange={handleSearch} />
                
                {searchResults.length > 0 && (
                    <ul style={{ listStyle: 'none', padding: 0, border: '1px solid #ccc', maxHeight: '200px', overflowY: 'auto' }}>
                        {searchResults.map(drug => (
                            <li key={drug.drug_id} style={{ padding: '8px', borderBottom: '1px dotted #eee', cursor: 'pointer', backgroundColor: '#f9f9f9' }}
                                onClick={() => addDrugToPrescription(drug)}>
                                <strong>{drug.generic_name}</strong> ({drug.trade_names}) - {drug.strength}
                            </li>
                        ))}
                    </ul>
                )}
            </fieldset>

            {/* 3. Prescription List */}
            <fieldset style={{ marginBottom: '20px' }}>
                <legend>Prescription List ({prescriptions.length})</legend>
                {prescriptions.map(item => (
                    <div key={item.tempId} style={{ display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid #eee', padding: '10px 0' }}>
                        <div style={{ flex: 1, fontWeight: 'bold' }}>{item.generic_name} ({item.strength})</div>
                        <input type="text" placeholder="Quantity/Packs" style={{ width: '100px' }} value={item.quantity} 
                            onChange={(e) => handlePrescriptionItemChange(item.tempId, 'quantity', e.target.value)} />
                        <input type="text" placeholder="SIG (e.g., 1+0+1)" style={{ flex: 2 }} value={item.sig_instruction} 
                            onChange={(e) => handlePrescriptionItemChange(item.tempId, 'sig_instruction', e.target.value)} />
                        <input type="text" placeholder="Duration (e.g., 7 days)" style={{ width: '120px' }} value={item.duration} 
                            onChange={(e) => handlePrescriptionItemChange(item.tempId, 'duration', e.target.value)} />
                        <button type="button" onClick={() => removePrescriptionItem(item.tempId)} style={{ background: 'red', color: 'white', border: 'none' }}>X</button>
                    </div>
                ))}
            </fieldset>
            
            {/* 4. Patient Guide/Advice */}
            <fieldset style={{ marginBottom: '20px' }}>
                <legend>Patient Guide (Instructions)</legend>
                <textarea placeholder="Diagnosis Text (e.g., Viral Fever, Sinusitis)" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} rows="2" style={{ width: '100%', marginBottom: '10px' }}></textarea>
                <textarea placeholder="General Advice (e.g., Rest well, Follow up in 3 days, Avoid cold drinks)" value={advice} onChange={(e) => setAdvice(e.target.value)} rows="4" style={{ width: '100%' }}></textarea>
            </fieldset>
            
            <button type="submit" onClick={handleSubmit} style={{ padding: '10px 20px', fontSize: '16px', background: 'green', color: 'white' }}>
                Generate Prescription & Guide
            </button>
        </div>
    );
}

export default PrescriptionForm;