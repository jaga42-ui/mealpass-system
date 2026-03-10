import { useState, useEffect, useMemo, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../api/axios';

const ParticipantList = () => {
    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // Search and Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('All');

    // --- 🛡️ PAIRING SCANNER STATE 🛡️ ---
    const [pairingUser, setPairingUser] = useState(null);
    const [isScanning, setIsScanning] = useState(false);
    const [pairResult, setPairResult] = useState(null);
    const scannerRef = useRef(null);

    const fetchParticipants = async () => {
        setLoading(true);
        try {
            const response = await api.get('/participants');
            setParticipants(response.data);
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

    // Instant Client-Side Filtering
    const filteredParticipants = useMemo(() => {
        return participants.filter(p => {
            const matchesSearch = 
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                (p.qrId && p.qrId.toLowerCase().includes(searchTerm.toLowerCase()));
            
            const matchesFilter = activeFilter === 'All' || p.category === activeFilter;
            
            return matchesSearch && matchesFilter;
        });
    }, [participants, searchTerm, activeFilter]);


    // --- 🛡️ PAIRING SCANNER LOGIC 🛡️ ---
    const openPairingModal = (user) => {
        setPairingUser(user);
        setPairResult(null);
        // Slight delay to allow the modal DOM to render the #pair-reader div
        setTimeout(() => {
            startCamera();
        }, 150);
    };

    const startCamera = async () => {
        setIsScanning(true);
        try {
            scannerRef.current = new Html5Qrcode("pair-reader");
            await scannerRef.current.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                onScanSuccess,
                onScanFailure
            );
        } catch (err) {
            console.error("Camera Start Error:", err);
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
            // Send the raw HMAC string to the backend to verify math and link it
            const response = await api.post('/admin/pair-badge', {
                participantId: pairingUser._id,
                qrString: decodedText.trim()
            });

            setPairResult({
                type: 'success',
                title: 'BADGE LINKED',
                message: response.data.message
            });

            fetchParticipants(); // Refresh list to show the new ID!
        } catch (error) {
            setPairResult({
                type: 'error',
                title: 'PAIRING REJECTED',
                message: error.response?.data?.message || 'Invalid or counterfeit badge.'
            });
        }
    };

    const onScanFailure = () => { /* ignore empty frames */ };

    const handleNextAction = () => {
        if (pairResult?.type === 'success') {
            stopCamera(); // Close everything on success
        } else {
            setPairResult(null);
            if (scannerRef.current) scannerRef.current.resume(); // Try again on error
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
            
            {/* STICKY HEADER AREA */}
            <div className="sticky top-0 z-30 pt-4 pb-4 bg-slate-900/80 backdrop-blur-2xl border-b border-white/10 mx-[-1rem] px-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                
                <div className="flex items-center justify-between mb-5">
                    <h3 className="font-black text-white text-lg flex items-center gap-3 tracking-wide">
                        <div className="w-8 h-8 bg-teal-500/20 border border-teal-500/30 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(20,184,166,0.2)]">
                            <i className="ph-bold ph-users-three text-teal-400"></i>
                        </div>
                        Live Roster
                    </h3>
                    <button 
                        onClick={fetchParticipants} 
                        className="w-8 h-8 rounded-full bg-white/5 border border-white/10 text-teal-300 hover:bg-teal-500/20 hover:text-white active:scale-90 transition-all duration-300 flex items-center justify-center"
                    >
                        <i className="ph-bold ph-arrows-clockwise text-lg"></i>
                    </button>
                </div>

                {/* Search Bar */}
                <div className="relative mb-4 group">
                    <i className="ph-bold ph-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg group-focus-within:text-teal-400 transition-colors"></i>
                    <input 
                        type="text" 
                        placeholder="Search by Name or ID..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-900/50 border border-white/10 rounded-2xl py-3 pl-12 pr-10 text-white font-bold placeholder-slate-500 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-all shadow-inner"
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-teal-400 transition-colors">
                            <i className="ph-fill ph-x-circle text-xl"></i>
                        </button>
                    )}
                </div>

                {/* Filter Pills */}
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
                        <div key={p._id} className="bg-white/5 backdrop-blur-lg p-4 rounded-2xl flex items-center justify-between shadow-[0_5px_15px_rgba(0,0,0,0.2)] hover:bg-white/10 hover:border-teal-500/30 transition-all border border-white/10 group cursor-pointer">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-slate-900/80 flex items-center justify-center shrink-0 border border-white/5 shadow-inner text-slate-500 group-hover:text-teal-400 transition-colors">
                                    <i className="ph-fill ph-user text-2xl"></i>
                                </div>
                                <div>
                                    <h4 className="font-black text-white leading-tight tracking-wide">{p.name}</h4>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        
                                        {/* 🛡️ DYNAMIC BADGE ASSIGNMENT UI 🛡️ */}
                                        {p.qrId ? (
                                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest bg-slate-900/80 border border-white/10 px-2 py-0.5 rounded-md shadow-inner">
                                                {/* Mask the secret signature, only show the ID part for visual cleaniness */}
                                                {p.qrId.split('-')[0]}
                                            </span>
                                        ) : (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); openPairingModal(p); }}
                                                className="text-[9px] font-black text-white uppercase tracking-widest bg-teal-500 hover:bg-teal-400 border border-teal-400/50 px-3 py-1 rounded-md shadow-[0_0_10px_rgba(20,184,166,0.5)] active:scale-95 transition-all flex items-center gap-1"
                                            >
                                                <i className="ph-bold ph-link"></i> Link Badge
                                            </button>
                                        )}

                                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${
                                            p.category === 'Volunteer' ? 'bg-purple-500/10 border-purple-500/30 text-purple-300' : 
                                            p.category === 'Guest' ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 
                                            'bg-teal-500/10 border-teal-500/30 text-teal-300'
                                        }`}>
                                            {p.category}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* 🛡️ PAIRING CAMERA MODAL 🛡️ */}
            {pairingUser && (
                <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-xl p-6">
                    
                    <div className="text-center mb-6 z-10">
                        <h2 className="text-2xl font-black text-white tracking-wide">Assign Badge</h2>
                        <p className="text-teal-400 font-bold uppercase tracking-widest mt-1 text-[11px]">
                            To: {pairingUser.name}
                        </p>
                    </div>

                    <div className="relative w-full max-w-sm aspect-square bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-[0_0_50px_rgba(20,184,166,0.2)] border border-teal-500/30 z-10">
                        {/* Target Brackets */}
                        <div className="absolute top-6 left-6 w-8 h-8 border-t-4 border-l-4 border-teal-500/70 rounded-tl-xl pointer-events-none z-10"></div>
                        <div className="absolute top-6 right-6 w-8 h-8 border-t-4 border-r-4 border-teal-500/70 rounded-tr-xl pointer-events-none z-10"></div>
                        <div className="absolute bottom-6 left-6 w-8 h-8 border-b-4 border-l-4 border-teal-500/70 rounded-bl-xl pointer-events-none z-10"></div>
                        <div className="absolute bottom-6 right-6 w-8 h-8 border-b-4 border-r-4 border-teal-500/70 rounded-br-xl pointer-events-none z-10"></div>

                        <div id="pair-reader" className="w-full h-full object-cover opacity-90"></div>
                    </div>

                    <button 
                        onClick={stopCamera}
                        className="mt-8 px-8 py-4 bg-white/10 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl hover:bg-white/20 active:scale-95 transition-all z-10"
                    >
                        Cancel Pairing
                    </button>

                    {/* Result Overlay */}
                    {pairResult && (
                        <div className="absolute inset-0 z-[110] flex items-center justify-center bg-slate-950/90 p-6 animate-enter">
                            <div className={`bg-slate-900 w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl border ${pairResult.type === 'success' ? 'border-emerald-500/50' : 'border-rose-500/50'}`}>
                                <div className={`p-8 text-center border-b ${pairResult.type === 'success' ? 'border-emerald-500/20' : 'border-rose-500/20'}`}>
                                    <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 border-4 ${pairResult.type === 'success' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-rose-500/20 border-rose-500 text-rose-400'}`}>
                                        <i className={`ph-fill text-4xl ${pairResult.type === 'success' ? 'ph-link' : 'ph-x'}`}></i>
                                    </div>
                                    <h3 className={`text-2xl font-black ${pairResult.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {pairResult.title}
                                    </h3>
                                    <p className="text-[11px] font-bold mt-2 text-slate-300 uppercase tracking-widest">
                                        {pairResult.message}
                                    </p>
                                </div>
                                <div className="p-6 bg-slate-900/50">
                                    <button 
                                        onClick={handleNextAction}
                                        className={`w-full py-4 text-white font-black tracking-widest uppercase text-[11px] rounded-2xl active:scale-95 transition-all ${pairResult.type === 'success' ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-rose-500 hover:bg-rose-400'}`}
                                    >
                                        {pairResult.type === 'success' ? 'Finish' : 'Try Again'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

        </div>
    );
};

export default ParticipantList;