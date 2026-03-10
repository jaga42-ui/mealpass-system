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
            try {
                const parsedData = JSON.parse(decodedText);
                payload = { qrId: parsedData.qrId, totp: parsedData.totp, mealType: config.activeMeal };
            } catch (e) {
                payload = { qrId: decodedText.trim().toUpperCase(), mealType: config.activeMeal };
            }
            
            const response = await api.post('/scans/verify', payload);

            setScanResult({
                type: 'success',
                title: 'Access Granted',
                message: response.data.message,
                participant: response.data.participant
            });

        } catch (error) {
            const errorMsg = error.response?.data?.message || "Invalid Pass";
            setScanResult({
                type: 'error',
                title: error.response?.status === 409 ? 'Already Served' : 'Access Denied',
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
            <div className="flex flex-col items-center justify-center h-[60vh] w-full max-w-md mx-auto">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
                <p className="text-xs font-medium tracking-widest text-slate-400 uppercase">Loading</p>
            </div>
        );
    }

    if (config.isScannerLocked) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 text-center w-full max-w-md mx-auto shadow-sm">
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6 border border-white/10">
                    <i className="ph-light ph-lock-key text-3xl text-slate-300"></i>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Scanner Paused</h3>
                <p className="text-sm text-slate-400">Scanning has been disabled from the command center.</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-md mx-auto relative z-20 pb-10 space-y-6">
            
            {/* Elegant Minimal Header */}
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 flex items-center justify-between border border-white/10 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                        <i className="ph-light ph-scan text-xl text-white"></i>
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-400 font-medium tracking-widest uppercase mb-0.5">Current Session</p>
                        <p className="text-sm font-semibold text-white tracking-wide">{config.activeMeal}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                    <span className="text-[10px] font-medium tracking-widest text-emerald-400 uppercase">Ready</span>
                </div>
            </div>

            {/* Clean Camera Container */}
            <div className="relative w-full aspect-[3/4] bg-slate-900 rounded-[2rem] overflow-hidden shadow-2xl border border-white/10">
                
                {/* Video Feed */}
                <div id="reader" className="w-full h-full object-cover"></div>
                
                {/* Minimalist Start Overlay */}
                {!isScanning && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm">
                        <button 
                            onClick={startScanner} 
                            className="group flex flex-col items-center outline-none"
                        >
                            <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 transition-transform duration-300 group-hover:scale-105 group-active:scale-95 shadow-lg">
                                <i className="ph-light ph-camera text-3xl text-white transition-opacity group-hover:opacity-80"></i>
                            </div>
                            <span className="mt-4 text-[11px] font-medium tracking-widest text-white/90 uppercase">
                                Tap to Scan
                            </span>
                        </button>
                    </div>
                )}

                {/* Minimalist Stop Button */}
                {isScanning && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
                        <button 
                            onClick={stopScanner} 
                            className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-6 py-3 rounded-full text-xs font-medium tracking-widest uppercase flex items-center gap-2 hover:bg-white/20 active:scale-95 transition-all shadow-lg"
                        >
                            Cancel
                        </button>
                    </div>
                )}
            </div>

            {/* Refined Result Modal */}
            {scanResult && (
                <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-slate-950/60 backdrop-blur-md pb-6 px-4 animate-enter">
                    <div className="w-full h-full absolute inset-0 cursor-pointer" onClick={closeResult}></div>
                    
                    <div className="relative w-full max-w-sm mx-auto bg-slate-900/90 backdrop-blur-xl rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden p-8 flex flex-col items-center text-center">
                        
                        {/* Soft Icon */}
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${scanResult.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                            <i className={`ph-light text-4xl ${scanResult.type === 'success' ? 'ph-check' : 'ph-x'}`}></i>
                        </div>

                        <h2 className="text-2xl font-semibold text-white mb-2">
                            {scanResult.title}
                        </h2>
                        <p className="text-sm text-slate-400 mb-8">
                            {scanResult.message}
                        </p>

                        <div className="w-full bg-white/5 rounded-2xl p-4 border border-white/5 mb-8">
                            <p className="text-[10px] text-slate-500 font-medium tracking-widest uppercase mb-1">Participant</p>
                            <p className="text-lg font-medium text-white truncate">
                                {scanResult.participant?.name || 'Unknown'}
                            </p>
                            {scanResult.participant?.category && (
                                <p className="text-xs text-slate-400 mt-1">{scanResult.participant.category}</p>
                            )}
                        </div>
                        
                        <button 
                            onClick={closeResult} 
                            className={`w-full py-4 text-white font-medium tracking-widest uppercase text-xs rounded-xl active:scale-95 transition-all ${scanResult.type === 'success' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'}`}
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Scanner;