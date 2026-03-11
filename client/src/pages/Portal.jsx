import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';

const Portal = () => {
    const navigate = useNavigate();
    const [portalData, setPortalData] = useState(null);

    // 1. Load data from LocalStorage on mount
    useEffect(() => {
        const storedData = localStorage.getItem('accesspro_portal'); // Updated to new key
        if (!storedData) {
            navigate('/pass');
            return;
        }
        setPortalData(JSON.parse(storedData));
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('accesspro_portal');
        navigate('/pass');
    };

    if (!portalData) return null;

    // We no longer need TOTP! The qrId itself contains the secure HMAC signature (e.g., ABCD-12345678)
    const qrPayload = portalData.qrId;

    return (
        // 👇 Scroll-lock removed! Replaced with min-h-screen and overflow-y-auto 👇
        <div className="min-h-screen w-full bg-gradient-to-br from-teal-950 via-teal-900 to-slate-900 flex flex-col items-center justify-center p-6 py-12 font-sans relative overflow-x-hidden overflow-y-auto">
            
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
                        {/* We only show the first half of the string so the secret signature stays hidden visually */}
                        {portalData.qrId ? portalData.qrId.split('-')[0] : 'PENDING'}
                    </span>
                    <span className="text-[10px] font-black bg-white/5 border border-white/10 text-slate-300 px-3 py-1 rounded-full uppercase tracking-widest shadow-inner">
                        {portalData.category}
                    </span>
                </div>
                
                {/* QR Code Wrapper */}
                <div className="bg-white p-5 rounded-[2rem] shadow-[0_0_30px_rgba(20,184,166,0.3)] mb-8 border-[6px] border-slate-900/40 relative overflow-hidden transition-all">
                    
                    {qrPayload ? (
                        <QRCodeSVG 
                            value={qrPayload} 
                            size={200} 
                            bgColor={"#ffffff"} 
                            fgColor={"#0f172a"} // Dark slate color
                            level={"H"} 
                        />
                    ) : (
                        <div className="w-[200px] h-[200px] bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-bold text-xs uppercase tracking-widest text-center px-4 border-2 border-dashed border-slate-300">
                            No Badge Linked
                        </div>
                    )}
                </div>

                {/* Secure Badge Status */}
                <div className="flex items-center gap-3 text-teal-200/70 font-bold bg-slate-900/60 border border-white/5 px-5 py-4 rounded-2xl shadow-inner w-full justify-center">
                    <i className="ph-bold ph-shield-check text-2xl text-teal-400"></i>
                    <span className="text-[10px] uppercase tracking-widest mt-0.5">
                        Pass is Cryptographically Secured
                    </span>
                </div>
            </div>
        </div>
    );
};

export default Portal;