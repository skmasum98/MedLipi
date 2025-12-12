import React, { useState } from 'react';
import { useNavigate } from 'react-router'; // Corrected import
import { useAuth } from '../../hooks/useAuth';

const VITE_API_URL = import.meta.env.VITE_API_URL;

function StaffLogin() {
    const [creds, setCreds] = useState({ username: '', password: '' });
    const { login } = useAuth(); 
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch(`${VITE_API_URL}/auth/staff/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(creds)
            });
            const data = await res.json();

            if (res.ok) {
                // Login via Context (updates state)
                login(data.token, data.user); 
                
                // --- SMART REDIRECT ---
                const role = data.user.role; // Ensure backend returns role in data.user object

                if (role === 'receptionist') {
                    navigate('/reception-dashboard');
                } else if (role === 'assistant') {
                    navigate('/assistant-dashboard');
                } else {
                    // Fallback
                    alert("Unknown Staff Role");
                }
                
            } else {
                alert(data.message);
            }
        } catch (e) { alert("Network Error: Login failed"); }
        finally { setLoading(false); }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
            <div className="bg-slate-800 p-8 rounded-lg shadow-xl w-96 border border-slate-700">
                <h2 className="text-2xl font-bold text-white mb-6 text-center">Staff Portal</h2>
                <form onSubmit={handleLogin} className="space-y-4">
                    <input 
                        type="text" 
                        placeholder="Username" 
                        className="w-full p-2 rounded bg-slate-700 text-white border-none focus:ring-2 focus:ring-indigo-500 outline-none" 
                        onChange={e => setCreds({...creds, username: e.target.value})} 
                    />
                    <input 
                        type="password" 
                        placeholder="Password" 
                        className="w-full p-2 rounded bg-slate-700 text-white border-none focus:ring-2 focus:ring-indigo-500 outline-none" 
                        onChange={e => setCreds({...creds, password: e.target.value})} 
                    />
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded transition-colors disabled:opacity-50"
                    >
                        {loading ? "Verifying..." : "Login"}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default StaffLogin;