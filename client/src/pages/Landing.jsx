import { useNavigate } from 'react-router-dom';

const Landing = () => {
    const navigate = useNavigate();

    return (
        // 👇 The scroll-lock has been removed here! 👇
        <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 flex flex-col items-center justify-center p-6 py-12 font-sans relative overflow-x-hidden overflow-y-auto">
            
            {/* Cinematic Background Glows */}
            <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-teal-500/20 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="w-full max-w-md animate-enter relative z-10 flex flex-col items-center text-center">
                
                {/* Hero Logo */}
                <div className="w-24 h-24 bg-teal-500/10 border border-teal-500/30 backdrop-blur-2xl rounded-[2rem] flex items-center justify-center shadow-[0_0_50px_rgba(20,184,166,0.3)] mb-8 animate-float">
                    <i className="ph-duotone ph-fingerprint text-6xl text-teal-400"></i>
                </div>
                
                <h1 className="text-5xl font-black text-white tracking-tight mb-3">
                    Access<span className="text-teal-400 drop-shadow-[0_0_15px_rgba(20,184,166,0.5)]">Pro</span>
                </h1>
                
                <p className="text-sm font-bold text-teal-100/60 uppercase tracking-[0.3em] mb-12 max-w-[280px] leading-relaxed">
                    Enterprise Grade Event Verification System
                </p>

                {/* Routing Buttons */}
                <div className="w-full space-y-4">
                    <button 
                        onClick={() => navigate('/pass')}
                        className="w-full py-5 bg-teal-500 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-[0_0_30px_rgba(20,184,166,0.3)] hover:shadow-[0_0_50px_rgba(20,184,166,0.5)] hover:bg-teal-400 active:scale-95 transition-all duration-300 flex items-center justify-center gap-3 group"
                    >
                        <i className="ph-bold ph-ticket text-xl group-hover:scale-110 transition-transform"></i>
                        Get My Pass
                    </button>

                    <button 
                        onClick={() => navigate('/login')}
                        className="w-full py-5 bg-white/5 backdrop-blur-xl border border-white/10 text-teal-300 font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-white/10 hover:text-white active:scale-95 transition-all duration-300 flex items-center justify-center gap-3 group"
                    >
                        <i className="ph-bold ph-shield-star text-xl group-hover:scale-110 transition-transform"></i>
                        Staff Login
                    </button>
                </div>

                <div className="mt-12 text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">
                    Powered by MERN Architecture
                </div>
            </div>
        </div>
    );
};

export default Landing;