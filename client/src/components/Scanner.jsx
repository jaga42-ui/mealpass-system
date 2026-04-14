import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../api/axios';

const Scanner = () => {
    // --- STATE ---
    const [mode, setMode] = useState('meal'); // 'meal' or 'pairing'
    const [isScanning, setIsScanning] = useState(false);
    const [scanResult, setScanResult] = useState(null);
    const [config, setConfig] = useState({ activeMeal: 'Lunch', isScannerLocked: false });
    const [loadingConfig, setLoadingConfig] = useState(true);
    const scannerRef = useRef(null);

    // --- PAIRING MODE STATE ---
    const [participants, setParticipants] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedParticipant, setSelectedParticipant] = useState(null); // Holds the selected user BEFORE scanning
    const [isPairing, setIsPairing] = useState(false);

    // 🔄 Polling Config
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await api.get(`/admin/settings?t=${new Date().getTime()}`);
                setConfig(res.data);
            } catch (err) {
                console.error("Failed to fetch scanner config", err);
            } finally {
                setLoadingConfig(false);
            }
        };
        fetchConfig();
        const intervalId = setInterval(fetchConfig, 5000);
        return () => clearInterval(intervalId);
    }, []);

    // Fetch Participants when switching to Pairing Mode
    useEffect(() => {
        if (mode === 'pairing' && participants.length === 0) {
            api.get('/admin/participants')
               .then(res => setParticipants(res.data))
               .catch(err => console.error("Failed to fetch roster", err));
        }
    }, [mode]);

    // Terminal Lockdown Kill Switch
    useEffect(() => {
        if (config.isScannerLocked && isScanning) stopScanner();
    }, [config.isScannerLocked, isScanning]);

    const startScanner = async () => {
        if (config.isScannerLocked) return; 
        
        setIsScanning(true);
        setScanResult(null);
        
        try {
            scannerRef.current = new Html5Qrcode("reader");
            await scannerRef.current.start(
                { facingMode: "environment" },
                { fps: 15 }, 
                onScanSuccess,
                onScanFailure
            );
        } catch (err) {
            setScanResult({ type: 'error', title: 'Hardware Error', message: 'Could not access the camera lens.' });
            setIsScanning(false);
        }
    };

    const stopScanner = async () => {
        if (scannerRef.current && isScanning) {
            try { await scannerRef.current.stop(); scannerRef.current.clear(); } 
            catch (err) { console.error("Stop error", err); }
        }
        setIsScanning(false);
        scannerRef.current = null;
    };

    const onScanSuccess = async (decodedText) => {
        if (scannerRef.current) scannerRef.current.pause();

        // 🟢 BRANCH 1: REGISTRATION MODE (Badge scanned AFTER participant is selected)
        if (mode === 'pairing') {
            if (!decodedText.includes('-')) {
                setScanResult({ type: 'error', title: 'Invalid Badge', message: 'This is not a valid blank Aahaaram badge. Cannot link.' });
                return;
            }
            // Trigger the pairing API immediately
            await handlePairBadge(selectedParticipant._id, decodedText);
            return;
        }

        // 🔵 BRANCH 2: MEAL QUEUE MODE (Standard Scanning)
        try {
            let payload = {};
            try {
                const parsedData = JSON.parse(decodedText);
                payload = { qrId: parsedData.qrId, totp: parsedData.totp, mealType: config.activeMeal };
            } catch (e) {
                payload = { qrId: decodedText.trim().toUpperCase(), mealType: config.activeMeal };
            }
            
            const response = await api.post('/scans/verify', payload);

            setScanResult({
                type: 'success',
                title: 'Access Approved',
                message: response.data.message,
                participant: response.data.participant
            });

        } catch (error) {
            const errorMsg = error.response?.data?.message || "Unrecognized signature";
            setScanResult({
                type: 'error',
                title: error.response?.status === 409 ? 'Already Scanned' : 'Access Denied',
                message: errorMsg,
                participant: error.response?.data?.participant
            });
        }
    };

    const onScanFailure = () => { /* Ignore empty frames */ };

    const closeResult = () => {
        setScanResult(null);
        if (scannerRef.current && isScanning && !config.isScannerLocked) {
            scannerRef.current.resume();
        }
    };

    const handlePairBadge = async (participantId, qrString) => {
        setIsPairing(true);
        try {
            const res = await api.post('/admin/pair-badge', { participantId, qrString });
            
            // Remove the newly assigned participant from our local list
            setParticipants(prev => prev.filter(p => p._id !== participantId));
            
            // Reset the selection so they can search for the next person
            setSelectedParticipant(null);
            
            setScanResult({
                type: 'success',
                title: 'Badge Linked!',
                message: res.data.message,
                participant: res.data.participant
            });
        } catch (err) {
            setScanResult({
                type: 'error',
                title: 'Pairing Failed',
                message: err.response?.data?.message || 'Failed to link badge.'
            });
        } finally {
            setIsPairing(false);
        }
    };

    // Filter unassigned participants
    const unassignedParticipants = participants.filter(p => 
        !p.qrId && p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loadingConfig) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] w-full max-w-md mx-auto space-y-4">
                <div className="w-8 h-8 border-2 border-white/10 border-t-teal-400 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (config.isScannerLocked) {
        return (
            <div className="min-h-[80vh] w-full max-w-md mx-auto flex flex-col items-center justify-center bg-stone-950 rounded-[2.5rem] border border-rose-500/20 p-8 text-center animate-enter relative overflow-hidden mt-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-rose-500/10 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-orange-500/10 rounded-full blur-[80px] pointer-events-none"></div>

                <div className="w-24 h-24 bg-rose-500/10 border border-rose-500/30 rounded-[2rem] flex items-center justify-center shadow-[0_0_40px_rgba(244,63,94,0.3)] mb-8 relative z-10">
                    <i className="ph-fill ph-lock-key text-5xl text-rose-500 animate-pulse"></i>
                </div>

                <h2 className="text-3xl font-black text-white tracking-tight mb-4 relative z-10">
                    Terminal Locked
                </h2>
                
                <p className="text-rose-400/80 text-[10px] font-bold uppercase tracking-[0.2em] max-w-[250px] relative z-10 leading-relaxed mx-auto">
                    Scanning operations are suspended by Command Center. Wait for authorization.
                </p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-md mx-auto relative z-20 pb-10 space-y-6">
            
            {/* DYNAMIC LASER CSS */}
            <style>{`
                @keyframes laserSweep {
                    0% { top: 10%; opacity: 0.2; }
                    50% { opacity: 1; }
                    100% { top: 90%; opacity: 0.2; }
                }
                .scanner-laser {
                    animation: laserSweep 2.5s ease-in-out infinite alternate;
                    background: linear-gradient(to right, transparent, ${mode === 'pairing' ? '#818cf8' : '#2dd4bf'}, transparent);
                    height: 2px;
                    box-shadow: 0 0 15px ${mode === 'pairing' ? '#818cf8' : '#2dd4bf'};
                }
            `}</style>

            {/* 🎛️ MODE SWITCHER */}
            <div className="flex bg-slate-900/60 backdrop-blur-xl border border-white/10 p-1.5 rounded-2xl mb-4 shadow-lg">
                <button
                    onClick={() => { setMode('meal'); setSelectedParticipant(null); if(isScanning) stopScanner(); }}
                    className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${mode === 'meal' ? 'bg-teal-500 text-slate-900 shadow-md scale-[1.02]' : 'text-slate-500 hover:text-white'}`}
                >
                    Meal Queue
                </button>
                <button
                    onClick={() => { setMode('pairing'); if(isScanning) stopScanner(); }}
                    className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${mode === 'pairing' ? 'bg-indigo-500 text-white shadow-md scale-[1.02]' : 'text-slate-500 hover:text-white'}`}
                >
                    Link Badges
                </button>
            </div>

            {/* Dynamic Glass Header */}
            <div className={`bg-slate-900/60 backdrop-blur-xl rounded-[2rem] p-5 flex items-center justify-between border border-white/10 transition-colors duration-500 ${mode === 'pairing' ? 'shadow-[0_8px_30px_rgba(99,102,241,0.1)]' : 'shadow-[0_8px_30px_rgba(20,184,166,0.1)]'}`}>
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center border border-white/10 shadow-inner">
                        <i className={`ph-light text-2xl ${mode === 'pairing' ? 'ph-link text-indigo-400' : 'ph-aperture text-teal-400'}`}></i>
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-400 font-semibold tracking-[0.2em] uppercase mb-1">
                            {mode === 'pairing' ? 'Registration Desk' : 'Active Queue'}
                        </p>
                        <p className="text-lg font-light text-white tracking-wide">
                            {mode === 'pairing' ? 'Pairing Mode' : config.activeMeal}
                        </p>
                    </div>
                </div>
            </div>

            {/* 🔗 THE ROSTER SEARCH UI (Only shows when Pairing mode is active AND no one is selected) */}
            {mode === 'pairing' && !selectedParticipant && (
                <div className="w-full bg-slate-900/60 backdrop-blur-xl border border-indigo-500/30 rounded-[2.5rem] p-6 shadow-2xl flex flex-col h-[60vh] animate-enter">
                    <h2 className="text-xl font-black text-white mb-1 shrink-0">Find Participant</h2>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-5 shrink-0">
                        Select a person to assign a badge
                    </p>

                    <div className="bg-slate-950 border border-white/10 rounded-2xl px-4 py-3 mb-4 shrink-0 flex items-center gap-3 shadow-inner">
                        <i className="ph-bold ph-magnifying-glass text-slate-500"></i>
                        <input
                            type="text"
                            placeholder="Search name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-transparent text-sm font-bold text-white placeholder-slate-600 focus:outline-none"
                        />
                    </div>

                    <div className="overflow-y-auto flex-1 space-y-2 pr-2 custom-scrollbar">
                        {unassignedParticipants.length === 0 ? (
                            <div className="text-center py-10 border border-dashed border-white/10 rounded-2xl">
                                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">No matches found</p>
                                <p className="text-slate-600 text-xs">All matching participants have badges.</p>
                            </div>
                        ) : (
                            unassignedParticipants.map(p => (
                                <div key={p._id} className="flex items-center justify-between bg-black/40 p-3 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-colors">
                                    <div className="truncate mr-4">
                                        <p className="text-sm font-bold text-white truncate">{p.name}</p>
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest truncate">{p.category || 'Participant'}</p>
                                    </div>
                                    <button
                                        onClick={() => setSelectedParticipant(p)}
                                        className="shrink-0 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500 hover:text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                                    >
                                        Select
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}


            {/* 📸 COMPACT SQUARE CAMERA VIEWPORT (Shows for Meal Mode, OR if someone is selected in Pairing Mode) */}
            {(mode === 'meal' || (mode === 'pairing' && selectedParticipant)) && (
                <>
                    {/* Targeting Prompt Overlay for Pairing Mode */}
                    {mode === 'pairing' && selectedParticipant && (
                        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-2xl p-4 flex items-center justify-between shadow-inner animate-enter">
                            <div className="truncate pr-4">
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400 block mb-1">Target Participant</span>
                                <span className="text-sm font-bold text-white truncate block">{selectedParticipant.name}</span>
                            </div>
                            <button 
                                onClick={() => { setSelectedParticipant(null); if(isScanning) stopScanner(); }}
                                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
                            >
                                <i className="ph-bold ph-x"></i>
                            </button>
                        </div>
                    )}

                    <div className={`relative w-[85%] max-w-[320px] mx-auto aspect-square bg-slate-950 rounded-[2rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border ${mode === 'pairing' ? 'border-indigo-500/50 ring-indigo-500/20' : 'border-white/10 ring-white/5'} ring-1 mt-8`}>
                        
                        <div id="reader" className="w-full h-full object-cover"></div>

                        {isScanning && (
                            <>
                                <div className="absolute left-6 right-6 scanner-laser z-20 pointer-events-none"></div>
                                <div className="absolute top-6 left-6 w-10 h-10 border-t-2 border-l-2 border-white/30 rounded-tl-2xl z-10 pointer-events-none"></div>
                                <div className="absolute top-6 right-6 w-10 h-10 border-t-2 border-r-2 border-white/30 rounded-tr-2xl z-10 pointer-events-none"></div>
                                <div className="absolute bottom-6 left-6 w-10 h-10 border-b-2 border-l-2 border-white/30 rounded-bl-2xl z-10 pointer-events-none"></div>
                                <div className="absolute bottom-6 right-6 w-10 h-10 border-b-2 border-r-2 border-white/30 rounded-br-2xl z-10 pointer-events-none"></div>
                                
                                {mode === 'pairing' && (
                                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-indigo-500/90 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg z-30 animate-pulse">
                                        Scan Blank Badge Now
                                    </div>
                                )}
                            </>
                        )}
                        
                        {!isScanning && (
                            <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-900/80 backdrop-blur-md">
                                <button onClick={startScanner} className="group flex flex-col items-center outline-none">
                                    <div className={`w-20 h-20 bg-white/5 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/10 transition-all duration-500 group-hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(0,0,0,0.3)] ${mode === 'pairing' ? 'group-hover:bg-indigo-500/20' : 'group-hover:bg-teal-500/20'}`}>
                                        <i className={`ph-light ph-camera text-3xl transition-colors ${mode === 'pairing' ? 'text-indigo-400' : 'text-teal-400'}`}></i>
                                    </div>
                                    <span className="mt-5 text-[10px] font-semibold tracking-[0.25em] text-slate-300 uppercase">
                                        Activate Lens
                                    </span>
                                </button>
                            </div>
                        )}
                    </div>

                    {isScanning && (
                        <div className="flex justify-center mt-6">
                            <button onClick={stopScanner} className="bg-slate-900/80 backdrop-blur-xl border border-white/10 text-white/90 px-8 py-4 rounded-full text-[10px] font-semibold tracking-widest uppercase flex items-center gap-3 hover:bg-rose-500/90 hover:border-rose-500 active:scale-95 transition-all shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
                                <div className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-pulse"></div>
                                Close Lens
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* 💎 Standard Scan Result Modal */}
            {scanResult && (
                <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-slate-950/40 backdrop-blur-lg pb-6 px-4 animate-enter overflow-y-auto">
                    <div className="w-full h-full absolute inset-0 cursor-pointer" onClick={closeResult}></div>
                    
                    <div className="relative w-full max-w-md mx-auto bg-slate-900/95 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden p-8 flex flex-col items-center my-auto max-h-[90vh] overflow-y-auto no-scrollbar">
                        
                        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-48 h-32 blur-[60px] pointer-events-none rounded-full ${scanResult.type === 'success' ? (mode === 'pairing' ? 'bg-indigo-500/20' : 'bg-teal-500/20') : 'bg-rose-500/20'}`}></div>

                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 border relative z-10 shadow-inner shrink-0 ${scanResult.type === 'success' ? (mode === 'pairing' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-teal-500/10 border-teal-500/20 text-teal-400') : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                            {isPairing ? (
                                <i className="ph-bold ph-spinner animate-spin text-4xl"></i>
                            ) : (
                                <i className={`ph-light text-4xl ${scanResult.type === 'success' ? 'ph-check' : 'ph-x'}`}></i>
                            )}
                        </div>

                        <h2 className="text-2xl font-light text-white mb-2 tracking-wide relative z-10 text-center">
                            {scanResult.title}
                        </h2>
                        <p className="text-sm text-slate-400 font-light mb-8 text-center relative z-10">
                            {scanResult.message}
                        </p>

                        {scanResult.participant && (
                            <div className="w-full bg-black/20 rounded-[1.5rem] p-5 border border-white/5 mb-8 shadow-inner relative z-10 text-center">
                                <p className="text-[9px] text-slate-500 font-semibold tracking-[0.2em] uppercase mb-2">Participant ID</p>
                                <p className="text-2xl font-light text-white truncate tracking-wide">
                                    {scanResult.participant.name}
                                </p>
                                {scanResult.participant.category && (
                                    <p className="text-xs text-slate-400 font-light mt-1">{scanResult.participant.category}</p>
                                )}

                                {scanResult.participant.metadata && Object.keys(scanResult.participant.metadata).length > 0 && (
                                    <div className="mt-5 border-t border-white/10 pt-5">
                                        <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-teal-500/70 mb-3 text-left">Additional Details</h4>
                                        <div className="grid grid-cols-2 gap-2 text-left">
                                            {Object.entries(scanResult.participant.metadata).map(([key, value]) => (
                                                <div key={key} className="bg-slate-900/50 border border-white/5 p-3 rounded-2xl flex flex-col justify-center">
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1 truncate">{key}</span>
                                                    <span className="text-xs font-bold text-slate-300 truncate" title={String(value)}>{String(value)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        <button 
                            onClick={closeResult} 
                            disabled={isPairing}
                            className={`w-full py-5 text-white font-semibold tracking-[0.2em] uppercase text-[11px] rounded-[1.5rem] active:scale-95 transition-all shadow-lg relative z-10 shrink-0 ${isPairing ? 'bg-slate-800 text-slate-500' : scanResult.type === 'success' ? (mode === 'pairing' ? 'bg-indigo-500/90 hover:bg-indigo-400' : 'bg-teal-500/90 hover:bg-teal-400') : 'bg-rose-500/90 hover:bg-rose-400'}`}
                        >
                            {isPairing ? 'Processing...' : 'Continue'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Scanner;