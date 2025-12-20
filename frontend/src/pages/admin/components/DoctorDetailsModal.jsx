import React from 'react';
import Modal from '../../../components/Modal';

const DoctorDetailsModal = ({ isOpen, onClose, doctor, details }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={doctor?.full_name}>
            <div className="space-y-6 text-gray-800">
                {/* ID Card Style Info */}
                <div className="flex gap-4 items-center p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-3xl shadow-sm">
                        👨‍⚕️
                    </div>
                    <div>
                        <h4 className="font-bold text-lg text-indigo-900">{doctor?.full_name}</h4>
                        <p className="text-sm text-gray-600">{doctor?.email}</p>
                        <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${doctor?.status === 'active' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                            {doctor?.status}
                        </span>
                    </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded border border-gray-200 text-center">
                        <div className="text-xs text-gray-500 uppercase font-bold tracking-wide">Total Prescriptions</div>
                        <div className="text-3xl font-extrabold text-gray-900 mt-2">{details ? details.rx_count : '...'}</div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded border border-gray-200 text-center">
                        <div className="text-xs text-gray-500 uppercase font-bold tracking-wide">Staff Members</div>
                        <div className="text-3xl font-extrabold text-gray-900 mt-2">{details ? details.staff_count : '...'}</div>
                    </div>
                </div>

                <div className="text-xs text-gray-400 text-center pt-2">
                    Registered on: {new Date(doctor?.created_at).toLocaleDateString()}
                </div>
            </div>
        </Modal>
    );
};

export default DoctorDetailsModal;