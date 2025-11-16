import React, { useState } from 'react';
import { useNavigate } from 'react-router';

function Login({ setAuthToken }) {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [message, setMessage] = useState('');
    const navigate = useNavigate();
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
                // SUCCESS: Store the token and update state
                localStorage.setItem('token', data.token); 
                setAuthToken(data.token); // Update state in App.jsx
                
                setMessage('Login successful!');
                navigate('/dashboard'); // Redirect to the protected dashboard
            } else {
                setMessage(`Login failed: ${data.message || 'Invalid credentials'}`);
            }
        } catch (error) {
            setMessage('Network error. Could not connect to the server.');
            console.error('Login Error:', error);
        }
    };

    return (
        <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc' }}>
            <h2>Doctor Login</h2>
            <form onSubmit={handleSubmit}>
                <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} required /><br/><br/>
                <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} required /><br/><br/>
                <button type="submit">Login</button>
            </form>
            <p style={{ marginTop: '15px', color: message.includes('failed') || message.includes('error') ? 'red' : 'green' }}>{message}</p>
        </div>
    );
}

export default Login;