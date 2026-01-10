import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useAuth } from '../hooks/useAuth';
import { useReactToPrint } from 'react-to-print';

const VITE_API_URL = import.meta.env.VITE_API_URL;

// Icons
const PrinterIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>;
const DownloadIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>;
const EditIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>;

function RxPreview() {
    const { id } = useParams(); // Internal ID
    const { token } = useAuth();
    const navigate = useNavigate();
    
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showHeader, setShowHeader] = useState(true);

    const componentRef = useRef(null); // Initialize as null

    // 1. Fetch Data
    useEffect(() => {
         if(!token || !id || id === 'null' || id === 'undefined') return;
        
        const fetchRx = async () => {
            try {
                // Fetch secured data
                const res = await fetch(`${VITE_API_URL}/prescriptions/${id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (res.ok) {
                    const jsonData = await res.json();
                    setData(jsonData);
                } else {
                    alert('Prescription not found or Access Denied');
                    navigate('/dashboard');
                }
            } catch (e) { 
                console.error(e); 
            } finally {
                setLoading(false);
            }
        };
        fetchRx();
    }, [id, token, navigate]);

    // 2. Print Logic (FIXED: Using contentRef)
    const handlePrint = useReactToPrint({
        contentRef: componentRef, // Pass ref directly
        documentTitle: data ? `Prescription_${data.patient.name}` : 'Prescription',
    });

    // 3. Download Logic (FIXED: Use Public URL to bypass Auth Token issue)
    const handleDownload = () => {
        if (!data || !data.public_uid) return alert("Public ID missing, cannot download PDF.");
        
        // This hits the Public route we created earlier which DOES NOT require headers
        window.open(`${VITE_API_URL}/public/prescription/${data.public_uid}`, '_blank');
    };

    // --- HANDLER: EDIT / FIX ---
    const handleEdit = () => {
    if (!data?.prescription) return alert("No prescription data");

    const v = data.prescription;
    const drugs = data.items.map(i => ({
        drug_id: i.drug_id,
        generic_name: i.generic_name,
        trade_names: i.trade_names,
        strength: i.strength,
        quantity: i.quantity,
        sig_instruction: i.sig_instruction,
        duration: i.duration,
        counseling_points: i.counseling_points,
        tempId: uuidv4()
    }));

    navigate('/prescription/new', {
        state: {
            editMode: true,
            patientData: patient,
            visitData: {
                chief_complaint: v.chief_complaint,
                medical_history: v.medical_history,
                investigations: v.investigations,
                general_advice: v.general_advice,
                follow_up_date: v.follow_up_date,
                examination_findings: v.examination_findings,
                diagnosis_text: v.diagnosis_text,
                drugs
            },
            original_date: data.date // exact created_at timestamp from DB
        }
    });
};


    if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Generating Preview...</div>;
    if (!data) return null;

    const { doctor, patient, prescription, items, public_uid } = data;
    // Format Date from DB (Handle string vs Date object)
    const formattedDate = new Date(data.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    return (
        <div className="min-h-screen bg-gray-100 p-8 flex justify-center gap-8 font-sans print:p-0 print:bg-white">
            
            {/* === CONTROLS PANEL (Hide on Print) === */}
            <div className="w-80 h-fit sticky top-6 space-y-6 print:hidden">
                <div className="bg-white p-5 rounded-xl shadow-md border border-gray-200">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><span>🖨️</span> Options</h3>
                    <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:border-indigo-300 border border-transparent transition-colors">
                        <input type="checkbox" checked={showHeader} onChange={(e) => setShowHeader(e.target.checked)} className="mt-1 accent-indigo-600 w-5 h-5" />
                        <div><span className="block font-semibold text-sm text-gray-800">Clinic Header</span><span className="block text-xs text-gray-500">Uncheck for letterhead</span></div>
                    </label>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-md border border-gray-200 space-y-3">
                    <button onClick={() => handlePrint()} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg shadow transition flex items-center justify-center gap-2">
                        <PrinterIcon /> Print / PDF
                    </button>
                    <button onClick={handleDownload} className="w-full bg-white hover:bg-gray-50 text-indigo-700 font-bold py-3 px-4 rounded-lg border-2 border-indigo-100 transition flex items-center justify-center gap-2">
                        <DownloadIcon /> Backend PDF
                    </button>
                    <div className="h-px bg-gray-200 my-4"></div>
                    <button onClick={() => handleEdit(visit)} className="w-full text-sm font-semibold text-gray-500 hover:text-gray-800 py-2 flex items-center justify-center gap-1 hover:bg-gray-100 rounded">
                        <EditIcon /> Edit / Fix
                    </button>
                </div>
                <button onClick={() => navigate('/dashboard')} className="block w-full text-center text-sm text-gray-500 hover:underline">&larr; Return to Dashboard</button>
            </div>

            {/* === PREVIEW PAPER === */}
            <div className="shadow-2xl print:shadow-none print:w-full print:m-0">
                <div 
                    ref={componentRef} 
                    className="bg-white w-[210mm] min-h-[297mm] mx-auto p-[10mm] text-gray-900 relative print:w-full print:p-8"
                    style={{ fontFamily: "'Times New Roman', serif" }} // Print friendly font
                >
                    
                    {/* Header */}
                    {showHeader ? (
                        <div className="border-b-2 border-gray-800 pb-4 mb-6 flex justify-between items-start">
                             <div>
                                 <h1 className="text-3xl font-extrabold text-blue-900 uppercase tracking-wide" style={{fontFamily: 'Arial, sans-serif'}}>{doctor.clinic_name || 'My Clinic'}</h1>
                                 <p className="text-sm font-medium text-gray-600 mt-1 max-w-[60%]">{doctor.chamber_address}</p>
                                 <p className="text-sm font-bold text-gray-800 mt-1">📞 {doctor.phone_number}</p>
                             </div>
                             <div className="text-right">
                                 <h2 className="text-xl font-bold text-black" style={{fontFamily: 'Arial, sans-serif'}}>Dr. {doctor.full_name}</h2>
                                 <p className="text-sm font-semibold text-gray-600 uppercase">{doctor.degree}</p>
                                 <p className="text-xs text-gray-500 mt-0.5 tracking-wide uppercase">{doctor.specialist_title}</p>
                                 <p className="text-xs font-mono text-gray-400 mt-1">Reg: {doctor.bmdc_reg}</p>
                             </div>
                         </div>
                    ) : ( <div className="h-[40mm]"></div> )}

                    {/* Patient Bar */}
                    <div className="flex justify-between items-center bg-gray-100 px-4 py-2 border-y border-gray-300 text-sm font-bold mb-6 print:bg-transparent print:border-black">
                        <div className="flex gap-6">
                            <span>Name: <span className="uppercase">{patient.name}</span></span>
                            <span>Age: {data.patient.age || '--'}</span>
                            <span>Sex: {patient.gender}</span>
                            <span>ID: #{data.patient.id || data.patient.patient_id}</span>
                        </div>
                        <div>Date: {formattedDate}</div>
                    </div>

                    <div className="grid grid-cols-12 gap-0 min-h-[600px]">
                        {/* LEFT COL */}
                        <div className="col-span-4 border-r border-gray-300 pr-4 print:border-gray-400">
                            <ClinicalSection title="Chief Complaint" content={prescription.chief_complaint} />
                            
                            {(prescription.examination_findings && Object.values(prescription.examination_findings).some(x=>x)) && (
                                <div className="mb-5">
                                    <h4 className="text-xs font-bold uppercase text-gray-500 mb-1 border-b border-gray-200">On Examination</h4>
                                    <div className="text-sm space-y-1">
                                        {Object.entries(prescription.examination_findings).map(([key, val]) => (
                                            val && <div key={key} className="flex justify-between"><span className="font-semibold capitalize">{key}:</span> <span>{val}</span></div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <ClinicalSection title="History" content={prescription.medical_history} />
                            <ClinicalSection title="Investigations" content={prescription.investigations} />
                            <ClinicalSection title="Diagnosis" content={prescription.diagnosis_text} isBold />
                        </div>

                        {/* RIGHT COL */}
                        <div className="col-span-8 pl-6 relative">
                             <div className="text-4xl font-serif font-bold italic mb-4 opacity-80">Rx</div>
                             <div className="space-y-6">
                                {items.map((drug, i) => (
                                    <div key={i} className="text-sm">
                                        <div className="font-bold text-lg text-black flex items-baseline gap-2">
                                            <span>{i+1}. {drug.trade_names}</span> 
                                            <span className="text-sm font-normal text-gray-500">{drug.strength}</span>

                                        </div>
                                        {/* Show Generic if brand exists */}
                                        {drug.brand && <div className="text-xs text-gray-400 italic ml-5">({drug.generic_name})</div>}
                                        
                                        <div className="ml-5 font-bold text-gray-800 font-mono mt-1 text-base">
                                            {drug.sig_instruction} 
                                            {drug.duration && <span className="mx-2 text-gray-400"> — </span>} 
                                            {drug.duration}
                                        </div>
                                        {drug.counseling_points && <div className="ml-5 text-xs text-gray-600 mt-0.5">{drug.counseling_points}</div>}
                                    </div>
                                ))}
                             </div>

                             {prescription.general_advice && (
                                 <div className="mt-10 pt-4 border-t border-gray-200">
                                     <h4 className="font-bold text-sm text-gray-800 uppercase mb-2">Advice:</h4>
                                     <pre className="font-sans whitespace-pre-wrap text-sm text-gray-700 leading-relaxed pl-2 font-medium">{prescription.general_advice}</pre>
                                 </div>
                             )}

                             {prescription.follow_up_date && (
                                 <div className="mt-6 border border-black inline-block px-3 py-1 rounded">
                                     <span className="font-bold text-sm">Next Visit: </span>
                                     <span className="font-mono text-sm">{new Date(prescription.follow_up_date).toLocaleDateString()}</span>
                                 </div>
                             )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="absolute bottom-0 left-[10mm] right-[10mm] border-t border-gray-800 pt-2 flex justify-between items-end pb-8">
                        <div className="text-[10px] text-gray-400 leading-tight">
                            Digital Rx via MedLipi<br/>ID: {public_uid?.substring(0, 8)}
                            {data.qrCodeDataUrl && <img src={data.qrCodeDataUrl} className="w-16 h-16 mt-2" alt="QR" />}
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-sm">Dr. {doctor.full_name}</p>
                            <p className="text-[10px] text-gray-500 uppercase">Signature</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const ClinicalSection = ({ title, content, isBold = false }) => {
    if(!content) return null;
    return (
        <div className="mb-6 wrap-break-word">
            <h4 className="text-xs font-bold uppercase text-gray-500 mb-1 border-b border-gray-200">{title}</h4>
            <div className={`text-sm text-gray-800 whitespace-pre-wrap ${isBold ? 'font-bold' : ''}`}>{content}</div>
        </div>
    )
};

export default RxPreview;