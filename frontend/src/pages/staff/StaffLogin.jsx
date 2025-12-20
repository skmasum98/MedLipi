import React, { useState } from 'react';
import { useNavigate } from 'react-router'; 
import { useAuth } from '../../hooks/useAuth';

const VITE_API_URL = import.meta.env.VITE_API_URL;

function StaffLogin() {
    const [creds, setCreds] = useState({ username: '', password: '' });
    const { login } = useAuth(); 
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch(`${VITE_API_URL}/auth/staff/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(creds)
            });
            const data = await res.json();

            if (res.ok) {
                // 1. Update Context
                login(data.token, data.user); 
                
                // 2. Route by Role
                if (data.user.role === 'receptionist') {
                    navigate('/reception-dashboard');
                } else if (data.user.role === 'assistant') {
                    navigate('/assistant-dashboard');
                } else {
                    setError("Login successful, but unknown role.");
                }
                
            } else {
                setError(data.message || 'Invalid Credentials');
            }
        } catch (e) { setError("Network Error. Server might be offline."); }
        finally { setLoading(false); }
    };

    return (
        <div className="min-h-screen bg-linear-to-tr from-slate-900 to-indigo-900 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full border border-gray-100">
                
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto text-3xl shadow-sm mb-4">
                        🩺
                    </div>
                    <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Staff Portal</h2>
                    <p className="text-sm text-gray-500 mt-1">Access for Assistants & Reception</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Staff ID / Username</label>
                        <input 
                            type="text" 
                            required
                            className="w-full p-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all focus:bg-white" 
                            placeholder="Enter username..." 
                            onChange={e => setCreds({...creds, username: e.target.value})} 
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Password</label>
                        <input 
                            type="password" 
                            required
                            className="w-full p-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all focus:bg-white" 
                            placeholder="••••••••" 
                            onChange={e => setCreds({...creds, password: e.target.value})} 
                        />
                    </div>
                    
                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded text-sm animate-pulse">
                            ⚠️ {error}
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-md transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? "Verifying..." : "Login to Workspace"}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default StaffLogin;