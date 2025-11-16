import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router'; // Import Link for login link

function Register() {
    const [formData, setFormData] = useState({
        full_name: '', 
        bmdc_reg: '', 
        degree: '', 
        email: '', 
        password: ''
    });
    const [message, setMessage] = useState('');
    const VITE_API_URL = import.meta.env.VITE_API_URL;
    const navigate = useNavigate(); // Use navigate for redirect after successful registration

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('Registering...');

        try {
            const response = await fetch(`${VITE_API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage('Registration successful! Redirecting to login...');
                // Clear the form after success
                setFormData({ full_name: '', bmdc_reg: '', degree: '', email: '', password: '' });
                // Redirect to login after a short delay
                setTimeout(() => navigate('/login'), 1500); 
            } else {
                setMessage(`Registration failed: ${data.message || 'Server error'}`);
            }
        } catch (error) {
            setMessage('Network error. Could not connect to the server.');
            console.error('Registration Error:', error);
        }
    };

    // Determine message color
    const messageColor = message.includes('failed') || message.includes('error') ? 'text-red-500' : 'text-green-500';

    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)] bg-gray-50">
            <div className="w-full max-w-lg p-8 space-y-6 bg-white rounded-xl shadow-2xl border border-gray-200">
                <h2 className="text-3xl font-extrabold text-center text-gray-900">
                    Create a Doctor Account
                </h2>
                <p className="text-center text-sm text-gray-600">
                    Enter your professional details to get started with MedLipi.
                </p>

                <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm space-y-4">
                        {/* Full Name */}
                        <input
                            type="text" name="full_name" placeholder="Full Name" value={formData.full_name} onChange={handleChange} required
                            className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                        {/* BMDC Reg. No. */}
                        <input
                            type="text" name="bmdc_reg" placeholder="BMDC Reg. No." value={formData.bmdc_reg} onChange={handleChange} required
                            className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                        {/* Degree */}
                        <input
                            type="text" name="degree" placeholder="Degree (e.g., MBBS, FCPS)" value={formData.degree} onChange={handleChange}
                            className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                        {/* Email */}
                        <input
                            type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} required
                            className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                        {/* Password */}
                        <input
                            type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} required
                            className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                    </div>
                    
                    {/* Submission Button */}
                    <div>
                        <button
                            type="submit"
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                        >
                            Register Account
                        </button>
                    </div>
                </form>
                
                {/* Message Display */}
                <p className={`mt-4 text-center text-sm ${messageColor}`}>{message}</p>
                
                {/* Login Link */}
                <div className="text-sm text-center">
                    <span className="font-medium text-gray-600">Already have an account? </span>
                    <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                        Sign in here
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default Register;