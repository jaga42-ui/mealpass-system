import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import * as OTPAuth from 'otpauth';

const Portal = () => {
    const navigate = useNavigate();
    const [portalData, setPortalData] = useState(null);
    const [token, setToken] = useState('');
    const [timeLeft, setTimeLeft] = useState(30);

    // 1. Load data from LocalStorage on mount
    useEffect(() => {
        const storedData = localStorage.getItem('mealpass_portal');
        if (!storedData) {
            navigate('/pass');
            return;
        }
        setPortalData(JSON.parse(storedData));
    }, [navigate]);

    // 2. The TOTP Generator Logic
    useEffect(() => {
        if (!portalData?.secret) return;

        const totp = new OTPAuth.TOTP({
            algorithm: 'SHA1',
            digits: 6,
            period: 30,
            secret: OTPAuth.Secret.fromBase32(portalData.secret)
        });

        const updateToken = () => {
            try {
                setToken(totp.generate());
                const epoch = Math.floor(Date.now() / 1000);
                const remaining = 30 - (epoch % 30);
                setTimeLeft(remaining);
            } catch (err) {
                console.error("Token generation error", err);
            }
        };

        updateToken();
        const interval = setInterval(updateToken, 1000);
        return () => clearInterval(interval);
    }, [portalData]);

    const handleLogout = () => {
        localStorage.removeItem('mealpass_portal');
        navigate('/pass');
    };

    if (!portalData) return null;

    const qrPayload = JSON.stringify({ qrId: portalData.qrId, totp: token });

    return (
        // Full-screen deep teal gradient
        <div className="fixed inset-0 w-full h-full bg-gradient-to-br from-teal-950 via-teal-900 to-slate-900 flex flex-col items-center justify-center p-6 font-sans overflow-hidden">
            
            {/* Background glow effects */}
            <div className="absolute top-[10%] left-[-10%] w-96 h-96 bg-teal-500/20 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[10%] w-96 h-96 bg-slate-900/80 rounded-full blur-[100px] pointer-events-none"></div>

            {/* Premium Glass Logout Button */}
            <button 
                onClick={handleLogout}
                className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-teal-100 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/50 active:scale-90 transition-all duration-300 flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.5)] z-50"
                title="Sign Out"
            >
                <i className="ph-bold ph-sign-out text-lg"></i>
            </button>

            {/* Main Pass Card - Frosted Glass */}
            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-[2.5rem] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.7)] flex flex-col items-center max-w-sm w-full animate-enter relative z-10">
                
                <h2 className="text-2xl font-black text-white mb-2 tracking-wide text-center">{portalData.name}</h2>
                
                <div className="flex gap-2 mb-8">
                    <span className="text-[10px] font-black bg-teal-500/20 border border-teal-500/30 text-teal-300 px-3 py-1 rounded-full uppercase tracking-widest shadow-inner">
                        {portalData.qrId}
                    </span>
                    <span className="text-[10px] font-black bg-white/5 border border-white/10 text-slate-300 px-3 py-1 rounded-full uppercase tracking-widest shadow-inner">
                        {portalData.category}
                    </span>
                </div>
                
                {/* QR Code Wrapper (Must stay white for camera contrast) */}
                <div className="bg-white p-5 rounded-[2rem] shadow-[0_0_30px_rgba(20,184,166,0.3)] mb-8 border-[6px] border-slate-900/40 relative overflow-hidden transition-all">
                    
                    {/* The dynamically changing QR Code */}
                    <QRCodeSVG 
                        value={qrPayload} 
                        size={200} 
                        bgColor={"#ffffff"} 
                        fgColor={"#0f172a"} // Dark slate color for the code itself
                        level={"H"} 
                    />
                    
                    {/* Visual warning when the code is about to die */}
                    {timeLeft <= 5 && (
                        <div className="absolute inset-0 bg-red-500/95 backdrop-blur-sm flex items-center justify-center animate-pulse">
                            <span className="text-white font-black text-xl uppercase tracking-widest drop-shadow-md">Refreshing</span>
                        </div>
                    )}
                </div>

                {/* Secure Countdown Timer */}
                <div className="flex items-center gap-3 text-teal-200/70 font-bold bg-slate-900/60 border border-white/5 px-5 py-4 rounded-2xl shadow-inner w-full justify-center">
                    <i className="ph-bold ph-clock-countdown text-2xl text-teal-400"></i>
                    <span className="text-[10px] uppercase tracking-widest mt-0.5">
                        Code refreshes in <span className="text-white text-sm ml-1 font-black">{timeLeft}s</span>
                    </span>
                </div>
            </div>
        </div>
    );
};

export default Portal;