import React, { useState, useEffect } from 'react';
import Modal from '../../../components/Modal';

const VITE_API_URL = import.meta.env.VITE_API_URL;

const GlobalStaffManager = ({ token }) => {
    const [staff, setStaff] = useState([]);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newStaff, setNewStaff] = useState({ full_name: '', username: '', password: '' });

    const fetchStaff = async () => {
        const res = await fetch(`${VITE_API_URL}/admin/global-staff`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) setStaff(await res.json());
    };

    useEffect(() => { fetchStaff(); }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        const res = await fetch(`${VITE_API_URL}/admin/global-staff`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(newStaff)
        });
        if (res.ok) { alert('Created!'); setIsCreateOpen(false); fetchStaff(); setNewStaff({full_name:'',username:'',password:''}); }
        else alert('Failed');
    };

    const handleDelete = async (id) => {
        if(!confirm('Delete this user?')) return;
        await fetch(`${VITE_API_URL}/admin/global-staff/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        fetchStaff();
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Global Reception Team</h2>
                <button onClick={() => setIsCreateOpen(true)} className="bg-green-600 text-white px-5 py-2 rounded-lg font-bold shadow hover:bg-green-500">
                    + Add New Staff
                </button>
            </div>

            <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
                <table className="w-full text-left">
                    <thead className="bg-gray-700/50 text-xs uppercase text-gray-400">
                        <tr>
                            <th className="p-4">Name</th>
                            <th className="p-4">Username</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700 text-sm text-gray-200">
                        {staff.map(s => (
                            <tr key={s.staff_id}>
                                <td className="p-4 font-bold">{s.full_name}</td>
                                <td className="p-4 font-mono">{s.username}</td>
                                <td className="p-4"><span className="bg-green-900 text-green-300 px-2 py-1 rounded text-xs uppercase">{s.status}</span></td>
                                <td className="p-4 text-right"><button onClick={() => handleDelete(s.staff_id)} className="text-red-400 hover:text-white">Delete</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create Global Receptionist">
                <form onSubmit={handleCreate} className="space-y-4 mt-2">
                    <input className="w-full p-2 border rounded" placeholder="Full Name" value={newStaff.full_name} onChange={e=>setNewStaff({...newStaff, full_name: e.target.value})} required />
                    <input className="w-full p-2 border rounded" placeholder="Username" value={newStaff.username} onChange={e=>setNewStaff({...newStaff, username: e.target.value})} required />
                    <input className="w-full p-2 border rounded" type="password" placeholder="Password" value={newStaff.password} onChange={e=>setNewStaff({...newStaff, password: e.target.value})} required />
                    <div className="flex justify-end pt-2"><button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded font-bold">Create</button></div>
                </form>
            </Modal>
        </div>
    );
};
export default GlobalStaffManager;