import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react'; // <-- Updated import
import api from '../api/axios';

const BadgeGenerator = () => {
    const [count, setCount] = useState(100);
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
            {/* --- CONTROL PANEL (Hidden during actual printing) --- */}
            <div className="print:hidden bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] shadow-xl mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
                
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-teal-500/20 border border-teal-500/30 rounded-xl flex items-center justify-center">
                        <i className="ph-duotone ph-printer text-2xl text-teal-400"></i>
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-white tracking-wide">Print Station</h2>
                        <p className="text-teal-200/60 text-[10px] font-bold uppercase tracking-widest">Generate Secure HMAC Badges</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <input 
                        type="number" 
                        min="1" 
                        max="1000"
                        value={count}
                        onChange={(e) => setCount(e.target.value)}
                        className="w-24 bg-slate-900/50 border border-white/10 rounded-xl py-3 px-4 font-bold text-white text-center focus:outline-none focus:border-teal-400 transition-all"
                    />
                    
                    <button 
                        onClick={handleGenerate}
                        disabled={loading}
                        className={`px-6 py-3 rounded-xl font-black tracking-widest uppercase text-[10px] transition-all flex items-center gap-2 ${loading ? 'bg-slate-700 text-slate-400' : 'bg-teal-500 text-white hover:bg-teal-400 active:scale-95 shadow-[0_0_15px_rgba(20,184,166,0.3)]'}`}
                    >
                        {loading ? 'Minting...' : 'Generate Batch'}
                    </button>

                    {badges.length > 0 && (
                        <button 
                            onClick={() => window.print()}
                            className="px-6 py-3 bg-white text-slate-900 rounded-xl font-black tracking-widest uppercase text-[10px] transition-all hover:scale-105 active:scale-95 flex items-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                        >
                            <i className="ph-bold ph-printer"></i> Print PDF
                        </button>
                    )}
                </div>
            </div>

            {/* --- THE PRINTABLE GRID --- */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 print:grid-cols-4 print:gap-4 print:bg-white print:text-black print:p-8">
                {badges.map((badgeString, index) => (
                    <div 
                        key={index} 
                        className="flex flex-col items-center justify-center p-4 bg-white/5 border border-white/10 rounded-2xl print:bg-white print:border-gray-300 print:rounded-lg print:break-inside-avoid"
                    >
                        <div className="bg-white p-2 rounded-xl mb-3 print:p-0 print:mb-2">
                            {/* <-- Updated Component Tag --> */}
                            <QRCodeSVG 
                                value={badgeString} 
                                size={120}
                                level="H" 
                            />
                        </div>
                        <p className="text-white font-mono text-xs tracking-widest print:text-black print:font-bold">
                            {badgeString.split('-')[0]} 
                        </p>
                        <p className="text-teal-400/50 text-[8px] uppercase font-black mt-1 print:text-gray-400">
                            AccessPro Secure
                        </p>
                    </div>
                ))}
            </div>

            {badges.length === 0 && !loading && (
                <div className="text-center py-20 border-2 border-dashed border-white/10 rounded-[2rem] print:hidden">
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Awaiting Generation Command</p>
                </div>
            )}
        </div>
    );
};

export default BadgeGenerator;