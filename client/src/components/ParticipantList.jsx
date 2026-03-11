import { useState, useEffect, useMemo, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../api/axios';

const ParticipantList = () => {
    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // --- SEARCH & FILTER ---
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('All');

    // --- 🛡️ PAIRING SCANNER ---
    const [pairingUser, setPairingUser] = useState(null);
    const [isScanning, setIsScanning] = useState(false);
    const [pairResult, setPairResult] = useState(null);
    const scannerRef = useRef(null);

    // --- 🚶 WALKIN ---
    const [isWalkinOpen, setIsWalkinOpen] = useState(false);
    const [walkinData, setWalkinData] = useState({ name: '', category: 'Participant' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- 👑 GOD MODE (EDIT & STATUS) ---
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editData, setEditData] = useState({ _id: '', name: '', category: '' });

    const fetchParticipants = async () => {
        setLoading(true);
        try {
            const response = await api.get('/participants');
            
            // 🚀 FIX: Sort the data so newest additions are ALWAYS at the top!
            // MongoDB _id's contain timestamps, so sorting by _id descending works perfectly.
            const sortedData = response.data.sort((a, b) => (a._id < b._id ? 1 : -1));
            
            setParticipants(sortedData);
            setError('');
        } catch (err) {
            setError('Failed to load participants.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchParticipants();
    }, []);

    const filteredParticipants = useMemo(() => {
        return participants.filter(p => {
            const matchesSearch = 
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                (p.qrId && p.qrId.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesFilter = activeFilter === 'All' || p.category === activeFilter;
            return matchesSearch && matchesFilter;
        });
    }, [participants, searchTerm, activeFilter]);

    // --- 🛡️ PAIRING LOGIC ---
    const openPairingModal = (user) => {
        setPairingUser(user);
        setPairResult(null);
        setTimeout(() => { startCamera(); }, 150);
    };

    const startCamera = async () => {
        setIsScanning(true);
        try {
            scannerRef.current = new Html5Qrcode("pair-reader");
            await scannerRef.current.start(
                { facingMode: "environment" },
                { fps: 15 }, 
                onScanSuccess,
                () => {} // ignore empty frames
            );
        } catch (err) {
            console.error("Camera Error:", err);
            setPairResult({ type: 'error', title: 'Camera Error', message: 'Could not access the camera.' });
        }
    };

    const stopCamera = async () => {
        if (scannerRef.current && isScanning) {
            try { await scannerRef.current.stop(); scannerRef.current.clear(); } 
            catch (err) { console.error("Stop error", err); }
        }
        setIsScanning(false);
        scannerRef.current = null;
        setPairingUser(null);
        setPairResult(null);
    };

    const onScanSuccess = async (decodedText) => {
        if (scannerRef.current) scannerRef.current.pause();
        try {
            const response = await api.post('/admin/pair-badge', {
                participantId: pairingUser._id,
                qrString: decodedText.trim()
            });
            setPairResult({ type: 'success', title: 'BADGE LINKED', message: response.data.message });
            fetchParticipants();
        } catch (error) {
            setPairResult({
                type: 'error',
                title: 'PAIRING REJECTED',
                message: error.response?.data?.message || 'Invalid or counterfeit badge.'
            });
        }
    };

    const handleNextAction = () => {
        if (pairResult?.type === 'success') {
            stopCamera();
        } else {
            setPairResult(null);
            if (scannerRef.current) scannerRef.current.resume();
        }
    };

    // --- 🚶 WALKIN LOGIC (UPGRADED WITH INSTANT LINK) ---
    const handleWalkinAction = async (action = 'link') => {
        if (!walkinData.name.trim()) return;
        
        setIsSubmitting(true);
        try {
            // Save walkin
            await api.post('/admin/bulk-upload', [walkinData]);
            
            // Fetch updated list
            const freshRes = await api.get('/participants');
            
            // 🚀 FIX: Sort new list so the person we just added is at the very top index [0]
            const sortedList = freshRes.data.sort((a, b) => (a._id < b._id ? 1 : -1));
            setParticipants(sortedList);
            
            // 🚀 FIX: Clear the search bar so the new person isn't accidentally hidden!
            setSearchTerm('');
            setActiveFilter('All');
            
            // Close the modal
            setIsWalkinOpen(false);
            
            if (action === 'link') {
                // The new user is now guaranteed to be near the top of the array
                const newUser = sortedList.find(p => p.name === walkinData.name.trim() && !p.qrId);
                
                if (newUser) {
                    setTimeout(() => openPairingModal(newUser), 300);
                } else {
                    alert("User added! Please click 'Link' from the roster list.");
                }
            }
            
            // Reset state
            setWalkinData({ name: '', category: 'Participant' });
        } catch (err) {
            alert("Failed to register walk-in.");
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- 👑 GOD MODE LOGIC ---
    const handleDelete = async (id, name) => {
        if (!window.confirm(`SECURITY ALERT:\n\nAre you sure you want to permanently delete ${name}? This action cannot be undone.`)) return;
        try {
            await api.delete(`/admin/participants/${id}`);
            fetchParticipants();
        } catch (err) {
            alert('Failed to delete participant.');
        }
    };

    const handleUnlink = async (id) => {
        if (!window.confirm("Unlink this physical badge? They will not be able to scan until a new one is linked.")) return;
        try {
            await api.put(`/admin/participants/${id}`, { qrId: null });
            fetchParticipants();
        } catch (err) {
            alert('Failed to unlink badge.');
        }
    };

    const handleToggleStatus = async (id, currentStatus) => {
        try {
            await api.put(`/admin/participants/${id}`, { isApproved: !currentStatus });
            fetchParticipants();
        } catch (err) {
            alert('Failed to update status.');
        }
    };

    const openEditModal = (user) => {
        setEditData({ _id: user._id, name: user.name, category: user.category });
        setIsEditOpen(true);
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await api.put(`/admin/participants/${editData._id}`, { 
                name: editData.name, 
                category: editData.category 
            });
            setIsEditOpen(false);
            fetchParticipants();
        } catch (err) {
            alert("Failed to update participant.");
        } finally {
            setIsSubmitting(false);
        }
    };


    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
            <i className="ph-duotone ph-arrows-clockwise text-4xl text-teal-500 animate-spin mb-4 shadow-[0_0_20px_rgba(20,184,166,0.5)] rounded-full"></i>
            <p className="text-[10px] font-black uppercase tracking-widest text-teal-300">Syncing Database...</p>
        </div>
    );

    if (error) return (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold px-4 py-3 rounded-2xl text-center backdrop-blur-sm animate-enter mt-10 max-w-md mx-auto">
            {error}
        </div>
    );

    const categories = ['All', 'Participant', 'Volunteer', 'Guest'];

    return (
        <div className="flex flex-col h-full animate-enter w-full max-w-md mx-auto pb-20 relative z-20">
            
            <div className="sticky top-16 z-30 pt-4 pb-4 bg-slate-950/90 backdrop-blur-xl border-b border-white/10 mx-[-1rem] px-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                <div className="flex items-center justify-between mb-5">
                    <h3 className="font-black text-white text-lg flex items-center gap-3 tracking-wide">
                        <div className="w-8 h-8 bg-teal-500/20 border border-teal-500/30 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(20,184,166,0.2)]">
                            <i className="ph-bold ph-users-three text-teal-400"></i>
                        </div>
                        Live Roster
                    </h3>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setIsWalkinOpen(true)}
                            className="w-10 h-10 rounded-xl bg-teal-500 text-white shadow-[0_0_15px_rgba(20,184,166,0.4)] flex items-center justify-center hover:bg-teal-400 active:scale-90 transition-all"
                        >
                            <i className="ph-bold ph-plus text-lg"></i>
                        </button>
                        <button 
                            onClick={fetchParticipants} 
                            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-teal-300 hover:bg-teal-500/20 hover:text-white active:scale-90 transition-all duration-300 flex items-center justify-center"
                        >
                            <i className="ph-bold ph-arrows-clockwise text-lg"></i>
                        </button>
                    </div>
                </div>

                <div className="relative mb-4 group">
                    <i className="ph-bold ph-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg group-focus-within:text-teal-400 transition-colors"></i>
                    <input 
                        type="text" 
                        placeholder="Search by Name or ID..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-900/50 border border-white/10 rounded-2xl py-3 pl-12 pr-10 text-white font-bold placeholder-slate-500 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-all shadow-inner"
                    />
                </div>

                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                    {categories.map(cat => (
                        <button 
                            key={cat}
                            onClick={() => setActiveFilter(cat)}
                            className={`whitespace-nowrap px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all duration-300 active:scale-95 border ${
                                activeFilter === cat 
                                ? 'bg-teal-500 border-teal-400 text-white shadow-[0_0_15px_rgba(20,184,166,0.4)]' 
                                : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-teal-200'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* LIST AREA */}
            <div className="mt-6 space-y-3">
                <div className="flex justify-between items-center px-1 mb-2">
                    <span className="text-[10px] font-black text-teal-200/50 uppercase tracking-widest">
                        Showing {filteredParticipants.length} entries
                    </span>
                </div>

                {filteredParticipants.length === 0 ? (
                    <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[2rem] text-center text-slate-500 font-bold border border-white/10 mt-4 shadow-inner">
                        <i className="ph-duotone ph-ghost text-5xl mb-3 opacity-40"></i>
                        <p className="text-[11px] uppercase tracking-widest">No participants found.</p>
                    </div>
                ) : (
                    filteredParticipants.map((p) => (
                        <div key={p._id} className="bg-white/5 backdrop-blur-lg rounded-[2rem] border border-white/10 overflow-hidden mb-4 transition-all hover:border-teal-500/30 shadow-[0_5px_15px_rgba(0,0,0,0.2)]">
                            <div className="p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-teal-400 shadow-inner">
                                            <i className="ph-fill ph-user text-2xl"></i>
                                        </div>
                                        <div>
                                            <h4 className="font-black text-white text-lg tracking-wide leading-tight">{p.name}</h4>
                                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 mt-1 inline-block rounded-md border ${
                                                p.category === 'Volunteer' ? 'bg-purple-500/10 border-purple-500/30 text-purple-300' : 
                                                p.category === 'Guest' ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 
                                                'bg-teal-500/10 border-teal-500/30 text-teal-300'
                                            }`}>
                                                {p.category}
                                            </span>
                                            {p.qrId && (
                                                <span className="ml-2 text-[8px] font-black text-slate-400 uppercase tracking-widest bg-slate-900/80 border border-white/10 px-2 py-0.5 rounded-md shadow-inner">
                                                    ID: {p.qrId.split('-')[0]}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Status Toggle */}
                                    <button 
                                        onClick={() => handleToggleStatus(p._id, p.isApproved)}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-inner border ${p.isApproved ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-slate-800 text-slate-500 border-white/5 hover:text-white'}`}
                                        title={p.isApproved ? "Approved" : "Pending"}
                                    >
                                        <i className={`ph-bold ${p.isApproved ? 'ph-check-circle' : 'ph-circle'}`}></i>
                                    </button>
                                </div>

                                {/* ACTION DOCK */}
                                <div className="grid grid-cols-3 gap-2 border-t border-white/5 pt-4">
                                    {p.qrId ? (
                                        <button 
                                            onClick={() => handleUnlink(p._id)}
                                            className="flex flex-col items-center justify-center py-2 bg-slate-800/50 rounded-xl text-[8px] font-black uppercase text-amber-400 tracking-tighter hover:bg-amber-500/10 transition-colors border border-transparent hover:border-amber-500/30"
                                        >
                                            <i className="ph-bold ph-link-break text-lg mb-1"></i> Unlink
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => openPairingModal(p)}
                                            className="flex flex-col items-center justify-center py-2 bg-teal-500/10 rounded-xl text-[8px] font-black uppercase text-teal-400 tracking-tighter border border-teal-500/30 shadow-[0_0_15px_rgba(20,184,166,0.1)] active:scale-95 transition-all"
                                        >
                                            <i className="ph-bold ph-qr-code text-lg mb-1"></i> Link Badge
                                        </button>
                                    )}

                                    <button 
                                        onClick={() => openEditModal(p)}
                                        className="flex flex-col items-center justify-center py-2 bg-blue-500/10 rounded-xl text-[8px] font-black uppercase text-blue-400 tracking-tighter hover:bg-blue-500/20 transition-colors border border-transparent hover:border-blue-500/30"
                                    >
                                        <i className="ph-bold ph-pencil-line text-lg mb-1"></i> Edit
                                    </button>

                                    <button 
                                        onClick={() => handleDelete(p._id, p.name)}
                                        className="flex flex-col items-center justify-center py-2 bg-rose-500/10 rounded-xl text-[8px] font-black uppercase text-rose-500 tracking-tighter hover:bg-rose-500/20 transition-colors border border-transparent hover:border-rose-500/30"
                                    >
                                        <i className="ph-bold ph-trash text-lg mb-1"></i> Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* 🛡️ PAIRING CAMERA MODAL */}
            {pairingUser && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 backdrop-blur-xl p-6 overflow-y-auto">
                    <div className="my-auto w-full max-w-sm flex flex-col items-center">
                        <div className="text-center mb-6 z-10">
                            <h2 className="text-2xl font-black text-white tracking-wide">Assign Badge</h2>
                            <p className="text-teal-400 font-bold uppercase tracking-widest mt-1 text-[11px]">To: {pairingUser.name}</p>
                        </div>
                        <div className="relative w-full max-w-sm aspect-square bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-[0_0_50px_rgba(20,184,166,0.2)] border border-teal-500/30 z-10 group">
                            <div className="absolute top-6 left-6 w-8 h-8 border-t-4 border-l-4 border-teal-500/70 rounded-tl-xl pointer-events-none z-10"></div>
                            <div className="absolute top-6 right-6 w-8 h-8 border-t-4 border-r-4 border-teal-500/70 rounded-tr-xl pointer-events-none z-10"></div>
                            <div className="absolute bottom-6 left-6 w-8 h-8 border-b-4 border-l-4 border-teal-500/70 rounded-bl-xl pointer-events-none z-10"></div>
                            <div className="absolute bottom-6 right-6 w-8 h-8 border-b-4 border-r-4 border-teal-500/70 rounded-br-xl pointer-events-none z-10"></div>
                            <div id="pair-reader" className="w-full h-full object-cover"></div>
                        </div>
                        <button onClick={stopCamera} className="mt-8 px-8 py-4 bg-white/10 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl hover:bg-white/20 transition-all z-10 flex items-center gap-2">
                            <i className="ph-bold ph-x"></i> Cancel Pairing
                        </button>

                        {pairResult && (
                            <div className="absolute inset-0 z-[110] flex items-center justify-center bg-slate-950/90 p-6 animate-enter">
                                <div className={`bg-slate-900 w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl border ${pairResult.type === 'success' ? 'border-emerald-500/50' : 'border-rose-500/50'}`}>
                                    <div className={`p-8 text-center border-b ${pairResult.type === 'success' ? 'border-emerald-500/20' : 'border-rose-500/20'}`}>
                                        <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 border-4 ${pairResult.type === 'success' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-rose-500/20 border-rose-500 text-rose-400'}`}>
                                            <i className={`ph-fill text-4xl ${pairResult.type === 'success' ? 'ph-link' : 'ph-x'}`}></i>
                                        </div>
                                        <h3 className={`text-2xl font-black ${pairResult.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>{pairResult.title}</h3>
                                        <p className="text-[11px] font-bold mt-2 text-slate-300 uppercase tracking-widest">{pairResult.message}</p>
                                    </div>
                                    <div className="p-6 bg-slate-900/50">
                                        <button onClick={handleNextAction} className={`w-full py-4 text-white font-black tracking-widest uppercase text-[11px] rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2 ${pairResult.type === 'success' ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-rose-500 hover:bg-rose-400'}`}>
                                            <i className={`ph-bold ${pairResult.type === 'success' ? 'ph-check' : 'ph-arrow-counter-clockwise'}`}></i>
                                            {pairResult.type === 'success' ? 'Finish' : 'Try Again'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 🚶 WALK-IN & ✏️ EDIT MODALS */}
            {(isWalkinOpen || isEditOpen) && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-6 overflow-y-auto">
                    <div className="my-auto bg-slate-900 w-full max-w-sm rounded-[2.5rem] border border-white/10 p-8 shadow-2xl animate-enter">
                        <h3 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                            <i className={`ph-fill ${isWalkinOpen ? 'ph-user-plus text-teal-400' : 'ph-pencil-line text-blue-400'}`}></i>
                            {isWalkinOpen ? 'Walk-in Entry' : 'Edit Record'}
                        </h3>
                        <form onSubmit={(e) => { 
                            e.preventDefault(); 
                            if (isWalkinOpen) handleWalkinAction('link'); 
                            else handleEditSubmit(e); 
                        }} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 ml-2 tracking-widest">Full Name</label>
                                <input required value={isWalkinOpen ? walkinData.name : editData.name} onChange={(e) => isWalkinOpen ? setWalkinData({...walkinData, name: e.target.value}) : setEditData({...editData, name: e.target.value})} className="w-full bg-slate-800 border border-white/5 rounded-2xl py-4 px-5 text-white font-bold focus:border-teal-400 focus:outline-none" placeholder={isWalkinOpen ? "e.g. Jagannath Das" : ""} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 ml-2 tracking-widest">Category</label>
                                <select value={isWalkinOpen ? walkinData.category : editData.category} onChange={(e) => isWalkinOpen ? setWalkinData({...walkinData, category: e.target.value}) : setEditData({...editData, category: e.target.value})} className="w-full bg-slate-800 border border-white/5 rounded-2xl py-4 px-5 text-white font-bold focus:border-teal-400 focus:outline-none">
                                    <option value="Participant">Participant</option>
                                    <option value="Volunteer">Volunteer</option>
                                    <option value="Guest">Guest</option>
                                </select>
                            </div>
                            
                            {/* DYNAMIC BUTTONS FOR WALKIN VS EDIT */}
                            {isWalkinOpen ? (
                                <div className="flex flex-col gap-3 pt-4">
                                    <button 
                                        type="submit" 
                                        disabled={isSubmitting || !walkinData.name} 
                                        className="w-full py-4 bg-teal-500 hover:bg-teal-400 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-[0_0_20px_rgba(20,184,166,0.3)] active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                        <i className="ph-bold ph-qr-code text-lg"></i>
                                        {isSubmitting ? 'Processing...' : 'Add & Link Badge Now'}
                                    </button>
                                    
                                    <div className="flex gap-3">
                                        <button 
                                            type="button" 
                                            onClick={() => {setIsWalkinOpen(false); setWalkinData({ name: '', category: 'Participant' });}} 
                                            className="flex-1 py-4 bg-white/5 text-slate-400 font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-white/10 transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => handleWalkinAction('close')} 
                                            disabled={isSubmitting || !walkinData.name} 
                                            className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-teal-400 border border-teal-500/30 font-black uppercase text-[10px] tracking-widest rounded-2xl active:scale-95 transition-all"
                                        >
                                            Add & Close
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex gap-3 pt-4">
                                    <button type="button" onClick={() => setIsEditOpen(false)} className="flex-1 py-4 bg-white/5 text-slate-400 font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-white/10 transition-all">Cancel</button>
                                    <button type="submit" disabled={isSubmitting} className="flex-1 py-4 bg-blue-500 hover:bg-blue-400 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-lg active:scale-95 transition-all">
                                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ParticipantList;