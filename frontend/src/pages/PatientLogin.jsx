import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';

const VITE_API_URL = import.meta.env.VITE_API_URL;

function PatientLogin() {
    const [creds, setCreds] = useState({ patient_id: '', mobile: '' });
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        
        try {
            const res = await fetch(`${VITE_API_URL}/portal/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(creds)
            });
            const data = await res.json();
            
            if (res.ok) {
                localStorage.setItem('patientToken', data.token);
                localStorage.setItem('patientName', data.patient.name);

                // 🔁 Redirect logic
                const redirect = localStorage.getItem('redirectAfterLogin');

                if (redirect) {
                    localStorage.removeItem('redirectAfterLogin');
                    navigate(redirect);
                } else {
                    navigate('/my-health');
                }
            } else {
                setError(data.message);
            }
        } catch (e) { setError('Connection failed'); }
    };

    return (
        <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-xl shadow-xl max-w-md w-full border border-green-100">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-extrabold text-green-700">Patient Portal</h1>
                    <p className="text-gray-500 mt-2">View your prescriptions and history</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Patient ID</label>
                        <input 
                            type="number" 
                            placeholder="Enter ID from your prescription" 
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                            required 
                            onChange={(e) => setCreds({...creds, patient_id: e.target.value})}
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                        <input 
                            type="text" 
                            placeholder="Registered Mobile Number" 
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                            required 
                            onChange={(e) => setCreds({...creds, mobile: e.target.value})}
                        />
                    </div>

                    {error && <p className="text-red-500 text-sm text-center bg-red-50 p-2 rounded">{error}</p>}

                    <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors shadow-md">
                        Login to View Records
                    </button>
                </form>
                <div className="mt-6 text-center text-sm text-gray-600">
                    New Patient? <Link to="/patient/register" className="text-green-700 font-bold hover:underline">Register here</Link>
                </div>
                
                <div className="mt-6 text-center text-xs text-gray-400">
                    <p>Powered by MedLipi</p>
                </div>
            </div>
        </div>
    );
}

export default PatientLogin;