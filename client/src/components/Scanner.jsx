import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../api/axios';

const Scanner = () => {
    const [isScanning, setIsScanning] = useState(false);
    const [scanResult, setScanResult] = useState(null);
    const [config, setConfig] = useState({ activeMeal: 'Lunch', isScannerLocked: false });
    const [loadingConfig, setLoadingConfig] = useState(true);
    const scannerRef = useRef(null);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await api.get('/scans/config');
                setConfig(res.data);
            } catch (err) {
                console.error("Failed to fetch scanner config", err);
            } finally {
                setLoadingConfig(false);
            }
        };
        fetchConfig();
    }, []);

    const startScanner = async () => {
        if (config.isScannerLocked) return; 
        
        setIsScanning(true);
        setScanResult(null);
        
        try {
            scannerRef.current = new Html5Qrcode("reader");
            await scannerRef.current.start(
                { facingMode: "environment" },
                { fps: 15 }, // Edge-to-edge scanning
                onScanSuccess,
                onScanFailure
            );
        } catch (err) {
            console.error("Camera Start Error:", err);
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
        if (scannerRef.current && isScanning) scannerRef.current.resume();
    };

    if (loadingConfig) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] w-full max-w-md mx-auto space-y-4">
                <div className="w-8 h-8 border-2 border-white/10 border-t-teal-400 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (config.isScannerLocked) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] bg-slate-900/50 backdrop-blur-xl p-8 rounded-[2rem] border border-white/5 text-center w-full max-w-md mx-auto shadow-2xl">
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-white/5">
                    <i className="ph-light ph-lock-key text-3xl text-slate-400"></i>
                </div>
                <h3 className="text-xl font-light text-white mb-2 tracking-wide">Terminal Locked</h3>
                <p className="text-sm text-slate-500 font-light">Scanning is currently paused by the administrator.</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-md mx-auto relative z-20 pb-10 space-y-6">
            
            {/* 🎨 INLINE CSS FOR THE LASER ANIMATION */}
            <style>{`
                @keyframes laserSweep {
                    0% { top: 10%; opacity: 0.2; }
                    50% { opacity: 1; }
                    100% { top: 90%; opacity: 0.2; }
                }
                .scanner-laser {
                    animation: laserSweep 2.5s ease-in-out infinite alternate;
                    background: linear-gradient(to right, transparent, #2dd4bf, transparent);
                    height: 2px;
                    box-shadow: 0 0 15px #2dd4bf;
                }
            `}</style>

            {/* Elegant Glass Header */}
            <div className="bg-slate-900/60 backdrop-blur-xl rounded-[2rem] p-5 flex items-center justify-between border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center border border-white/10 shadow-inner">
                        <i className="ph-light ph-aperture text-2xl text-teal-400"></i>
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-400 font-semibold tracking-[0.2em] uppercase mb-1">Active Queue</p>
                        <p className="text-lg font-light text-white tracking-wide">{config.activeMeal}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-teal-500/10 rounded-full border border-teal-500/20 shadow-inner">
                    <div className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(45,212,191,1)]"></div>
                    <span className="text-[10px] font-semibold tracking-widest text-teal-400 uppercase">Live</span>
                </div>
            </div>

            {/* 📸 COMPACT SQUARE CAMERA VIEWPORT */}
            <div className="relative w-[85%] max-w-[320px] mx-auto aspect-square bg-slate-950 rounded-[2rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 ring-1 ring-white/5 mt-8">
                
                {/* The Video Feed */}
                <div id="reader" className="w-full h-full object-cover"></div>

                {/* 🔴 THE LASER SCANNER EFFECT */}
                {isScanning && (
                    <>
                        <div className="absolute left-6 right-6 scanner-laser z-20 pointer-events-none"></div>
                        
                        {/* Elegant Corner Reticles (Tighter for square box) */}
                        <div className="absolute top-6 left-6 w-10 h-10 border-t-2 border-l-2 border-white/30 rounded-tl-2xl z-10 pointer-events-none transition-all duration-300"></div>
                        <div className="absolute top-6 right-6 w-10 h-10 border-t-2 border-r-2 border-white/30 rounded-tr-2xl z-10 pointer-events-none transition-all duration-300"></div>
                        <div className="absolute bottom-6 left-6 w-10 h-10 border-b-2 border-l-2 border-white/30 rounded-bl-2xl z-10 pointer-events-none transition-all duration-300"></div>
                        <div className="absolute bottom-6 right-6 w-10 h-10 border-b-2 border-r-2 border-white/30 rounded-br-2xl z-10 pointer-events-none transition-all duration-300"></div>
                    </>
                )}
                
                {/* Elegant Inactive Overlay */}
                {!isScanning && (
                    <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-900/80 backdrop-blur-md">
                        <button 
                            onClick={startScanner} 
                            className="group flex flex-col items-center outline-none"
                        >
                            <div className="w-20 h-20 bg-white/5 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/10 transition-all duration-500 group-hover:scale-105 group-hover:bg-white/10 active:scale-95 shadow-[0_0_40px_rgba(0,0,0,0.3)]">
                                <i className="ph-light ph-camera text-3xl text-teal-400/80 group-hover:text-teal-300 transition-colors"></i>
                            </div>
                            <span className="mt-5 text-[10px] font-semibold tracking-[0.25em] text-slate-300 uppercase transition-colors group-hover:text-white">
                                Activate Lens
                            </span>
                        </button>
                    </div>
                )}
            </div>

            {/* Refined Stop Button (Moved OUTSIDE the camera box so it doesn't block the view) */}
            {isScanning && (
                <div className="flex justify-center mt-6">
                    <button 
                        onClick={stopScanner} 
                        className="bg-slate-900/80 backdrop-blur-xl border border-white/10 text-white/90 px-8 py-4 rounded-full text-[10px] font-semibold tracking-widest uppercase flex items-center gap-3 hover:bg-rose-500/90 hover:border-rose-500 hover:text-white active:scale-95 transition-all shadow-[0_10px_30px_rgba(0,0,0,0.3)]"
                    >
                        <div className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-pulse"></div>
                        Close Lens
                    </button>
                </div>
            )}

            {/* 💎 Elegant Result Modal */}
            {scanResult && (
                <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-slate-950/40 backdrop-blur-lg pb-6 px-4 animate-enter">
                    <div className="w-full h-full absolute inset-0 cursor-pointer" onClick={closeResult}></div>
                    
                    <div className="relative w-full max-w-md mx-auto bg-slate-900/95 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden p-8 flex flex-col items-center">
                        
                        {/* Soft Glow Behind Icon */}
                        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-48 h-32 blur-[60px] pointer-events-none rounded-full ${scanResult.type === 'success' ? 'bg-teal-500/20' : 'bg-rose-500/20'}`}></div>

                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 border relative z-10 shadow-inner ${scanResult.type === 'success' ? 'bg-teal-500/10 border-teal-500/20 text-teal-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                            <i className={`ph-light text-4xl ${scanResult.type === 'success' ? 'ph-check' : 'ph-x'}`}></i>
                        </div>

                        <h2 className="text-2xl font-light text-white mb-2 tracking-wide relative z-10">
                            {scanResult.title}
                        </h2>
                        <p className="text-sm text-slate-400 font-light mb-8 text-center relative z-10">
                            {scanResult.message}
                        </p>

                        <div className="w-full bg-black/20 rounded-[1.5rem] p-5 border border-white/5 mb-8 shadow-inner relative z-10 text-center">
                            <p className="text-[9px] text-slate-500 font-semibold tracking-[0.2em] uppercase mb-2">Participant ID</p>
                            <p className="text-2xl font-light text-white truncate tracking-wide">
                                {scanResult.participant?.name || 'Unknown User'}
                            </p>
                            {scanResult.participant?.category && (
                                <p className="text-xs text-slate-400 font-light mt-1">{scanResult.participant.category}</p>
                            )}
                        </div>
                        
                        <button 
                            onClick={closeResult} 
                            className={`w-full py-5 text-white font-semibold tracking-[0.2em] uppercase text-[11px] rounded-[1.5rem] active:scale-95 transition-all shadow-lg relative z-10 ${scanResult.type === 'success' ? 'bg-teal-500/90 hover:bg-teal-400' : 'bg-rose-500/90 hover:bg-rose-400'}`}
                        >
                            Continue
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Scanner;