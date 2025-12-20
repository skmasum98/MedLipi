import React, { useState } from 'react';
import Modal from '../../../components/Modal'; // Using your shared UI Modal

const CreateDoctorModal = ({ isOpen, onClose, onSubmit }) => {
    const [newDoc, setNewDoc] = useState({ full_name: '', email: '', password: '', bmdc_reg: '' });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(newDoc);
        setNewDoc({ full_name: '', email: '', password: '', bmdc_reg: '' }); // Reset
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Onboard New Doctor">
            <form onSubmit={handleSubmit} className="space-y-4 text-gray-900 mt-2">
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Full Name</label>
                    <input type="text" className="w-full p-2 border rounded" required value={newDoc.full_name} onChange={e => setNewDoc({...newDoc, full_name: e.target.value})} />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Email (Login ID)</label>
                    <input type="email" className="w-full p-2 border rounded" required value={newDoc.email} onChange={e => setNewDoc({...newDoc, email: e.target.value})} />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">BMDC Registration</label>
                    <input type="text" className="w-full p-2 border rounded" value={newDoc.bmdc_reg} onChange={e => setNewDoc({...newDoc, bmdc_reg: e.target.value})} />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Initial Password</label>
                    <input type="password" className="w-full p-2 border rounded bg-yellow-50 border-yellow-200" required value={newDoc.password} onChange={e => setNewDoc({...newDoc, password: e.target.value})} />
                    <p className="text-xs text-yellow-600 mt-1">Share this with the doctor safely.</p>
                </div>
                
                <div className="flex justify-end pt-4 border-t mt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 mr-2">Cancel</button>
                    <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded font-bold hover:bg-indigo-700 shadow-lg">Create Account</button>
                </div>
            </form>
        </Modal>
    );
}

export default CreateDoctorModal;