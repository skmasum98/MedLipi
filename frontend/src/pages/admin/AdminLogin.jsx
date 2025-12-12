import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../hooks/useAuth';

const VITE_API_URL = import.meta.env.VITE_API_URL;

function AdminLogin() {
    const [creds, setCreds] = useState({ username: '', password: '' });
    const { login } = useAuth(); // We can reuse the auth context's login fn
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${VITE_API_URL}/auth/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(creds)
            });
            const data = await res.json();

            if (res.ok) {
                // Manually call login or store token.
                // Assuming useAuth context saves token and user info
                // We need to inject ROLE into context if not present.
                localStorage.setItem('adminToken', data.token); // Store separate for safety?
                // Or better, reuse main token key:
                login(data.token); 
                navigate('/admin/dashboard');
            } else {
                alert(data.message);
            }
        } catch (e) { alert("Login failed"); }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
            <div className="bg-slate-800 p-8 rounded-lg shadow-xl w-96 border border-slate-700">
                <h2 className="text-2xl font-bold text-white mb-6 text-center">Admin Console</h2>
                <form onSubmit={handleLogin} className="space-y-4">
                    <input type="text" placeholder="Username" className="w-full p-2 rounded bg-slate-700 text-white border-none" onChange={e => setCreds({...creds, username: e.target.value})} />
                    <input type="password" placeholder="Password" className="w-full p-2 rounded bg-slate-700 text-white border-none" onChange={e => setCreds({...creds, password: e.target.value})} />
                    <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded">Enter System</button>
                </form>
            </div>
        </div>
    );
}

export default AdminLogin;