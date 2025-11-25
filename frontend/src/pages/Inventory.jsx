import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import Modal from '../components/Modal';

const VITE_API_URL = import.meta.env.VITE_API_URL;

function Inventory() {
    const { token } = useAuth();
    
    // State
    const [drugs, setDrugs] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Modal & Edit State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDrug, setEditingDrug] = useState(null);
    const [formData, setFormData] = useState({
        generic_name: '', trade_names: '', strength: '', counseling_points: ''
    });

    // --- Search Handler ---
    // We fetch data only when searching (to avoid loading 1000s of drugs at once)
    useEffect(() => {
        if (!searchQuery) {
            setDrugs([]);
            return;
        }
        const fetchDrugs = async () => {
            setLoading(true);
            try {
                const res = await fetch(`${VITE_API_URL}/inventory/search?q=${searchQuery}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) setDrugs(await res.json());
            } catch (e) { console.error(e); } 
            finally { setLoading(false); }
        };
        
        const timer = setTimeout(fetchDrugs, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, token]);

    // --- CRUD Handlers ---
    const handleSave = async (e) => {
        e.preventDefault();
        const url = editingDrug 
            ? `${VITE_API_URL}/inventory/${editingDrug.drug_id}`
            : `${VITE_API_URL}/inventory`;
        const method = editingDrug ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                alert(`Drug ${editingDrug ? 'updated' : 'added'}!`);
                setIsModalOpen(false);
                setSearchQuery(formData.generic_name); // Trigger a refresh by setting search
                setFormData({ generic_name: '', trade_names: '', strength: '', counseling_points: '' });
                setEditingDrug(null);
            } else {
                alert('Failed to save.');
            }
        } catch (e) { alert('Network Error'); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this drug?")) return;
        try {
            const res = await fetch(`${VITE_API_URL}/inventory/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setDrugs(drugs.filter(d => d.drug_id !== id));
            } else {
                const data = await res.json();
                alert(`Error: ${data.message}`);
            }
        } catch (e) { alert('Network Error'); }
    };

    const openEdit = (drug) => {
        setEditingDrug(drug);
        setFormData(drug);
        setIsModalOpen(true);
    };

    const openCreate = () => {
        setEditingDrug(null);
        setFormData({ generic_name: '', trade_names: '', strength: '', counseling_points: '' });
        setIsModalOpen(true);
    };

    return (
        <div className="max-w-6xl mx-auto p-6 my-8 bg-white rounded-xl shadow-lg">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Drug Database</h2>
                <button onClick={openCreate} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 shadow">
                    + Add New Medicine
                </button>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
                <input 
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    type="text" 
                    placeholder="Search database to manage (type at least 2 chars)..." 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                />
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Generic Name</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Brand Names</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Strength</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? <tr><td colSpan="4" className="p-4 text-center">Searching...</td></tr> : 
                         drugs.length === 0 ? <tr><td colSpan="4" className="p-4 text-center text-gray-500">No drugs found. Try adding one.</td></tr> :
                         drugs.map(drug => (
                            <tr key={drug.drug_id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium text-gray-900">{drug.generic_name}</td>
                                <td className="px-4 py-3 text-gray-600">{drug.trade_names}</td>
                                <td className="px-4 py-3 text-gray-500">{drug.strength}</td>
                                <td className="px-4 py-3 text-center space-x-3">
                                    <button onClick={() => openEdit(drug)} className="text-indigo-600 hover:text-indigo-900 font-medium">Edit</button>
                                    <button onClick={() => handleDelete(drug.drug_id)} className="text-red-600 hover:text-red-900 font-medium">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Create/Edit Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingDrug ? "Edit Medicine" : "Add New Medicine"}>
                <form onSubmit={handleSave} className="flex flex-col gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Generic Name</label>
                        <input className="w-full p-2 border rounded-md" type="text" value={formData.generic_name} onChange={(e) => setFormData({...formData, generic_name: e.target.value})} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Brand/Trade Names</label>
                        <input className="w-full p-2 border rounded-md" type="text" value={formData.trade_names} onChange={(e) => setFormData({...formData, trade_names: e.target.value})} required placeholder="e.g., Napa, Ace" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Strength</label>
                        <input className="w-full p-2 border rounded-md" type="text" value={formData.strength} onChange={(e) => setFormData({...formData, strength: e.target.value})} placeholder="e.g., 500mg" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Default Counseling/Note</label>
                        <textarea className="w-full p-2 border rounded-md" value={formData.counseling_points} onChange={(e) => setFormData({...formData, counseling_points: e.target.value})} rows="3" placeholder="Warning messages or usage advice..." />
                    </div>
                    <div className="flex justify-end gap-3 mt-4">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-md">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-md">{editingDrug ? 'Update' : 'Add'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

export default Inventory;