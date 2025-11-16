import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth'; 
import { Link } from 'react-router'; 


function Login() { 
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [message, setMessage] = useState('');
    
    // Get the login function from context
    const { login } = useAuth(); 
    
    const VITE_API_URL = import.meta.env.VITE_API_URL;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('Logging in...');

        try {
            const response = await fetch(`${VITE_API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (response.ok) {
                // Login function from useAuth handles setting token and navigation
                login(data.token); 
                setMessage('Login successful!');
                
            } else {
                setMessage(`Login failed: ${data.message || 'Invalid credentials'}`);
            }
        } catch (error) {
            setMessage('Network error. Could not connect to the server.');
            console.error('Login Error:', error);
        }
    };

    // Determine message color
    const messageColor = message.includes('failed') || message.includes('error') ? 'text-red-500' : 'text-green-500';

    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)] bg-gray-50">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-2xl border border-gray-200">
                <h2 className="text-3xl font-extrabold text-center text-gray-900">
                    Sign in to your Doctor Account
                </h2>
                <p className="text-center text-sm text-gray-600">
                    MedLipi: Faster Prescriptions, Clearer Patient Care
                </p>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm space-y-4">
                        {/* Email Input */}
                        <div>
                            <label htmlFor="email" className="sr-only">Email address</label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                placeholder="Email address"
                                value={formData.email} 
                                onChange={handleChange}
                            />
                        </div>
                        {/* Password Input */}
                        <div>
                            <label htmlFor="password" className="sr-only">Password</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                placeholder="Password"
                                value={formData.password} 
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                    
                    {/* Submission Button */}
                    <div>
                        <button
                            type="submit"
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                        >
                            Sign In
                        </button>
                    </div>
                </form>
                
                {/* Message Display */}
                <p className={`mt-4 text-center text-sm ${messageColor}`}>{message}</p>
                
                {/* Register Link */}
                <div className="text-sm text-center">
                    <span className="font-medium text-gray-600">Don't have an account? </span>
                    <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
                        Register here
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default Login;