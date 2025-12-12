import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Link } from 'react-router';

const VITE_API_URL = import.meta.env.VITE_API_URL;

function AdminDashboard() {
    const { token, logout } = useAuth(); // Assume token works for admin
    const [stats, setStats] = useState({ doctors: 0, patients: 0, prescriptions: 0 });
    const [doctors, setDoctors] = useState([]);

    const loadData = async () => {
        try {
            const resStats = await fetch(`${VITE_API_URL}/admin/stats`, { headers: { 'Authorization': `Bearer ${token}` }});
            if(resStats.ok) setStats(await resStats.json());

            const resDocs = await fetch(`${VITE_API_URL}/admin/doctors`, { headers: { 'Authorization': `Bearer ${token}` }});
            if(resDocs.ok) setDoctors(await resDocs.json());
        } catch (e) {}
    };

    useEffect(() => { loadData(); }, [token]);

    const toggleStatus = async (id, currentStatus) => {
        const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
        if(!confirm(`Mark doctor as ${newStatus}?`)) return;

        await fetch(`${VITE_API_URL}/admin/doctors/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ status: newStatus })
        });
        loadData();
    };

    return (
        <div className="min-h-screen bg-slate-100 font-sans">
            <nav className="bg-slate-900 text-white p-4 flex justify-between">
                <span className="font-bold text-xl">MedLipi Admin</span>
                <Link to="/staff-manager" className="text-white hover:text-gray-300">Staff</Link>
                <button onClick={logout} className="text-sm bg-red-600 px-3 py-1 rounded">Logout</button>

            </nav>

            <div className="p-8 max-w-7xl mx-auto">
                
                {/* Stats Cards */}
                <div className="grid grid-cols-3 gap-6 mb-8">
                    <Card title="Doctors" count={stats.doctors} color="bg-blue-600" />
                    <Card title="Patients" count={stats.patients} color="bg-green-600" />
                    <Card title="Total Rx" count={stats.prescriptions} color="bg-purple-600" />
                </div>

                {/* Doctor Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <h3 className="text-lg font-bold p-4 border-b">Registered Doctors</h3>
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase">Name</th>
                                <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase">Email / BMDC</th>
                                <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                                <th className="p-4 text-right text-xs font-bold text-gray-500 uppercase">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {doctors.map(doc => (
                                <tr key={doc.doctor_id} className="hover:bg-slate-50">
                                    <td className="p-4 font-medium">{doc.full_name}</td>
                                    <td className="p-4 text-gray-500 text-sm">
                                        <div>{doc.email}</div>
                                        <div className="text-xs">{doc.bmdc_reg}</div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${doc.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {doc.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <button 
                                            onClick={() => toggleStatus(doc.doctor_id, doc.status)}
                                            className="text-indigo-600 hover:underline text-sm font-bold"
                                        >
                                            {doc.status === 'active' ? 'Suspend' : 'Activate'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

            </div>
        </div>
    );
}

const Card = ({ title, count, color }) => (
    <div className={`${color} text-white rounded-lg p-6 shadow-md`}>
        <div className="text-sm opacity-75 uppercase font-bold">{title}</div>
        <div className="text-4xl font-extrabold mt-2">{count}</div>
    </div>
);

export default AdminDashboard;