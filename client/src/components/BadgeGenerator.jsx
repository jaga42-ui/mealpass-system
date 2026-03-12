import { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../api/axios';

const BadgeGenerator = () => {
    const [count, setCount] = useState(10); 
    const [badges, setBadges] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // 🚀 We use a ref to grab the raw SVG data without rendering it on the screen
    const printRef = useRef(null);

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

    // 🚀 THE MAGIC: Creates a completely isolated document just for the printer
    const executeIsolatedPrint = () => {
        const printContent = printRef.current.innerHTML;
        const iframe = document.createElement('iframe');
        
        // Hide the iframe off-screen
        iframe.style.position = 'fixed';
        iframe.style.bottom = '0';
        iframe.style.right = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = 'none';
        document.body.appendChild(iframe);

        // Write a pristine HTML document with strict, un-sliceable CSS floats
        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Print Secure Badges</title>
                <style>
                    /* 100% Isolated CSS - Your app's Navbar and Tailwind cannot interfere here! */
                    body { 
                        margin: 0; 
                        padding: 10mm; 
                        background: white; 
                    }
                    .qr-card {
                        float: left;
                        width: 21%;
                        margin: 2%;
                        padding: 15px;
                        border: 2px solid #e2e8f0;
                        border-radius: 16px;
                        box-sizing: border-box;
                        /* Forces printer to push the box to the next page if it doesn't fit */
                        page-break-inside: avoid;
                        break-inside: avoid;
                    }
                    .qr-card svg {
                        width: 100%;
                        height: auto;
                        display: block;
                    }
                    .clear { clear: both; }
                    
                    @media print {
                        @page { margin: 15mm; }
                    }
                </style>
            </head>
            <body>
                ${printContent}
                <div class="clear"></div>
            </body>
            </html>
        `);
        doc.close();

        // Wait 500ms for the browser to parse the SVGs, then trigger print!
        setTimeout(() => {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            
            // Clean up the DOM after printing
            setTimeout(() => {
                document.body.removeChild(iframe);
            }, 2000);
        }, 500);
    };

    return (
        <div className="w-full max-w-4xl mx-auto relative z-20">
            {/* --- CONTROL PANEL --- */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] shadow-xl mb-6">
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

                    <div className="flex items-center gap-3 w-full md:w-auto bg-slate-900/50 p-2 rounded-2xl border border-white/5 shadow-inner">
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

            {/* --- CLEAN SUCCESS UI --- */}
            {badges.length > 0 && !loading && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 p-8 rounded-[2rem] text-center shadow-[0_10px_30px_rgba(16,185,129,0.1)] mt-8 animate-enter">
                    <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/50 shadow-inner">
                        <i className="ph-fill ph-check-circle text-5xl text-emerald-400"></i>
                    </div>
                    <h3 className="text-white font-black text-2xl tracking-wide">{badges.length} Badges Minted</h3>
                    <p className="text-[11px] text-emerald-200/60 font-bold uppercase tracking-widest mt-2 mb-8">
                        Tokens are cryptographically secured and ready for physical print.
                    </p>
                    <button 
                        onClick={executeIsolatedPrint} // 🚀 Triggers the new isolated iframe print
                        className="w-full md:w-auto px-10 py-4 bg-white text-slate-900 rounded-2xl font-black tracking-widest uppercase text-xs transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.3)] flex items-center justify-center gap-3 mx-auto"
                    >
                        <i className="ph-bold ph-printer text-lg"></i> Send to Printer
                    </button>
                </div>
            )}

            {badges.length === 0 && !loading && (
                <div className="text-center py-20 border-2 border-dashed border-white/10 rounded-[2rem] shadow-inner bg-slate-900/30">
                    <i className="ph-duotone ph-qr-code text-4xl text-slate-600 mb-3 opacity-50"></i>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Awaiting Generation Command</p>
                </div>
            )}

            {/* --- 🛡️ THE HIDDEN PRINT VAULT --- */}
            {/* This keeps the QR SVGs in the DOM so we can copy them, but invisible to the user! */}
            <div className="absolute left-[-9999px] top-[-9999px] invisible" aria-hidden="true">
                <div ref={printRef}>
                    {badges.map((badgeString, index) => (
                        <div key={index} className="qr-card">
                            <QRCodeSVG 
                                value={badgeString} 
                                size={256} // High-res SVG for crisp printing
                                level="H" 
                            />
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
};

export default BadgeGenerator;