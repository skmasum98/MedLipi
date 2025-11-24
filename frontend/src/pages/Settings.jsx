import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

const VITE_API_URL = import.meta.env.VITE_API_URL;

function Settings() {
    const { token } = useAuth();
    const [formData, setFormData] = useState({
        full_name: '', degree: '', bmdc_reg: '',
        clinic_name: '', chamber_address: '', phone_number: '', specialist_title: ''
    });
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    // Load current profile
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await fetch(`${VITE_API_URL}/doctors/profile`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    // Pre-fill form with null checks
                    setFormData({
                        full_name: data.full_name || '',
                        degree: data.degree || '',
                        bmdc_reg: data.bmdc_reg || '', // Read-only
                        clinic_name: data.clinic_name || '',
                        chamber_address: data.chamber_address || '',
                        phone_number: data.phone_number || '',
                        specialist_title: data.specialist_title || ''
                    });
                }
            } catch (error) {
                console.error('Error loading profile:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [token]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('Saving...');
        try {
            const response = await fetch(`${VITE_API_URL}/doctors/profile`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                setMessage('Settings saved successfully!');
            } else {
                setMessage('Failed to save settings.');
            }
        } catch (error) {
            setMessage('Network error.');
        }
    };

    if (loading) return <div className="p-8 text-center">Loading settings...</div>;

    return (
        <div className="max-w-4xl mx-auto p-6 my-8 bg-white rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 pb-2 border-b">Clinic Branding & Settings</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Section 1: Personal Info */}
                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                    <h3 className="text-lg font-semibold text-indigo-800 mb-4">Doctor Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                            <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} className="w-full p-2 border rounded-md" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">BMDC Reg No (Read-only)</label>
                            <input type="text" value={formData.bmdc_reg} className="w-full p-2 border rounded-md bg-gray-200 text-gray-500" disabled />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Degrees</label>
                            <input type="text" name="degree" value={formData.degree} onChange={handleChange} className="w-full p-2 border rounded-md" placeholder="e.g. MBBS, FCPS (Medicine)" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Specialist Title</label>
                            <input type="text" name="specialist_title" value={formData.specialist_title} onChange={handleChange} className="w-full p-2 border rounded-md" placeholder="e.g. Medicine Specialist & Diabetologist" />
                        </div>
                    </div>
                </div>

                {/* Section 2: Clinic Info (For PDF Header) */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Chamber / Clinic Details (For PDF Header)</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Clinic / Chamber Name</label>
                            <input type="text" name="clinic_name" value={formData.clinic_name} onChange={handleChange} className="w-full p-2 border rounded-md" placeholder="e.g. City Care Hospital" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Address / Location</label>
                            <input type="text" name="chamber_address" value={formData.chamber_address} onChange={handleChange} className="w-full p-2 border rounded-md" placeholder="e.g. House 12, Road 5, Dhanmondi, Dhaka" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Appointment / Contact Phone</label>
                            <input type="text" name="phone_number" value={formData.phone_number} onChange={handleChange} className="w-full p-2 border rounded-md" placeholder="e.g. +880 1711..." />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button type="submit" className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-indigo-700 shadow-md transition-colors">
                        Save Changes
                    </button>
                </div>
                {message && <p className={`text-center mt-4 font-medium ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}>{message}</p>}
            </form>
        </div>
    );
}

export default Settings;