import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import Modal from '../../components/Modal';

const VITE_API_URL = import.meta.env.VITE_API_URL;

function StaffManager() {
    const { token } = useAuth();
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // New Staff Form State
    const [newStaff, setNewStaff] = useState({
        full_name: '', username: '', password: '', role: 'receptionist'
    });

    const fetchStaff = async () => {
        try {
            const res = await fetch(`${VITE_API_URL}/staff`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setStaffList(await res.json());
        } catch (e) { console.error(e); } 
        finally { setLoading(false); }
    };

    useEffect(() => { fetchStaff(); }, [token]);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${VITE_API_URL}/staff`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(newStaff)
            });
            if (res.ok) {
                alert('Staff Created');
                setIsModalOpen(false);
                setNewStaff({ full_name: '', username: '', password: '', role: 'receptionist' });
                fetchStaff();
            } else {
                const d = await res.json();
                alert(d.message);
            }
        } catch (e) { alert('Network Error'); }
    };

    const handleDelete = async (id) => {
        if (!confirm("Remove this staff member permanently?")) return;
        try {
            await fetch(`${VITE_API_URL}/staff/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setStaffList(staffList.filter(s => s.staff_id !== id));
        } catch (e) {}
    };

    const toggleStatus = async (id, currentStatus) => {
        const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
        try {
            await fetch(`${VITE_API_URL}/staff/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status: newStatus })
            });
            // Update UI optimistically
            setStaffList(staffList.map(s => s.staff_id === id ? { ...s, status: newStatus } : s));
        } catch (e) {}
    };

    return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 my-6 sm:my-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-8 border-b pb-4">
        <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
            Manage Staff
            </h2>
            <p className="text-gray-500 mt-1">
            Add assistants or receptionists to your clinic.
            </p>
        </div>

        <button
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto bg-indigo-600 text-white px-5 py-2 rounded-lg font-bold shadow hover:bg-indigo-700 transition"
        >
            + Add New Staff
        </button>
        </div>

        {/* Staff List */}
        <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
        
        {/* TABLE (Tablet & Desktop) */}
        <div className="overflow-x-auto hidden sm:block">
            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Username</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Actions</th>
                </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                <tr>
                    <td colSpan="5" className="p-8 text-center">Loading...</td>
                </tr>
                ) : staffList.length === 0 ? (
                <tr>
                    <td colSpan="5" className="p-8 text-center text-gray-500">
                    No staff members found.
                    </td>
                </tr>
                ) : (
                staffList.map(staff => (
                    <tr key={staff.staff_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">
                        {staff.full_name}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-600">
                        {staff.username}
                    </td>
                    <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded font-bold uppercase ${
                        staff.role === 'receptionist'
                            ? 'bg-pink-100 text-pink-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                        {staff.role}
                        </span>
                    </td>
                    <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded font-bold uppercase ${
                        staff.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                        {staff.status}
                        </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-4 whitespace-nowrap">
                        <button
                        onClick={() => toggleStatus(staff.staff_id, staff.status)}
                        className="text-xs text-indigo-600 font-bold hover:underline"
                        >
                        {staff.status === 'active' ? 'Suspend' : 'Activate'}
                        </button>
                        <button
                        onClick={() => handleDelete(staff.staff_id)}
                        className="text-xs text-red-600 font-bold hover:underline"
                        >
                        Delete
                        </button>
                    </td>
                    </tr>
                ))
                )}
            </tbody>
            </table>
        </div>

        {/* MOBILE CARDS */}
        <div className="sm:hidden divide-y">
            {loading ? (
            <p className="p-6 text-center">Loading...</p>
            ) : staffList.length === 0 ? (
            <p className="p-6 text-center text-gray-500">
                No staff members found.
            </p>
            ) : (
            staffList.map(staff => (
                <div key={staff.staff_id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                    <div>
                    <h3 className="font-bold text-gray-900">
                        {staff.full_name}
                    </h3>
                    <p className="text-xs text-gray-500 font-mono">
                        {staff.username}
                    </p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded font-bold uppercase ${
                    staff.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                    {staff.status}
                    </span>
                </div>

                <div className="flex items-center justify-between">
                    <span className={`px-2 py-1 text-xs rounded font-bold uppercase ${
                    staff.role === 'receptionist'
                        ? 'bg-pink-100 text-pink-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                    {staff.role}
                    </span>

                    <div className="flex gap-4 text-sm font-bold">
                    <button
                        onClick={() => toggleStatus(staff.staff_id, staff.status)}
                        className="text-indigo-600"
                    >
                        {staff.status === 'active' ? 'Suspend' : 'Activate'}
                    </button>
                    <button
                        onClick={() => handleDelete(staff.staff_id)}
                        className="text-red-600"
                    >
                        Delete
                    </button>
                    </div>
                </div>
                </div>
            ))
            )}
        </div>
        </div>

        {/* CREATE MODAL */}
        <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Staff Account"
        >
        <form
            onSubmit={handleCreate}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2"
        >
            <div>
            <label className="block text-sm font-medium text-gray-700">
                Full Name
            </label>
            <input
                required
                type="text"
                className="w-full p-2 border rounded"
                value={newStaff.full_name}
                onChange={(e) =>
                setNewStaff({ ...newStaff, full_name: e.target.value })
                }
            />
            </div>

            <div>
            <label className="block text-sm font-medium text-gray-700">
                Username
            </label>
            <input
                required
                type="text"
                className="w-full p-2 border rounded"
                value={newStaff.username}
                onChange={(e) =>
                setNewStaff({ ...newStaff, username: e.target.value })
                }
            />
            </div>

            <div>
            <label className="block text-sm font-medium text-gray-700">
                Password
            </label>
            <input
                required
                type="password"
                className="w-full p-2 border rounded"
                value={newStaff.password}
                onChange={(e) =>
                setNewStaff({ ...newStaff, password: e.target.value })
                }
            />
            </div>

            <div>
            <label className="block text-sm font-medium text-gray-700">
                Role
            </label>
            <select
                className="w-full p-2 border rounded bg-white"
                value={newStaff.role}
                onChange={(e) =>
                setNewStaff({ ...newStaff, role: e.target.value })
                }
            >
                <option value="receptionist">
                Receptionist (Can Register & Book)
                </option>
                <option value="assistant">
                Assistant (Can enter Vitals & History)
                </option>
            </select>
            </div>

            <div className="sm:col-span-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4">
            <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded text-gray-600 hover:bg-gray-100"
            >
                Cancel
            </button>
            <button
                type="submit"
                className="bg-indigo-600 text-white font-bold px-6 py-2 rounded hover:bg-indigo-700"
            >
                Create Account
            </button>
            </div>
        </form>
        </Modal>
    </div>
);

}

export default StaffManager;