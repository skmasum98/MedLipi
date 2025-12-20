import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { useAuth } from '../../hooks/useAuth';

const VITE_API_URL = import.meta.env.VITE_API_URL;

function GlobalStaffLogin() {
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
            // Updated route to match the backend plan from Step 1 of this phase
            const res = await fetch(`${VITE_API_URL}/auth/global-staff/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(creds)
            });
            const data = await res.json();

            if (res.ok) {
                login(data.token, data.user);
                navigate('/greception-dashboard');
            } else {
                setError(data.message || "Invalid Credentials");
            }
        } catch (e) { setError("Connection Error. Is server running?"); }
        finally { setLoading(false); }
    };

    return (
        <div className="min-h-screen bg-indigo-900 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-md w-full flex flex-col">
                
                {/* Visual Header */}
                <div className="bg-indigo-600 p-8 text-center">
                    <div className="inline-flex bg-white/20 p-4 rounded-full mb-4 text-3xl shadow-inner text-white">
                        🌍
                    </div>
                    <h2 className="text-3xl font-extrabold text-white tracking-tight">MedLipi Global</h2>
                    <p className="text-indigo-100 mt-2 text-sm opacity-90">Central Management Portal</p>
                </div>

                {/* Form Area */}
                <div className="p-8 pb-10">
                    <h3 className="text-xl font-bold text-gray-800 mb-6 text-center">Staff Sign In</h3>
                    
                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Username ID</label>
                            <input 
                                type="text" 
                                autoFocus
                                required
                                placeholder="Enter global ID..." 
                                className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition" 
                                onChange={e => setCreds({...creds, username: e.target.value})} 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Password</label>
                            <input 
                                type="password" 
                                required
                                placeholder="••••••••" 
                                className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition" 
                                onChange={e => setCreds({...creds, password: e.target.value})} 
                            />
                        </div>
                        
                        {error && (
                            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded text-sm font-medium animate-pulse">
                                ⚠️ {error}
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={loading}
                            className={`w-full py-3.5 rounded-xl font-bold text-white text-lg shadow-lg transition-transform transform active:scale-95 flex justify-center items-center gap-2 ${loading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-700 hover:bg-indigo-800'}`}
                        >
                            {loading ? "Authenticating..." : "Login Securely"}
                        </button>
                    </form>

                    <div className="mt-8 text-center pt-6 border-t border-gray-100">
                        <Link to="/login" className="text-sm font-bold text-gray-400 hover:text-indigo-600 transition-colors">
                            &larr; Switch to Doctor / Local Staff Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default GlobalStaffLogin;