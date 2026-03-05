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
        if (config.isScannerLocked) return; // Prevent starting if locked
        
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

            // THE HYBRID ENGINE: Try to read as a secure dynamic token first
            try {
                const parsedData = JSON.parse(decodedText);
                payload = {
                    qrId: parsedData.qrId,
                    totp: parsedData.totp,
                    mealType: config.activeMeal
                };
            } catch (e) {
                // FALLBACK: If it's not JSON, it's a printed static card. Just grab the ID.
                payload = {
                    qrId: decodedText.trim().toUpperCase(),
                    mealType: config.activeMeal
                };
            }
            
            // Send the smart payload to the backend
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
        return <div className="text-center text-teal-100 font-bold py-10 animate-pulse">Syncing with Command Center...</div>;
    }

    // THE LOCKDOWN SCREEN
    if (config.isScannerLocked) {
        return (
            <div className="flex flex-col items-center justify-center h-80 glass p-6 rounded-[2.5rem] border-2 border-red-500/30 text-center animate-enter delay-200 shadow-xl">
                <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                    <i className="ph-fill ph-lock-key text-4xl text-red-500"></i>
                </div>
                <h3 className="text-2xl font-black text-slate-800">System Locked</h3>
                <p className="text-sm font-bold text-slate-500 mt-2">
                    The Admin has temporarily paused all scanning operations. Please wait.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-enter delay-200">
            {/* Read-Only Meal Status Header */}
            <div className="glass p-4 rounded-[2rem] flex items-center justify-between shadow-sm border border-[#2A7B9B]/20">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#2A7B9B]/10 rounded-full flex items-center justify-center">
                        <i className="ph-fill ph-check-circle text-xl text-[#2A7B9B]"></i>
                    </div>
                    <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Scanning For</div>
                        <div className="text-lg font-black text-[#2A7B9B]">{config.activeMeal}</div>
                    </div>
                </div>
                <div className="flex items-center gap-1 bg-green-100 text-green-600 px-3 py-1.5 rounded-full">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-[10px] font-bold uppercase tracking-widest">Live</span>
                </div>
            </div>

            {/* Camera Container */}
            <div className="relative w-full aspect-square bg-black rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white/40 group">
                <div id="reader" className="w-full h-full opacity-80"></div>
                
                {!isScanning && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-md z-10">
                        <button 
                            onClick={startScanner} 
                            className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.4)] hover:scale-105 transition-transform active:scale-95"
                        >
                            <i className="ph-fill ph-camera text-3xl text-[#2480D1]"></i>
                        </button>
                        <p className="mt-5 text-xs font-bold text-white uppercase tracking-widest">Tap to Scan</p>
                    </div>
                )}
            </div>

            {isScanning && (
                <button 
                    onClick={stopScanner} 
                    className="w-full h-16 glass text-red-500 font-bold rounded-[1.5rem] shadow-sm hover:bg-white transition-colors flex items-center justify-center gap-2 active:scale-95"
                >
                    <i className="ph-bold ph-stop-circle text-xl"></i>
                    <span>Stop Camera</span>
                </button>
            )}

            {/* Result Modal Overlay */}
            {scanResult && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-6">
                    <div className={`bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl border-4 ${scanResult.type === 'success' ? 'border-green-500' : 'border-red-500'} animate-enter`}>
                        <div className={`p-6 border-b flex items-center gap-4 pt-8 ${scanResult.type === 'success' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 shadow-md ${scanResult.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
                                <i className={`ph-fill ${scanResult.type === 'success' ? 'ph-check-circle' : 'ph-warning-circle'} text-2xl text-white`}></i>
                            </div>
                            <div>
                                <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Status</div>
                                <div className={`text-xl font-extrabold leading-none ${scanResult.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                                    {scanResult.title}
                                </div>
                                <div className={`text-xs font-bold mt-1 ${scanResult.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                                    {scanResult.message}
                                </div>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">Participant</div>
                            <div className="text-2xl font-bold text-slate-800 leading-tight mb-3">
                                {scanResult.participant?.name || 'Unknown'}
                            </div>
                            <button 
                                onClick={closeResult} 
                                className="w-full mt-6 py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
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