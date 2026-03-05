import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { totp } from 'totp-generator';

const Portal = () => {
    const navigate = useNavigate();
    const [portalData, setPortalData] = useState(null);
    const [token, setToken] = useState('');
    const [timeLeft, setTimeLeft] = useState(30);

    // 1. Load data from LocalStorage on mount
    useEffect(() => {
        const storedData = localStorage.getItem('mealpass_portal');
        if (!storedData) {
            // If they haven't logged in, kick them back to the login screen
            navigate('/pass');
            return;
        }
        setPortalData(JSON.parse(storedData));
    }, [navigate]);

    // 2. The TOTP Generator Logic
    useEffect(() => {
        if (!portalData?.secret) return;

        const updateToken = () => {
            try {
                const { otp, expires } = totp(portalData.secret);
                setToken(otp);
                
                const remaining = Math.max(0, Math.floor((expires - Date.now()) / 1000));
                setTimeLeft(remaining);
            } catch (err) {
                console.error("Token generation error");
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

    // This is the highly secure JSON payload that the Scanner is expecting
    const qrPayload = JSON.stringify({ qrId: portalData.qrId, totp: token });

    return (
        <div className="flex flex-col items-center justify-center h-screen p-6 relative z-10">
            
            <button 
                onClick={handleLogout}
                className="absolute top-6 right-6 w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-white/40 transition-colors shadow-lg"
            >
                <i className="ph-bold ph-sign-out text-lg"></i>
            </button>

            <div className="glass p-8 rounded-[2.5rem] shadow-2xl flex flex-col items-center max-w-sm w-full animate-enter">
                <h2 className="text-2xl font-extrabold text-slate-800 mb-1">{portalData.name}</h2>
                <div className="flex gap-2 mb-8">
                    <span className="text-[10px] font-bold bg-[#2A7B9B]/10 text-[#2A7B9B] px-3 py-1 rounded-full uppercase tracking-widest">{portalData.qrId}</span>
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-3 py-1 rounded-full uppercase tracking-widest">{portalData.category}</span>
                </div>
                
                <div className="bg-white p-4 rounded-3xl shadow-inner mb-6 border-4 border-slate-100 relative overflow-hidden">
                    {/* The dynamically changing QR Code */}
                    <QRCodeSVG 
                        value={qrPayload} 
                        size={200} 
                        bgColor={"#ffffff"} 
                        fgColor={"#0f172a"} 
                        level={"H"} 
                    />
                    
                    {/* Visual warning when the code is about to die */}
                    {timeLeft <= 5 && (
                        <div className="absolute inset-0 bg-red-500/90 backdrop-blur-sm flex items-center justify-center animate-pulse">
                            <span className="text-white font-black text-xl uppercase tracking-widest">Refreshing...</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 text-slate-500 font-bold bg-white/50 px-4 py-2 rounded-xl">
                    <i className="ph-bold ph-clock-countdown text-xl text-[#2480D1]"></i>
                    <span>Code refreshes in <span className="text-slate-800">{timeLeft}s</span></span>
                </div>
            </div>
        </div>
    );
};

export default Portal;