import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../hooks/useAuth';

const VITE_API_URL = import.meta.env.VITE_API_URL;

function Patients() {
    const { token } = useAuth();
    const [patients, setPatients] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchPatients = async () => {
            setLoading(true);
            try {
                // Default fetch (can add pagination logic later)
                const res = await fetch(`${VITE_API_URL}/patients?q=${search}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setPatients(data.data);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        const timer = setTimeout(fetchPatients, 400); // Debounce
        return () => clearTimeout(timer);
    }, [search, token]);

    return (
        <div className="max-w-6xl mx-auto p-6 my-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Patient Directory</h2>
                <Link to="/prescription/new" className="bg-indigo-600 text-white px-4 py-2 rounded-md shadow hover:bg-indigo-700">
                    + New Patient
                </Link>
            </div>

            <div className="mb-6">
                <input 
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    type="text" placeholder="Search by Name..." 
                    value={search} onChange={(e) => setSearch(e.target.value)} 
                />
            </div>

            <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Age / Gender</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Visit</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan="4" className="p-6 text-center text-gray-500">Loading...</td></tr>
                        ) : patients.length === 0 ? (
                            <tr><td colSpan="4" className="p-6 text-center text-gray-500">No patients found.</td></tr>
                        ) : (
                            patients.map(p => (
                                <tr key={p.patient_id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{p.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">{p.age} Y / {p.gender}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                        {new Date(p.last_visit).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <Link to={`/patients/${p.patient_id}`} className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 px-3 py-1 rounded-full">
                                            View Record
                                        </Link>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default Patients;