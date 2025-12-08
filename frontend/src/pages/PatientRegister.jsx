import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router';

const VITE_API_URL = import.meta.env.VITE_API_URL;

function PatientRegister() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ name: '', mobile: '', age: '', gender: 'Male', address: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch(`${VITE_API_URL}/portal/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            
            const data = await res.json();

            if (res.ok) {
                // Success! Store token
                localStorage.setItem('patientToken', data.token);
                localStorage.setItem('patientName', data.patient.name);
                
                // Alert the user their ID (Crucial step!)
                alert(`Registration Successful!\n\nIMPORTANT: Your Patient ID is: ${data.patient.id}\n\nPlease save this ID to login in the future.`);
                
                navigate('/my-health');
            } else {
                setError(data.message);
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-xl shadow-xl max-w-md w-full border border-green-100">
                <div className="text-center mb-6">
                    <h1 className="text-3xl font-extrabold text-green-700">Patient Registration</h1>
                    <p className="text-gray-500 mt-2">Create an account to book appointments</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name</label>
                        <input type="text" name="name" required className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 outline-none" onChange={handleChange} />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mobile Number</label>
                        <input type="text" name="mobile" required placeholder="017..." className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 outline-none" onChange={handleChange} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Age</label>
                            <input type="number" name="age" className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 outline-none" onChange={handleChange} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Gender</label>
                            <select name="gender" className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 outline-none bg-white" onChange={handleChange}>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Address</label>
                        <textarea name="address" rows="2" className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 outline-none" onChange={handleChange}></textarea>
                    </div>

                    {error && <div className="text-red-600 text-sm bg-red-50 p-2 rounded text-center">{error}</div>}

                    <button disabled={loading} type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors shadow-md disabled:bg-gray-400">
                        {loading ? 'Creating Account...' : 'Register'}
                    </button>
                </form>
                
                <div className="mt-6 text-center text-sm text-gray-600">
                    Already registered? <Link to="/patient/login" className="text-green-700 font-bold hover:underline">Login here</Link>
                </div>
            </div>
        </div>
    );
}

export default PatientRegister;