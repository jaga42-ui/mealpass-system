import { useState, useEffect } from 'react';
import api from '../api/axios';

const Stats = () => {
    const [stats, setStats] = useState({ Breakfast: 0, Lunch: 0, Snacks: 0, Dinner: 0 });
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(new Date());

    const fetchStats = async (isBackground = false) => {
        if (!isBackground) setLoading(true);
        try {
            const res = await api.get('/scans/stats');
            setStats(res.data.stats || { Breakfast: 0, Lunch: 0, Snacks: 0, Dinner: 0 });
            setTotal(res.data.total || 0);
            setLastUpdated(new Date());
        } catch (error) {
            console.error("Failed to fetch live stats", error);
        } finally {
            if (!isBackground) setLoading(false);
        }
    };

    // Auto-refresh every 10 seconds for that "Live Dashboard" feel
    useEffect(() => {
        fetchStats();
        const interval = setInterval(() => {
            fetchStats(true); // true means background refresh (no loading spinner)
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    // Helper to calculate percentage for progress bars (assuming max capacity around 500 for visual scaling)
    const getPercentage = (value, max = 500) => {
        const percent = (value / max) * 100;
        return percent > 100 ? 100 : percent;
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 w-full max-w-4xl mx-auto">
                <div className="relative flex justify-center items-center w-24 h-24 mb-6">
                    <div className="absolute inset-0 border-t-2 border-teal-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-2 border-r-2 border-teal-400 rounded-full animate-[spin_1.5s_linear_infinite_reverse]"></div>
                    <i className="ph-fill ph-chart-line-up text-3xl text-teal-300 animate-pulse"></i>
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-teal-300">Compiling Telemetry...</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-4xl mx-auto space-y-6 animate-enter pb-10">
            
            {/* 🎯 HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-teal-500/20 border border-teal-500/30 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(20,184,166,0.3)]">
                        <i className="ph-fill ph-chart-polar text-3xl text-teal-400"></i>
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white tracking-wide">Live Analytics</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(52,211,153,1)]"></div>
                            <p className="text-[10px] font-bold text-teal-200/50 uppercase tracking-[0.2em]">
                                Last Sync: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </p>
                        </div>
                    </div>
                </div>

                <button 
                    onClick={() => fetchStats(false)}
                    className="h-12 px-6 rounded-xl bg-white/5 border border-white/10 text-teal-300 hover:bg-teal-500/20 hover:text-white active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest"
                >
                    <i className="ph-bold ph-arrows-clockwise text-lg"></i> Manual Sync
                </button>
            </div>

            {/* 📊 MASTER METRIC (TOTAL SCANS) */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] relative overflow-hidden group">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-teal-500/20 blur-[80px] rounded-full pointer-events-none group-hover:bg-teal-500/30 transition-colors duration-700"></div>
                
                <div className="relative z-10 flex flex-col items-center text-center">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Total Meals Distributed Today</p>
                    <div className="text-7xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 drop-shadow-[0_0_30px_rgba(255,255,255,0.1)] tracking-tighter">
                        {total}
                    </div>
                    <div className="mt-8 flex items-center gap-3 bg-teal-500/10 border border-teal-500/30 px-5 py-2 rounded-full">
                        <i className="ph-fill ph-trend-up text-teal-400"></i>
                        <span className="text-[10px] font-black uppercase text-teal-300 tracking-widest">System Nominal</span>
                    </div>
                </div>
            </div>

            {/* 📈 MEAL BREAKDOWN GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 pt-4">
                
                {/* BREAKFAST CARD */}
                <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] shadow-xl hover:border-amber-500/30 transition-all group">
                    <div className="flex items-center justify-between mb-6">
                        <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center border border-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform">
                            <i className="ph-fill ph-coffee text-xl"></i>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Breakfast</span>
                    </div>
                    <div className="text-4xl font-black text-white mb-4">{stats.Breakfast || 0}</div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)] transition-all duration-1000 ease-out" style={{ width: `${getPercentage(stats.Breakfast)}%` }}></div>
                    </div>
                </div>

                {/* LUNCH CARD */}
                <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] shadow-xl hover:border-emerald-500/30 transition-all group">
                    <div className="flex items-center justify-between mb-6">
                        <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
                            <i className="ph-fill ph-hamburger text-xl"></i>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Lunch</span>
                    </div>
                    <div className="text-4xl font-black text-white mb-4">{stats.Lunch || 0}</div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)] transition-all duration-1000 ease-out" style={{ width: `${getPercentage(stats.Lunch)}%` }}></div>
                    </div>
                </div>

                {/* SNACKS CARD */}
                <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] shadow-xl hover:border-orange-500/30 transition-all group">
                    <div className="flex items-center justify-between mb-6">
                        <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center border border-orange-500/20 text-orange-400 group-hover:scale-110 transition-transform">
                            <i className="ph-fill ph-cookie text-xl"></i>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Snacks</span>
                    </div>
                    <div className="text-4xl font-black text-white mb-4">{stats.Snacks || 0}</div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.8)] transition-all duration-1000 ease-out" style={{ width: `${getPercentage(stats.Snacks)}%` }}></div>
                    </div>
                </div>

                {/* DINNER CARD */}
                <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] shadow-xl hover:border-purple-500/30 transition-all group">
                    <div className="flex items-center justify-between mb-6">
                        <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center border border-purple-500/20 text-purple-400 group-hover:scale-110 transition-transform">
                            <i className="ph-fill ph-bowl-food text-xl"></i>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Dinner</span>
                    </div>
                    <div className="text-4xl font-black text-white mb-4">{stats.Dinner || 0}</div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.8)] transition-all duration-1000 ease-out" style={{ width: `${getPercentage(stats.Dinner)}%` }}></div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Stats;