import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../hooks/useAuth';

const VITE_API_URL = import.meta.env.VITE_API_URL;

function AdminLogin() {
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
            const res = await fetch(`${VITE_API_URL}/auth/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(creds)
            });
            const data = await res.json();

            if (res.ok) {
                // Ensure auth context saves user role
                login(data.token, data.admin); 
                navigate('/admin/dashboard');
            } else {
                setError(data.message || 'Login failed. Check credentials.');
            }
        } catch (e) { 
            setError("Connection Error. Is server running?"); 
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-slate-900 to-black flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 max-w-sm w-full border border-slate-700 animate-fade-in">
                
                <div className="text-center mb-8">
                    <span className="text-4xl">🔐</span>
                    <h2 className="text-2xl font-extrabold text-white mt-4 tracking-tight">System Admin</h2>
                    <p className="text-sm text-slate-400 mt-2">Secure Gateway Access</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 tracking-wider ml-1">Admin ID</label>
                        <input 
                            type="text" 
                            className="w-full p-3 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                            placeholder="admin_username" 
                            onChange={e => setCreds({...creds, username: e.target.value})} 
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 tracking-wider ml-1">Passkey</label>
                        <input 
                            type="password" 
                            className="w-full p-3 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                            placeholder="••••••••" 
                            onChange={e => setCreds({...creds, password: e.target.value})} 
                        />
                    </div>
                    
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm p-3 rounded-lg text-center animate-pulse">
                            ⚠️ {error}
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-lg shadow-lg hover:shadow-indigo-500/30 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Authenticating...' : 'Enter System'}
                    </button>
                </form>

                <div className="mt-6 pt-6 border-t border-slate-700/50 text-center">
                    <p className="text-xs text-slate-600">
                        Unauthorized access is prohibited and monitored.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default AdminLogin;