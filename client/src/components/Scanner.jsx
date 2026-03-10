import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../api/axios';

const Scanner = () => {
    const [isScanning, setIsScanning] = useState(false);
    const [scanResult, setScanResult] = useState(null);
    const [config, setConfig] = useState({ activeMeal: 'Lunch', isScannerLocked: false });
    const [loadingConfig, setLoadingConfig] = useState(true);
    const scannerRef = useRef(null);

    // Fetch the live Command Center settings on load
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
                { fps: 15 }, 
                onScanSuccess,
                onScanFailure
            );
        } catch (err) {
            console.error("Camera Start Error:", err);
            setScanResult({ type: 'error', title: 'Camera Error', message: 'Could not access the camera hardware.' });
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
            // The Hybrid Engine
            try {
                const parsedData = JSON.parse(decodedText);
                payload = { qrId: parsedData.qrId, totp: parsedData.totp, mealType: config.activeMeal };
            } catch (e) {
                payload = { qrId: decodedText.trim().toUpperCase(), mealType: config.activeMeal };
            }
            
            const response = await api.post('/scans/verify', payload);

            setScanResult({
                type: 'success',
                title: 'ACCESS GRANTED',
                message: response.data.message,
                participant: response.data.participant
            });

        } catch (error) {
            const errorMsg = error.response?.data?.message || "Invalid QR Payload";
            setScanResult({
                type: 'error',
                title: error.response?.status === 409 ? 'ALREADY SERVED' : 'ACCESS DENIED',
                message: errorMsg,
                participant: error.response?.data?.participant
            });
        }
    };

    const onScanFailure = (error) => { /* Ignore empty frames */ };

    const closeResult = () => {
        setScanResult(null);
        if (scannerRef.current && isScanning) scannerRef.current.resume();
    };

    if (loadingConfig) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] w-full max-w-md mx-auto">
                <div className="relative flex justify-center items-center w-24 h-24 mb-6">
                    <div className="absolute inset-0 border-t-2 border-teal-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-2 border-r-2 border-teal-400 rounded-full animate-[spin_1.5s_linear_infinite_reverse]"></div>
                    <i className="ph-fill ph-scan text-3xl text-teal-300 animate-pulse"></i>
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-teal-300">Synchronizing Uplink</p>
            </div>
        );
    }

    if (config.isScannerLocked) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] bg-rose-500/5 backdrop-blur-3xl p-8 rounded-[3rem] border border-rose-500/20 text-center animate-enter shadow-[0_20px_60px_-15px_rgba(244,63,94,0.3)] w-full max-w-md mx-auto">
                <div className="w-24 h-24 bg-rose-500/20 rounded-[2rem] flex items-center justify-center mb-8 border border-rose-500/30 shadow-[0_0_40px_rgba(244,63,94,0.4)] relative">
                    <div className="absolute inset-0 bg-rose-500 rounded-[2rem] blur-xl opacity-20 animate-pulse"></div>
                    <i className="ph-fill ph-lock-key text-6xl text-rose-400 drop-shadow-lg"></i>
                </div>
                <h3 className="text-4xl font-black text-white tracking-tight mb-2">Locked</h3>
                <p className="text-xs font-bold text-rose-300/80 uppercase tracking-widest leading-relaxed">
                    Command Center has paused access operations.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-enter w-full max-w-md mx-auto relative z-20 pb-10">
            
            {/* 🎯 ULTRA-PREMIUM STATUS HEADER */}
            <div className="relative bg-white/5 backdrop-blur-3xl p-1 rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 to-transparent opacity-50"></div>
                <div className="relative flex items-center justify-between p-4 bg-slate-900/40 rounded-[2rem]">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-teal-400 to-teal-600 rounded-[1.5rem] flex items-center justify-center shadow-[0_0_20px_rgba(20,184,166,0.4)]">
                            <i className="ph-fill ph-target text-2xl text-white"></i>
                        </div>
                        <div>
                            <div className="text-[9px] font-black text-teal-300/70 uppercase tracking-[0.25em] mb-1">Active Target</div>
                            <div className="text-2xl font-black text-white tracking-tight leading-none">{config.activeMeal}</div>
                        </div>
                    </div>
                    <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center gap-2">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(52,211,153,1)]"></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Live</span>
                    </div>
                </div>
            </div>

            {/* 📸 SLEEK PORTRAIT CAMERA CONTAINER */}
            <div className="relative w-full aspect-[3/4] bg-slate-950/80 backdrop-blur-xl rounded-[3rem] overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] border border-white/10 group">
                
                {/* Clean, minimal reticle corners */}
                <div className="absolute top-10 left-10 w-10 h-10 border-t-[3px] border-l-[3px] border-white/30 rounded-tl-2xl pointer-events-none z-10 transition-colors duration-500 group-hover:border-teal-400/80"></div>
                <div className="absolute top-10 right-10 w-10 h-10 border-t-[3px] border-r-[3px] border-white/30 rounded-tr-2xl pointer-events-none z-10 transition-colors duration-500 group-hover:border-teal-400/80"></div>
                <div className="absolute bottom-10 left-10 w-10 h-10 border-b-[3px] border-l-[3px] border-white/30 rounded-bl-2xl pointer-events-none z-10 transition-colors duration-500 group-hover:border-teal-400/80"></div>
                <div className="absolute bottom-10 right-10 w-10 h-10 border-b-[3px] border-r-[3px] border-white/30 rounded-br-2xl pointer-events-none z-10 transition-colors duration-500 group-hover:border-teal-400/80"></div>

                {/* The Video Output */}
                <div id="reader" className="w-full h-full object-cover"></div>
                
                {/* 🚀 REDESIGNED: Symmetrical, High-Tech Activation Button 🚀 */}
                {!isScanning && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm z-[60]">
                        <button 
                            onClick={startScanner} 
                            className="group relative flex flex-col items-center cursor-pointer outline-none"
                        >
                            {/* Glowing Background Pulse */}
                            <div className="absolute inset-0 bg-teal-500/20 blur-2xl rounded-full group-hover:bg-teal-500/40 transition-all duration-500"></div>
                            
                            {/* The Main Button */}
                            <div className="w-28 h-28 bg-gradient-to-b from-slate-800 to-slate-900 border border-teal-500/30 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(20,184,166,0.3)] group-hover:border-teal-400 group-hover:scale-105 active:scale-95 transition-all duration-300 relative z-10">
                                <i className="ph-bold ph-power text-5xl text-teal-500 group-hover:text-white transition-colors"></i>
                            </div>

                            {/* Minimal Tagline */}
                            <div className="mt-8 relative z-10 text-center">
                                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-teal-400 bg-teal-500/10 border border-teal-500/20 px-5 py-2.5 rounded-full shadow-inner block">
                                    Initialize System
                                </span>
                            </div>
                        </button>
                    </div>
                )}

                {/* Floating Stop Button (High Z-Index) */}
                {isScanning && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[60]">
                        <button 
                            onClick={stopScanner} 
                            className="bg-slate-900/90 backdrop-blur-xl border border-white/10 text-white px-8 py-4 rounded-full font-black text-[10px] uppercase tracking-widest flex items-center gap-3 hover:bg-rose-500 hover:border-rose-400 transition-all duration-300 active:scale-95 shadow-[0_10px_30px_rgba(0,0,0,0.5)] group/btn"
                        >
                            <div className="w-2 h-2 bg-rose-500 rounded-full group-hover/btn:bg-white animate-pulse"></div>
                            Disengage
                        </button>
                    </div>
                )}
            </div>

            {/* ✨ APPLE-PAY STYLE RESULT MODAL ✨ */}
            {scanResult && (
                <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-slate-950/80 backdrop-blur-md pb-6 px-4 animate-enter">
                    <div className="w-full h-full absolute inset-0 cursor-pointer" onClick={closeResult}></div>
                    
                    <div className={`relative w-full max-w-md mx-auto rounded-[3rem] overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,1)] border ${scanResult.type === 'success' ? 'bg-slate-900 border-emerald-500/30' : 'bg-slate-900 border-rose-500/30'} transform transition-all`}>
                        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 blur-[80px] rounded-full pointer-events-none ${scanResult.type === 'success' ? 'bg-emerald-500/40' : 'bg-rose-500/40'}`}></div>

                        <div className="relative pt-12 pb-8 px-6 flex flex-col items-center">
                            <div className="relative mb-6">
                                <div className={`absolute inset-0 rounded-full animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite] opacity-20 ${scanResult.type === 'success' ? 'bg-emerald-400' : 'bg-rose-400'}`}></div>
                                <div className={`w-28 h-28 rounded-full flex items-center justify-center border-4 relative z-10 ${scanResult.type === 'success' ? 'bg-emerald-500/10 border-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.3)]' : 'bg-rose-500/10 border-rose-400 shadow-[0_0_40px_rgba(244,63,94,0.3)]'}`}>
                                    <i className={`ph-fill ${scanResult.type === 'success' ? 'ph-check-circle text-6xl text-emerald-400' : 'ph-warning-circle text-6xl text-rose-400'} drop-shadow-lg`}></i>
                                </div>
                            </div>

                            <h2 className={`text-3xl font-black tracking-tight mb-2 text-center ${scanResult.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {scanResult.title}
                            </h2>
                            <p className="text-[11px] font-bold text-slate-300 uppercase tracking-[0.2em] text-center bg-black/20 px-4 py-2 rounded-xl mb-6 border border-white/5">
                                {scanResult.message}
                            </p>

                            <div className="w-full bg-slate-950/50 border border-white/5 rounded-[2rem] p-6 text-center shadow-inner mb-6">
                                <div className="text-[9px] font-black uppercase text-slate-500 tracking-[0.25em] mb-2">Identity Confirmed</div>
                                <div className="text-3xl font-black text-white leading-none truncate px-2">
                                    {scanResult.participant?.name || 'Unidentified'}
                                </div>
                                {scanResult.participant?.category && (
                                    <div className="inline-block mt-4 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border bg-white/5 border-white/10 text-slate-300">
                                        Role: {scanResult.participant.category}
                                    </div>
                                )}
                            </div>
                            
                            <button 
                                onClick={closeResult} 
                                className={`w-full py-5 text-white font-black tracking-[0.2em] uppercase text-xs rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 ${scanResult.type === 'success' ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_10px_30px_rgba(16,185,129,0.3)]' : 'bg-gradient-to-r from-rose-500 to-rose-400 shadow-[0_10px_30px_rgba(244,63,94,0.3)]'}`}
                            >
                                <i className="ph-bold ph-scan text-xl"></i>
                                Scan Next
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Scanner;