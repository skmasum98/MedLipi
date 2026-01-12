import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router';

const VITE_API_URL = import.meta.env.VITE_API_URL;

// --- Tab Helper ---
const TabButton = ({ active, label, icon, onClick }) => (
    <button 
        type="button"
        onClick={onClick}
        className={`flex items-center gap-3 w-full p-4 rounded-xl transition-all duration-200 text-left font-bold ${
            active 
            ? 'bg-indigo-600 text-white shadow-lg transform scale-105' 
            : 'bg-white text-gray-500 hover:bg-indigo-50 hover:text-indigo-600'
        }`}
    >
        <span className="text-xl">{icon}</span>
        <span>{label}</span>
    </button>
);

const extractYouTubeId = (url) => {
    if (!url) return null;

    const regex =
        /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

    const match = url.match(regex);
    return match ? match[1] : url.length === 11 ? url : null;
};



function Settings() {
    const { token } = useAuth();
    const [activeTab, setActiveTab] = useState('clinical'); // 'clinical' or 'website'
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    const [formData, setFormData] = useState({
        // Clinical / Basic (doctors table)
        full_name: '', degree: '', bmdc_reg: '',
        clinic_name: '', chamber_address: '', phone_number: '', 
        
        // Website / Rich (doctor_profiles table)
        slug: '', 
        specialist_title: '',  // "Cardiologist"
        designation: '',       // "Associate Professor @ DMC"
        about_text: '',
        achievements: '',
        social_links: { facebook: '', linkedin: '', youtube: '' }, 
        video_links: [],
        gallery_images: [],
        profile_image: '', 
        cover_image: ''
    });

    const [videoInput, setVideoInput] = useState('');

        const addVideo = () => {
            const id = extractYouTubeId(videoInput.trim());
            if (!id) return;

            setFormData(prev => ({
                ...prev,
                video_links: prev.video_links.includes(id)
                    ? prev.video_links
                    : [...prev.video_links, id]
            }));

            setVideoInput('');
        };

        const removeVideo = (idx) => {
            setFormData(prev => ({
                ...prev,
                video_links: prev.video_links.filter((_, i) => i !== idx)
            }));
        };

    
    const [galleryInput, setGalleryInput] = useState('');

    // --- LOAD DATA ---
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await fetch(`${VITE_API_URL}/doctors/me/full-profile`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    
                    const socials = typeof data.social_links === 'string' ? JSON.parse(data.social_links) : (data.social_links || {});
                    const videos = typeof data.video_links === 'string' ? JSON.parse(data.video_links) : (data.video_links || []);
                    const gallery = typeof data.gallery_images === 'string'
                        ? JSON.parse(data.gallery_images)
                        : (Array.isArray(data.gallery_images) ? data.gallery_images : []);

                    setFormData({
                        ...data,
                        full_name: data.full_name || '',
                        degree: data.degree || '',
                        bmdc_reg: data.bmdc_reg || '',
                        clinic_name: data.clinic_name || '',
                        chamber_address: data.chamber_address || '',
                        phone_number: data.phone_number || '',
                        slug: data.slug || '',
                        
                        specialist_title: data.specialist_title || '',
                        designation: data.designation || '',
                        about_text: data.about_text || '',
                        achievements: data.achievements || '',
                        social_links: { 
                            facebook: socials.facebook || '', 
                            linkedin: socials.linkedin || '',
                            youtube: socials.youtube || '' 
                        },
                        video_links: videos,
                        gallery_images: gallery, 
                        profile_image: data.profile_image || '',
                        cover_image: data.cover_image || ''
                    });
                    setVideoInput(videos.join(', '));
                }
            } catch (error) { console.error(error); } 
            finally { setLoading(false); }
        };
        fetchProfile();
    }, [token]);

    // --- HANDLERS ---
    const handleChange = (e) => {
        const { name, value } = e.target;
        if(name.startsWith('social_')) {
             const key = name.split('_')[1];
             setFormData(prev => ({
                 ...prev,
                 social_links: { ...prev.social_links, [key]: value }
             }));
        } else {
             setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleVideoChange = (e) => {
        setVideoInput(e.target.value);
        const vArray = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
        setFormData(prev => ({ ...prev, video_links: vArray }));
    };

    const addGalleryImage = () => {
        if (!galleryInput.trim()) return;

        setFormData(prev => ({
            ...prev,
            gallery_images: [...prev.gallery_images, galleryInput.trim()]
        }));
        setGalleryInput('');
    };

    const removeGalleryImage = (index) => {
        setFormData(prev => ({
            ...prev,
            gallery_images: prev.gallery_images.filter((_, i) => i !== index)
        }));
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage('');

        try {
            const response = await fetch(`${VITE_API_URL}/doctors/me/full-profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(formData),
            });
            const data = await response.json();
            
            if (response.ok) {
                setMessage('Success: Profile Updated');
                setTimeout(() => setMessage(''), 3000);
            } else {
                setMessage(`Error: ${data.message}`);
            }
        } catch (error) { setMessage('Network error'); }
        finally { setSaving(false); }
    };

    if (loading) return <div className="p-20 text-center animate-pulse">Loading Profile Config...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                
                {/* --- PAGE HEADER --- */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900">Settings & Profile</h1>
                        <p className="text-sm text-gray-500 mt-1">Manage your clinic details and public web presence.</p>
                    </div>
                    {/* Live Preview Button */}
                    {formData.slug && (
                        <a href={`/${formData.slug}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-300 text-indigo-600 rounded-xl font-bold shadow-sm hover:shadow-md transition">
                            <span>🌎</span> View My Website
                        </a>
                    )}
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    
                    {/* --- LEFT: TABS SIDEBAR --- */}
                    <div className="w-full lg:w-64 space-y-4 shrink-0">
                        <TabButton 
                            active={activeTab === 'clinical'} 
                            label="Prescription & Clinic" 
                            icon="🏥" 
                            onClick={() => setActiveTab('clinical')} 
                        />
                        <TabButton 
                            active={activeTab === 'website'} 
                            label="Web Profile & SEO" 
                            icon="🌐" 
                            onClick={() => setActiveTab('website')} 
                        />
                    </div>

                    {/* --- RIGHT: FORM CONTENT --- */}
                    <div className="flex-1 bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
                        <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in">
                            
                            {/* === TAB 1: CLINICAL SETTINGS === */}
                            {activeTab === 'clinical' && (
                                <div className="space-y-8">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-800 border-b pb-4 mb-6">Identification & Credentials</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="md:col-span-2">
                                                <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Legal Full Name</label>
                                                <input name="full_name" value={formData.full_name} onChange={handleChange} className="w-full p-3 bg-gray-50 border rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 transition outline-none font-bold text-gray-900" placeholder="e.g. Dr. Md. Rahim" />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 uppercase block mb-2">BMDC Registration</label>
                                                <input value={formData.bmdc_reg} disabled className="w-full p-3 bg-gray-100 border border-gray-200 rounded-lg text-gray-400 cursor-not-allowed" />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Degrees</label>
                                                <input name="degree" value={formData.degree} onChange={handleChange} className="w-full p-3 bg-gray-50 border rounded-lg" placeholder="MBBS, FCPS, MD..." />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-bold text-gray-800 border-b pb-4 mb-6">Prescription Header Info</h3>
                                        <div className="space-y-6">
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Clinic / Chamber Name</label>
                                                <input name="clinic_name" value={formData.clinic_name} onChange={handleChange} className="w-full p-3 bg-gray-50 border rounded-lg" placeholder="e.g. Dhaka Central Hospital" />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Full Address & Contact</label>
                                                <textarea name="chamber_address" rows="2" value={formData.chamber_address} onChange={handleChange} className="w-full p-3 bg-gray-50 border rounded-lg" placeholder="Full address displayed on Prescription..." />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Appointments Number</label>
                                                <input name="phone_number" value={formData.phone_number} onChange={handleChange} className="w-full p-3 bg-gray-50 border rounded-lg" placeholder="e.g. 01700..." />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* === TAB 2: WEBSITE BUILDER === */}
                            {activeTab === 'website' && (
                                <div className="space-y-8">
                                    <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100">
                                        <label className="text-xs font-bold text-indigo-700 uppercase block mb-2">Personal Web Link (Slug)</label>
                                        <div className="flex items-center">
                                            <span className="bg-white border border-r-0 border-indigo-200 text-gray-500 p-3 rounded-l-lg select-none">
                                                medlipi.com/
                                            </span>
                                            <input name="slug" value={formData.slug} onChange={handleChange} className="flex-1 p-3 border border-indigo-200 rounded-r-lg font-bold text-indigo-900 placeholder:text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="your-name" />
                                        </div>
                                        <p className="text-xs text-indigo-400 mt-2">This is the link you share on social media.</p>
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-bold text-gray-800 border-b pb-4 mb-6">Profile Content</h3>
                                        <div className="space-y-5">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Display Title</label>
                                                    <input name="specialist_title" value={formData.specialist_title} onChange={handleChange} className="w-full p-3 border rounded-lg" placeholder="Cardiologist & Medicine Specialist" />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Official Designation</label>
                                                    <input name="designation" value={formData.designation} onChange={handleChange} className="w-full p-3 border rounded-lg" placeholder="Associate Professor, Dept. of Medicine" />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Biography / About</label>
                                                <textarea name="about_text" rows="5" value={formData.about_text} onChange={handleChange} className="w-full p-3 border rounded-lg text-sm leading-relaxed" placeholder="Write a short professional bio..." />
                                            </div>
                                            
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Key Achievements</label>
                                                <textarea name="achievements" rows="3" value={formData.achievements} onChange={handleChange} className="w-full p-3 border rounded-lg text-sm" placeholder="Gold Medalist, 10 Years Experience (Comma separated or new lines)" />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-bold text-gray-800 border-b pb-4 mb-6">Media & Social</h3>
                                        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-6">
    <h3 className="text-xl font-bold text-gray-800 border-b pb-4 mb-6">
        Photo Gallery
    </h3>

    {/* Input */}
    <div className="flex gap-3 mb-4">
        <input
            value={galleryInput}
            onChange={(e) => setGalleryInput(e.target.value)}
            placeholder="Paste image URL & click Add"
            className="flex-1 p-3 border rounded-lg text-sm"
        />
        <button
            type="button"
            onClick={addGalleryImage}
            className="px-5 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700"
        >
            Add
        </button>
    </div>

    {/* Gallery Preview */}
    {formData.gallery_images.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {Array.isArray(formData.gallery_images) &&
                formData.gallery_images.map((img, idx) => (
                <div key={idx} className="relative group rounded-xl overflow-hidden shadow border">
                    <img
                        src={img}
                        alt=""
                        className="w-full h-32 object-cover group-hover:scale-105 transition"
                    />
                    <button
                        type="button"
                        onClick={() => removeGalleryImage(idx)}
                        className="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100"
                    >
                        ✕
                    </button>
                </div>
            ))}
        </div>
    ) : (
        <p className="text-sm text-gray-400 italic">No gallery images added yet</p>
    )}
</div>
                                        <div className="space-y-4">
                                             <div>
                                                 <div className="bg-white border border-dashed border-gray-300 rounded-xl p-6">
    <h3 className="text-xl font-bold text-gray-800 border-b pb-4 mb-6">
        🎬 YouTube Videos
    </h3>

    {/* Input */}
    <div className="flex gap-3 mb-6">
        <input
            value={videoInput}
            onChange={(e) => setVideoInput(e.target.value)}
            placeholder="Paste YouTube link or video ID"
            className="flex-1 p-3 border rounded-lg text-sm"
        />
        <button
            type="button"
            onClick={addVideo}
            className="px-5 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700"
        >
            Add
        </button>
    </div>

    {/* Video Grid */}
    {formData.video_links.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {formData.video_links.map((vid, idx) => (
                <div
                    key={idx}
                    className="relative group rounded-xl overflow-hidden border shadow bg-black"
                >
                    <img
                        src={`https://img.youtube.com/vi/${vid}/hqdefault.jpg`}
                        alt="Video thumbnail"
                        className="w-full h-40 object-cover"
                    />

                    {/* Play Icon */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-red-600 text-white rounded-full w-14 h-14 flex items-center justify-center text-xl shadow-lg opacity-90">
                            ▶
                        </div>
                    </div>

                    {/* Remove */}
                    <button
                        type="button"
                        onClick={() => removeVideo(idx)}
                        className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100"
                    >
                        ✕
                    </button>
                </div>
            ))}
        </div>
    ) : (
        <p className="text-sm text-gray-400 italic">
            No videos added yet
        </p>
    )}
</div>

                                                 
                                             </div>
                                             
                                             <div className="grid grid-cols-2 gap-4">
                                                 <input name="social_facebook" value={formData.social_links.facebook} onChange={handleChange} className="w-full p-3 border rounded-lg text-xs" placeholder="Facebook Profile Link" />
                                                 <input name="social_linkedin" value={formData.social_links.linkedin} onChange={handleChange} className="w-full p-3 border rounded-lg text-xs" placeholder="LinkedIn Profile Link" />
                                             </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white border border-dashed border-gray-300 rounded-xl p-6">
                                        
                                        {/* Profile Picture */}
                                        <div className="flex flex-col items-center text-center">
                                            <div className="w-24 h-24 rounded-full bg-gray-100 overflow-hidden mb-3 border-4 border-white shadow-md relative">
                                                {formData.profile_image ? (
                                                    <img src={formData.profile_image} alt="Preview" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-3xl flex h-full w-full items-center justify-center text-gray-300">👤</span>
                                                )}
                                            </div>
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-2">Profile Photo (Link)</label>
                                            <input name="profile_image" value={formData.profile_image} onChange={handleChange} className="w-full p-2 border rounded text-xs text-gray-600" placeholder="https://example.com/me.jpg" />
                                        </div>

                                        {/* Cover Image */}
                                        <div className="flex flex-col">
                                            <div className="h-24 rounded-lg bg-gray-100 overflow-hidden mb-3 relative shadow-inner">
                                                {formData.cover_image ? (
                                                    <img src={formData.cover_image} alt="Preview" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="h-full flex items-center justify-center text-gray-300 text-xs">No Cover Image</div>
                                                )}
                                            </div>
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-2">Banner / Cover Photo (Link)</label>
                                            <input name="cover_image" value={formData.cover_image} onChange={handleChange} className="w-full p-2 border rounded text-xs text-gray-600" placeholder="https://example.com/banner.jpg" />
                                        </div>
                                    </div>
                                    
                                </div>
                            )}

                            {/* --- ACTION BAR --- */}
                            <div className="flex justify-between items-center pt-8 border-t border-gray-100">
                                <div className="text-sm font-bold text-green-600 animate-pulse">{message}</div>
                                <button 
                                    type="submit" 
                                    disabled={saving}
                                    className={`px-8 py-3 rounded-xl font-bold text-white shadow-lg transform transition active:scale-95 flex items-center gap-2 ${saving ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                                >
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>

                        </form>
                    </div>

                </div>
            </div>
        </div>
    );
}

export default Settings;