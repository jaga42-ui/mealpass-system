import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../api/axios';

const BadgeGenerator = () => {
    const [count, setCount] = useState(10); // Default to a reasonable number
    const [badges, setBadges] = useState([]);
    const [loading, setLoading] = useState(false);

    const handleGenerate = async () => {
        if (count < 1 || count > 1000) return alert("Please enter a number between 1 and 1000");
        
        setLoading(true);
        try {
            const response = await api.get(`/admin/generate-badges?count=${count}`);
            setBadges(response.data.badges);
        } catch (error) {
            console.error('Error generating badges:', error);
            alert('Failed to generate secure badges.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full">
            {/* --- CONTROL PANEL (Hidden entirely during actual printing) --- */}
            <div className="print:hidden bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] shadow-xl mb-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-teal-500/20 border border-teal-500/30 rounded-xl flex items-center justify-center shadow-inner">
                            <i className="ph-duotone ph-printer text-2xl text-teal-400"></i>
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white tracking-wide">Print Station</h2>
                            <p className="text-teal-200/60 text-[10px] font-bold uppercase tracking-widest">Mint Secure HMAC Badges</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto bg-slate-900/50 p-2 rounded-2xl border border-white/5">
                        <input 
                            type="number" 
                            min="1" 
                            max="1000"
                            value={count}
                            onChange={(e) => setCount(e.target.value)}
                            className="w-20 bg-transparent py-2 px-2 font-black text-white text-center focus:outline-none focus:text-teal-400 transition-colors"
                        />
                        <button 
                            onClick={handleGenerate}
                            disabled={loading}
                            className={`px-6 py-3 rounded-xl font-black tracking-widest uppercase text-[10px] transition-all flex items-center gap-2 ${loading ? 'bg-slate-700 text-slate-400' : 'bg-teal-500 text-white hover:bg-teal-400 active:scale-95 shadow-[0_0_15px_rgba(20,184,166,0.3)]'}`}
                        >
                            {loading ? 'Minting...' : 'Mint Batch'}
                        </button>
                    </div>
                </div>
            </div>

            {/* --- CLEAN SUCCESS UI (Replaces the ugly grid on dark mode) --- */}
            {badges.length > 0 && !loading && (
                <div className="print:hidden bg-emerald-500/10 border border-emerald-500/30 p-8 rounded-[2rem] text-center shadow-[0_10px_30px_rgba(16,185,129,0.1)] mt-8">
                    <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/50 shadow-inner">
                        <i className="ph-fill ph-check-circle text-5xl text-emerald-400"></i>
                    </div>
                    <h3 className="text-white font-black text-2xl tracking-wide">{badges.length} Badges Minted</h3>
                    <p className="text-[11px] text-emerald-200/60 font-bold uppercase tracking-widest mt-2 mb-8">
                        Tokens are cryptographically secured and ready for physical print.
                    </p>
                    <button 
                        onClick={() => window.print()}
                        className="w-full md:w-auto px-10 py-4 bg-white text-slate-900 rounded-2xl font-black tracking-widest uppercase text-xs transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.3)] flex items-center justify-center gap-3 mx-auto"
                    >
                        <i className="ph-bold ph-printer text-lg"></i> Send to Printer
                    </button>
                </div>
            )}

            {badges.length === 0 && !loading && (
                <div className="text-center py-20 border-2 border-dashed border-white/10 rounded-[2rem] print:hidden">
                    <i className="ph-duotone ph-qr-code text-4xl text-slate-600 mb-3"></i>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Awaiting Generation Command</p>
                </div>
            )}

            {/* --- THE ACTUAL PRINTABLE GRID --- */}
            {/* The 'hidden' class removes it from the screen entirely. 
                The 'print:grid' and 'print:absolute' classes take over the whole browser ONLY when printing. */}
            <div className="hidden print:grid print:grid-cols-4 print:gap-4 print:bg-white print:text-black print:absolute print:top-0 print:left-0 print:w-full print:z-[9999] print:p-8">
                {badges.map((badgeString, index) => (
                    <div 
                        key={index} 
                        className="flex flex-col items-center justify-center p-3 border border-gray-300 rounded-xl print:break-inside-avoid"
                    >
                        <div className="mb-2">
                            <QRCodeSVG 
                                value={badgeString} 
                                size={100} 
                                level="H" 
                            />
                        </div>
                        <p className="font-bold font-mono text-[10px] tracking-widest text-black">
                            {badgeString.split('-')[0]} 
                        </p>
                        <p className="text-[6px] uppercase font-black mt-1 text-gray-400">
                            AccessPro Secure
                        </p>
                    </div>
                ))}
            </div>

        </div>
    );
};

export default BadgeGenerator;