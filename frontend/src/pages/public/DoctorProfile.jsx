import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';

import { useAuth } from '../../hooks/useAuth';


const VITE_API_URL = import.meta.env.VITE_API_URL;

function DoctorProfile() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { token: patientToken } = useAuth(); // Assume patientToken comes from storage if auth is shared

    const [doctor, setDoctor] = useState(null);
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [socials, setSocials] = useState({});
    const [videos, setVideos] = useState([]);
    const [gallery, setGallery] = useState([]);
    const [activeVideo, setActiveVideo] = useState(null);

    
    // --- FETCH DATA ---
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                // 1. Get Doctor by Slug
                const res = await fetch(`${VITE_API_URL}/public/profile/${slug}`);
                if (!res.ok) throw new Error("Doctor not found");
                const data = await res.json();
                
                // Parse potential JSON strings safely
                setDoctor(data);
                
                try {
                    setSocials(typeof data.social_links === 'string' ? JSON.parse(data.social_links) : data.social_links || {});
                    setVideos(typeof data.video_links === 'string' ? JSON.parse(data.video_links) : data.video_links || []);
                    setGallery(typeof data.gallery_images === 'string'
        ? JSON.parse(data.gallery_images)
        : Array.isArray(data.gallery_images)
            ? data.gallery_images
            : []
    );
                } catch(e) { console.error("Parse Error", e); }

                // 2. Fetch Schedule (Using Doctor ID)
                if (data.doctor_id) {
                    const schedRes = await fetch(`${VITE_API_URL}/public/doctors/${data.doctor_id}/schedules`);
                    if(schedRes.ok) setSchedules(await schedRes.json());
                }
                
            } catch (e) { console.error(e); } 
            finally { setLoading(false); }
        };
        fetchProfile();
    }, [slug]);

    // --- BOOKING LOGIC ---
    const handleBook = async (scheduleId) => {
        // Patient Auth Check logic needed here or redirect
        const token = localStorage.getItem('patientToken'); 
        if (!token) {
            localStorage.setItem('redirectAfterLogin', `/${slug}`); // Return here after login
            if(confirm("You must login to book. Proceed to Login?")) {
                navigate('/patient/login');
            }
            return;
        }

        if(!confirm("Confirm your appointment slot?")) return;

        try {
            const res = await fetch(`${VITE_API_URL}/schedules/book-serial`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ schedule_id: scheduleId }) // Note: user ID inferred from token in your backend logic
            });
            const d = await res.json();
            if(res.ok) {
                alert(`✅ BOOKING CONFIRMED!\n\nSerial #${d.serial}\nSee details in My Health Dashboard.`);
                navigate('/my-health');
            } else alert(d.message);
        } catch(e) { alert("Server Error"); }
    };

    if(loading) return <div className="h-screen flex items-center justify-center text-gray-400 font-medium">Loading Profile...</div>;
    if(!doctor) return <div className="h-screen flex items-center justify-center text-gray-500">Doctor Profile Not Found.</div>;

    // Helpers
    const formatTime = (t) => {
        if(!t) return '';
        const [h,m] = t.split(':');
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hour = h % 12 || 12;
        return `${hour}:${m} ${ampm}`;
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
            {/* SEO Metadata */}
            

            {/* === 1. HERO BANNER === */}
            <div className="relative bg-slate-900 text-white pb-20 pt-32 lg:pt-40">
                
                {/* Background Image / Pattern */}
                <div className="absolute inset-0 z-0">
                    {doctor.cover_image ? (
                        <img src={doctor.cover_image} className="w-full h-full object-cover opacity-40" alt="Cover" />
                    ) : (
                        <div className="w-full h-full object-cover opacity-10 bg-[url('https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTPbbHNQcnw_iv2olPM-gIWibLvtRKdU04q1w&s')] bg-fixed"></div>
                    )}
                    {/* Gradient Overlay for text readability */}
                    <div className="absolute inset-0 bg-linear-to-t from-slate-900 via-slate-900/60 to-transparent"></div>
                </div>

                <div className="max-w-6xl mx-auto px-6 relative z-10">
                    <div className="flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-10 -mb-28 md:-mb-32">
                        
                        {/* Profile Picture */}
                        <div className="relative group">
                            <div className="w-40 h-40 md:w-56 md:h-56 rounded-full p-1.5 bg-white shadow-2xl overflow-hidden relative z-10">
                                {doctor.profile_image ? (
                                    <img 
                                        src={doctor.profile_image} 
                                        alt={doctor.full_name} 
                                        className="w-full h-full object-cover rounded-full"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-slate-100 flex items-center justify-center rounded-full text-5xl font-bold text-indigo-300">
                                        {doctor.full_name[0]}
                                    </div>
                                )}
                            </div>
                            {/* Online Dot (Mock) */}
                            {/* <div className="absolute bottom-5 right-5 w-6 h-6 bg-green-500 border-4 border-slate-900 rounded-full z-20"></div> */}
                        </div>

                        {/* Name & Titles */}
                        <div className="flex-1 text-center md:text-left mb-6 md:mb-12">
                             <div className="inline-flex items-center gap-2 bg-indigo-500/20 backdrop-blur-sm border border-indigo-400/30 text-indigo-100 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-3">
                                <span>verified_user</span> Verified Specialist
                             </div>
                             <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white mb-2 shadow-sm drop-shadow-md">
                                {doctor.full_name}
                             </h1>
                             
                             {/* Designation & Title */}
                             {doctor.designation && <p className="text-lg md:text-xl text-slate-300 font-medium">{doctor.designation}</p>}
                             <p className="text-indigo-400 font-bold uppercase text-sm mt-1 tracking-widest">{doctor.specialist_title}</p>
                             
                             {/* Tags */}
                             <div className="flex flex-wrap gap-2 mt-4 justify-center md:justify-start">
                                {doctor.degree && (
                                    <span className="px-3 py-1 bg-white/10 rounded-lg text-xs font-medium text-slate-200 border border-white/10 backdrop-blur-sm">
                                        🎓 {doctor.degree}
                                    </span>
                                )}
                             </div>

                             {/* Socials */}
                             <div className="flex gap-4 mt-6 justify-center md:justify-start">
                                 <SocialButton type="facebook" href={socials?.facebook} />
                                 <SocialButton type="linkedin" href={socials?.linkedin} />
                                 <SocialButton type="youtube" href={socials?.youtube} />
                             </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* === 2. MAIN CONTENT GRID === */}
            <div className="max-w-6xl mx-auto px-6 py-12 pt-32 md:pt-36">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    
                    {/* LEFT COLUMN (8 cols) - INFO */}
                    <div className="lg:col-span-8 space-y-12">
                        
                        {/* Bio Section */}
                        <section>
                            <h3 className="text-xl font-bold text-slate-800 border-b border-slate-200 pb-3 mb-4 flex items-center gap-2">
                                <span className="bg-indigo-100 text-indigo-700 w-8 h-8 flex items-center justify-center rounded-lg text-sm">📝</span> 
                                About Doctor
                            </h3>
                            <div className="prose prose-slate max-w-none text-slate-600 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm leading-relaxed whitespace-pre-wrap">
                                {doctor.about_text || "No detailed biography available."}
                            </div>
                        </section>

                        {/* Achievements Section (If data exists) */}
                        {doctor.achievements && (
                            <section>
                                <h3 className="text-xl font-bold text-slate-800 border-b border-slate-200 pb-3 mb-4 flex items-center gap-2">
                                    <span className="bg-amber-100 text-amber-700 w-8 h-8 flex items-center justify-center rounded-lg text-sm">🏆</span> 
                                    Career Highlights
                                </h3>
                                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                                     <p className="whitespace-pre-wrap text-slate-600 leading-7">
                                        {doctor.achievements}
                                     </p>
                                </div>
                            </section>
                        )}

                        {/* Photo Gallery */}
                        {gallery.length > 0 && (
                            <section>
                                <h3 className="text-xl font-bold text-slate-800 border-b border-slate-200 pb-3 mb-6 flex items-center gap-2">
                                    <span className="bg-indigo-100 text-indigo-700 w-8 h-8 flex items-center justify-center rounded-lg text-sm">
                                        🖼
                                    </span>
                                    Photo Gallery
                                </h3>

                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {gallery.map((img, idx) => (
                                        <div
                                            key={idx}
                                            className="group relative overflow-hidden rounded-xl border border-slate-200 shadow-sm bg-white"
                                        >
                                            <img
                                                src={img}
                                                alt={`Gallery ${idx + 1}`}
                                                className="w-full h-40 object-cover transition-transform duration-300 group-hover:scale-105"
                                                loading="lazy"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}


                        {/* Videos Gallery */}
  
                        {videos.length > 0 && (
    <section>
        <h3 className="text-xl font-bold text-slate-800 border-b border-slate-200 pb-3 mb-6 flex items-center gap-2">
            <span className="bg-red-100 text-red-700 w-8 h-8 flex items-center justify-center rounded-lg text-sm">
                ▶
            </span>
            Featured Media
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {videos.map((id, idx) => (
                <div
                    key={idx}
                    className="relative rounded-xl overflow-hidden shadow-lg aspect-video bg-black"
                >
                    {activeVideo === id ? (
                        <iframe
                            className="w-full h-full"
                            src={`https://www.youtube.com/embed/${id}?autoplay=1`}
                            title="YouTube video"
                            frameBorder="0"
                            allow="autoplay; encrypted-media"
                            allowFullScreen
                        />
                    ) : (
                        <button
                            type="button"
                            onClick={() => setActiveVideo(id)}
                            className="group w-full h-full"
                        >
                            <img
                                src={`https://img.youtube.com/vi/${id}/hqdefault.jpg`}
                                alt="Video thumbnail"
                                className="w-full h-full object-cover"
                                loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <div className="w-16 h-16 rounded-full bg-red-600 text-white flex items-center justify-center text-2xl shadow-xl group-hover:scale-110 transition">
                                    ▶
                                </div>
                            </div>
                        </button>
                    )}
                </div>
            ))}
        </div>
    </section>
)}

                    </div>

                    {/* RIGHT COLUMN (4 cols) - SIDEBAR (Booking) */}
                    <div className="lg:col-span-4 space-y-8">
                        
                        {/* Clinic Info Card */}
                        <div className="bg-white rounded-2xl p-6 shadow-lg border border-indigo-100 relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-4 opacity-10 text-9xl text-indigo-900 pointer-events-none -mt-8 -mr-8 font-serif">🏥</div>
                             
                             <h4 className="text-sm font-bold uppercase text-slate-400 tracking-wide mb-3">Consultation At</h4>
                             <p className="text-lg font-bold text-indigo-900">{doctor.clinic_name}</p>
                             <p className="text-sm text-slate-500 mt-2 leading-snug">{doctor.chamber_address}</p>

                             <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-3">
                                 <div className="bg-indigo-50 p-2 rounded text-xl">📞</div>
                                 <div>
                                     <p className="text-[10px] uppercase font-bold text-slate-400">Appointment Helpline</p>
                                     <p className="font-mono text-lg font-bold text-slate-800">{doctor.phone_number}</p>
                                 </div>
                             </div>
                        </div>

                        {/* Booking Widget (Sticky on Desktop) */}
                        <div className="sticky top-8 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                            <div className="bg-indigo-900 p-4 text-center">
                                <h3 className="text-white font-bold text-lg">Book an Appointment</h3>
                                <p className="text-indigo-200 text-xs">Select a convenient slot below</p>
                            </div>
                            
                            <div className="p-4 max-h-[500px] overflow-y-auto space-y-3 bg-slate-50">
                                {schedules.length === 0 ? (
                                    <div className="text-center p-8 text-gray-400 italic">No available slots found.</div>
                                ) : (
                                    schedules.map(slot => {
                                        const isFull = slot.booked_count >= slot.max_patients;
                                        
                                        return (
                                            <div key={slot.schedule_id} className={`group bg-white p-4 rounded-xl border border-slate-200 transition-all ${isFull ? 'opacity-50 grayscale' : 'hover:border-indigo-400 hover:shadow-md cursor-pointer'}`}>
                                                <div className="flex justify-between items-center mb-2">
                                                     <div>
                                                         <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${slot.session_name.includes('Evening') ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600'}`}>
                                                             {slot.session_name}
                                                         </span>
                                                         <h5 className="font-bold text-slate-800 text-base mt-1">
                                                             {new Date(slot.date).toLocaleDateString(undefined, {weekday:'short', day:'numeric', month:'short'})}
                                                         </h5>
                                                     </div>
                                                     <div className="text-right">
                                                         {isFull ? <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded">FULL</span> : (
                                                             <div className="text-xs font-bold text-green-600">
                                                                 {slot.max_patients - slot.booked_count} Left
                                                             </div>
                                                         )}
                                                     </div>
                                                </div>

                                                <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100">
                                                     <span className="text-xs font-mono text-slate-500">
                                                         {formatTime(slot.start_time)}
                                                     </span>
                                                     {!isFull && (
                                                         <button 
                                                            onClick={() => handleBook(slot.schedule_id)}
                                                            className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-md font-bold shadow-sm hover:bg-indigo-700 transition"
                                                         >
                                                             Book Now
                                                         </button>
                                                     )}
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                            
                            <div className="bg-slate-100 p-3 text-center text-[10px] text-gray-500 border-t border-gray-200">
                                Powered by MedLipi Systems
                            </div>
                        </div>

                    </div>

                </div>
            </div>
        </div>
    );
}

// Helper: Social Icons
const SocialButton = ({ type, href }) => {
    if(!href) return null;
    let icon = "🔗"; // Default
    let colorClass = "bg-slate-200 text-slate-600";
    
    if(type === 'facebook') { icon = "fb"; colorClass = "bg-[#1877F2] text-white"; }
    if(type === 'linkedin') { icon = "in"; colorClass = "bg-[#0A66C2] text-white"; }
    if(type === 'youtube') { icon = "▶"; colorClass = "bg-[#FF0000] text-white"; }

    return (
        <a href={href} target="_blank" rel="noreferrer" className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold transition hover:scale-110 shadow-lg ${colorClass} border border-white/20`}>
            {icon}
        </a>
    )
}

export default DoctorProfile;