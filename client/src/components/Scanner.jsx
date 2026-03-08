import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../api/axios';

const Scanner = () => {
    const [isScanning, setIsScanning] = useState(false);
    const [scanResult, setScanResult] = useState(null);
    const [config, setConfig] = useState({ activeMeal: 'Lunch', isScannerLocked: false });
    const [loadingConfig, setLoadingConfig] = useState(true);
    const scannerRef = useRef(null);

    // 1. Fetch the live Command Center settings on load
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
                { fps: 10, qrbox: { width: 250, height: 250 } },
                onScanSuccess,
                onScanFailure
            );
        } catch (err) {
            console.error("Camera Start Error:", err);
            setScanResult({ type: 'error', title: 'Camera Error', message: 'Could not access the camera.' });
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

            // THE HYBRID ENGINE
            try {
                const parsedData = JSON.parse(decodedText);
                payload = {
                    qrId: parsedData.qrId,
                    totp: parsedData.totp,
                    mealType: config.activeMeal
                };
            } catch (e) {
                payload = {
                    qrId: decodedText.trim().toUpperCase(),
                    mealType: config.activeMeal
                };
            }
            
            const response = await api.post('/scans/verify', payload);

            setScanResult({
                type: 'success',
                title: 'ACCESS GRANTED',
                message: response.data.message,
                participant: response.data.participant
            });

        } catch (error) {
            const errorMsg = error.response?.data?.message || "Invalid QR Code format";
            setScanResult({
                type: 'error',
                title: error.response?.status === 409 ? 'ALREADY SERVED' : 'ACCESS DENIED',
                message: errorMsg,
                participant: error.response?.data?.participant
            });
        }
    };

    const onScanFailure = (error) => { /* ignore empty scans */ };

    const closeResult = () => {
        setScanResult(null);
        if (scannerRef.current && isScanning) scannerRef.current.resume();
    };

    if (loadingConfig) {
        return (
            <div className="flex flex-col items-center justify-center py-20 animate-pulse w-full max-w-md mx-auto">
                <i className="ph-duotone ph-arrows-clockwise text-4xl text-teal-500 animate-spin mb-4 shadow-[0_0_20px_rgba(20,184,166,0.5)] rounded-full"></i>
                <p className="text-[10px] font-black uppercase tracking-widest text-teal-300">Syncing with Command...</p>
            </div>
        );
    }

    // THE LOCKDOWN SCREEN
    if (config.isScannerLocked) {
        return (
            <div className="flex flex-col items-center justify-center h-80 bg-slate-900/80 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-red-500/30 text-center animate-enter shadow-[0_20px_50px_-10px_rgba(239,68,68,0.2)] w-full max-w-md mx-auto relative overflow-hidden">
                <div className="absolute inset-0 bg-red-500/5 animate-pulse"></div>
                <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(239,68,68,0.4)] relative z-10">
                    <i className="ph-fill ph-lock-key text-5xl text-red-500 animate-pulse"></i>
                </div>
                <h3 className="text-3xl font-black text-white tracking-wide relative z-10">System Locked</h3>
                <p className="text-[11px] font-bold text-red-200/70 mt-3 uppercase tracking-widest leading-relaxed relative z-10">
                    The Admin has paused all scanning operations. Please wait for clearance.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-5 animate-enter w-full max-w-md mx-auto relative z-20">
            
            {/* Read-Only Meal Status Header */}
            <div className="bg-white/5 backdrop-blur-2xl p-5 rounded-[2rem] flex items-center justify-between shadow-[0_10px_30px_rgba(0,0,0,0.5)] border border-white/10">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-teal-500/20 border border-teal-500/30 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(20,184,166,0.2)]">
                        <i className="ph-bold ph-crosshair text-2xl text-teal-400"></i>
                    </div>
                    <div>
                        <div className="text-[9px] font-black text-teal-200/50 uppercase tracking-[0.2em] leading-none mb-1">Targeting</div>
                        <div className="text-xl font-black text-white tracking-wide">{config.activeMeal}</div>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-2 rounded-xl shadow-inner">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]"></div>
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] mt-0.5">Live</span>
                </div>
            </div>

            {/* Camera Container */}
            <div className="relative w-full aspect-square bg-slate-950 rounded-[2.5rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-white/10 group">
                {/* The glowing target brackets */}
                <div className="absolute top-6 left-6 w-8 h-8 border-t-4 border-l-4 border-teal-500/70 rounded-tl-xl pointer-events-none z-10"></div>
                <div className="absolute top-6 right-6 w-8 h-8 border-t-4 border-r-4 border-teal-500/70 rounded-tr-xl pointer-events-none z-10"></div>
                <div className="absolute bottom-6 left-6 w-8 h-8 border-b-4 border-l-4 border-teal-500/70 rounded-bl-xl pointer-events-none z-10"></div>
                <div className="absolute bottom-6 right-6 w-8 h-8 border-b-4 border-r-4 border-teal-500/70 rounded-br-xl pointer-events-none z-10"></div>

                <div id="reader" className="w-full h-full opacity-90 object-cover"></div>
                
                {!isScanning && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm z-20">
                        <button 
                            onClick={startScanner} 
                            className="w-24 h-24 bg-teal-500 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(20,184,166,0.6)] hover:scale-105 transition-transform active:scale-95 group-hover:bg-teal-400"
                        >
                            <i className="ph-fill ph-camera text-4xl text-white"></i>
                        </button>
                        <p className="mt-6 text-[11px] font-black text-teal-200 uppercase tracking-[0.3em] drop-shadow-lg">Tap to Scan</p>
                    </div>
                )}
            </div>

            {isScanning && (
                <button 
                    onClick={stopScanner} 
                    className="w-full h-16 bg-white/5 backdrop-blur-xl border border-rose-500/30 text-rose-400 font-black tracking-widest uppercase rounded-2xl shadow-lg hover:bg-rose-500/10 hover:border-rose-500/50 transition-all flex items-center justify-center gap-3 active:scale-95 text-[11px]"
                >
                    <i className="ph-bold ph-stop-circle text-xl"></i>
                    <span className="mt-0.5">Stop Camera</span>
                </button>
            )}

            {/* Neon Dark Mode Result Modal Overlay */}
            {scanResult && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-6">
                    <div className={`bg-slate-900 w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.9)] border ${scanResult.type === 'success' ? 'border-emerald-500/50 shadow-[0_0_50px_rgba(16,185,129,0.2)]' : 'border-rose-500/50 shadow-[0_0_50px_rgba(244,63,94,0.2)]'} animate-enter relative`}>
                        
                        {/* Glowing Background Gradient */}
                        <div className={`absolute top-0 w-full h-32 opacity-20 ${scanResult.type === 'success' ? 'bg-gradient-to-b from-emerald-500 to-transparent' : 'bg-gradient-to-b from-rose-500 to-transparent'}`}></div>

                        <div className={`relative p-6 border-b flex flex-col items-center gap-4 pt-10 ${scanResult.type === 'success' ? 'border-emerald-500/20' : 'border-rose-500/20'}`}>
                            <div className={`w-20 h-20 rounded-full flex items-center justify-center shrink-0 border-4 ${scanResult.type === 'success' ? 'bg-emerald-500/20 border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.5)]' : 'bg-rose-500/20 border-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.5)]'}`}>
                                <i className={`ph-fill ${scanResult.type === 'success' ? 'ph-check text-4xl text-emerald-400' : 'ph-x text-4xl text-rose-400'}`}></i>
                            </div>
                            <div className="text-center mt-2">
                                <div className={`text-2xl font-black tracking-wide leading-none ${scanResult.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {scanResult.title}
                                </div>
                                <div className="text-[11px] font-bold mt-3 text-slate-300 uppercase tracking-widest px-4">
                                    {scanResult.message}
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-8 bg-slate-900/50 relative">
                            <div className="text-center">
                                <div className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] mb-2">Participant ID</div>
                                <div className="text-2xl font-black text-white leading-tight mb-8">
                                    {scanResult.participant?.name || 'Unknown Entity'}
                                </div>
                            </div>
                            
                            <button 
                                onClick={closeResult} 
                                className={`w-full py-4 text-white font-black tracking-widest uppercase text-[11px] rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 ${scanResult.type === 'success' ? 'bg-emerald-500 hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'bg-rose-500 hover:bg-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.3)]'}`}
                            >
                                <i className="ph-bold ph-scan text-lg"></i>
                                <span>Next Scan</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Scanner;