import React, { useState } from 'react';

function Register() {
    const [formData, setFormData] = useState({
        full_name: '', bmdc_reg: '', degree: '', email: '', password: ''
    });
    const [message, setMessage] = useState('');
    const VITE_API_URL = import.meta.env.VITE_API_URL;

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
                setMessage('Registration successful! Please log in.');
                // Clear the form after success
                setFormData({ full_name: '', bmdc_reg: '', degree: '', email: '', password: '' });
            } else {
                setMessage(`Registration failed: ${data.message || 'Server error'}`);
            }
        } catch (error) {
            setMessage('Network error. Could not connect to the server.');
            console.error('Registration Error:', error);
        }
    };

    return (
        <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc' }}>
            <h2>Doctor Registration</h2>
            <form onSubmit={handleSubmit}>
                <input type="text" name="full_name" placeholder="Full Name" value={formData.full_name} onChange={handleChange} required /><br/><br/>
                <input type="text" name="bmdc_reg" placeholder="BMDC Reg. No." value={formData.bmdc_reg} onChange={handleChange} required /><br/><br/>
                <input type="text" name="degree" placeholder="Degree (e.g., MBBS, FCPS)" value={formData.degree} onChange={handleChange} /><br/><br/>
                <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} required /><br/><br/>
                <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} required /><br/><br/>
                <button type="submit">Register</button>
            </form>
            <p style={{ marginTop: '15px', color: message.includes('failed') ? 'red' : 'green' }}>{message}</p>
        </div>
    );
}

export default Register;