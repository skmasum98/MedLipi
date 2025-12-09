import React from 'react';
import { Link } from 'react-router';

function Home() {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            
             {/* --- HERO SECTION --- */}
            <header className="flex-1 flex items-center justify-center pt-16 pb-24 px-4 sm:px-6 lg:px-8 bg-white">
                <div className="text-center max-w-4xl mx-auto">
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 tracking-tight mb-6">
                        The Smart Way to <br />
                        <span className="text-indigo-600">Write Prescriptions</span>
                    </h1>
                    <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">
                        MedLipi helps doctors generate professional prescriptions in seconds, track patient history, and manage drug interactions securely.
                    </p>
                    <Link to="/find-doctors" className="text-indigo-600 font-semibold hover:underline">Find a Doctor</Link>

                    {/* Dual Call to Action */}
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <Link to="/register" className="flex items-center justify-center px-8 py-4 border border-transparent text-lg font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg md:min-w-[200px] transition-transform transform hover:-translate-y-1">
                            For Doctors
                        </Link>
                        <Link to="/patient/login" className="flex items-center justify-center px-8 py-4 border border-green-200 text-lg font-medium rounded-xl text-green-700 bg-green-50 hover:bg-green-100 hover:border-green-300 md:min-w-[200px] transition-transform transform hover:-translate-y-1">
                            For Patients
                        </Link>
                    </div>
                </div>
            </header>

            {/* --- FEATURES SECTION --- */}
            <section className="py-16 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-extrabold text-gray-900">Why choose MedLipi?</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Feature 1 */}
                        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
                            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center text-2xl mb-4">⚡</div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Fast E-Prescribing</h3>
                            <p className="text-gray-500">Create prescriptions in seconds using templates for drugs, instructions, and advice. No more handwriting.</p>
                        </div>

                        {/* Feature 2 */}
                        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-2xl mb-4">📂</div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Patient Records</h3>
                            <p className="text-gray-500">Search patient history instantly. View timelines of past visits, diagnoses, and medication changes.</p>
                        </div>

                        {/* Feature 3 */}
                        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
                            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-2xl mb-4">📱</div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Patient Portal</h3>
                            <p className="text-gray-500">Patients can scan a QR code or log in securely to download their digital prescriptions anytime.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- FOOTER --- */}
            <footer className="bg-white border-t border-gray-200 py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
                    <div className="mb-4 md:mb-0">
                        <span className="font-bold text-xl text-gray-800">MedLipi</span>
                        <p className="text-gray-400 text-sm mt-1">Healthcare Platform</p>
                    </div>
                    <div className="flex gap-6 text-gray-500 text-sm">
                        <Link to="/login" className="hover:text-indigo-600">Admin Login</Link>
                        <a href="#" className="hover:text-indigo-600">Privacy Policy</a>
                        <a href="#" className="hover:text-indigo-600">GitHub</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default Home;