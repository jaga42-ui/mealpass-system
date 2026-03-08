import { useState, useEffect } from 'react';
import api from '../api/axios';

const Stats = () => {
    const [statsData, setStatsData] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const response = await api.get('/scans/stats');
            setStatsData(response.data);
        } catch (error) {
            console.error("Failed to fetch stats", error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch stats as soon as the component loads
    useEffect(() => {
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 animate-pulse w-full max-w-md mx-auto">
                <i className="ph-duotone ph-arrows-clockwise text-4xl text-teal-500 animate-spin mb-4 shadow-[0_0_20px_rgba(20,184,166,0.5)] rounded-full"></i>
                <p className="text-[10px] font-black uppercase tracking-widest text-teal-300">Calculating Telemetry...</p>
            </div>
        );
    }

    if (!statsData) {
        return (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold px-4 py-3 rounded-2xl text-center backdrop-blur-sm animate-enter mt-10 max-w-md mx-auto">
                Failed to load telemetry data.
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-enter w-full max-w-md mx-auto relative z-20 pb-10">
            
            {/* Header Area */}
            <div className="flex items-center justify-between mb-2 px-2">
                <h3 className="font-black text-white text-lg flex items-center gap-3 tracking-wide">
                    <div className="w-8 h-8 bg-teal-500/20 border border-teal-500/30 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(20,184,166,0.2)]">
                        <i className="ph-bold ph-chart-polar text-teal-400"></i>
                    </div>
                    Live Telemetry
                </h3>
                <button 
                    onClick={fetchStats} 
                    className="w-8 h-8 rounded-full bg-white/5 border border-white/10 text-teal-300 hover:bg-teal-500/20 hover:text-white active:scale-90 transition-all duration-300 flex items-center justify-center"
                    title="Refresh Stats"
                >
                    <i className="ph-bold ph-arrows-clockwise text-lg"></i>
                </button>
            </div>

            {/* Total Meals Hero Card */}
            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-[2.5rem] flex flex-col items-center justify-center text-center shadow-[0_20px_50px_-10px_rgba(0,0,0,0.7)] relative overflow-hidden group">
                {/* Glowing Background Radial */}
                <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-teal-500/10 group-hover:bg-teal-500/20 transition-colors pointer-events-none blur-3xl"></div>
                
                <span className="text-[11px] font-black text-teal-200/50 uppercase tracking-[0.3em] mb-2 relative z-10">Total Served Today</span>
                <span className="text-7xl font-black text-white drop-shadow-[0_0_30px_rgba(20,184,166,0.5)] relative z-10 tracking-tighter">
                    {statsData.total}
                </span>
            </div>

            {/* 2x2 Grid for Individual Meals */}
            <div className="grid grid-cols-2 gap-4">
                {[
                    { label: 'Breakfast', count: statsData.stats.Breakfast, icon: 'ph-coffee', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', shadow: 'shadow-[0_0_15px_rgba(251,191,36,0.2)]' },
                    { label: 'Lunch', count: statsData.stats.Lunch, icon: 'ph-hamburger', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', shadow: 'shadow-[0_0_15px_rgba(52,211,153,0.2)]' },
                    { label: 'Snacks', count: statsData.stats.Snacks, icon: 'ph-cookie', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30', shadow: 'shadow-[0_0_15px_rgba(168,85,247,0.2)]' },
                    { label: 'Dinner', count: statsData.stats.Dinner, icon: 'ph-moon-stars', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', shadow: 'shadow-[0_0_15px_rgba(96,165,250,0.2)]' }
                ].map((meal) => (
                    <div key={meal.label} className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] flex flex-col items-center text-center shadow-[0_10px_30px_rgba(0,0,0,0.3)] hover:bg-white/10 transition-all group">
                        <div className={`w-12 h-12 ${meal.bg} border ${meal.border} rounded-2xl flex items-center justify-center mb-4 ${meal.shadow} group-hover:scale-110 transition-transform`}>
                            <i className={`ph-fill ${meal.icon} text-2xl ${meal.color}`}></i>
                        </div>
                        <span className="text-3xl font-black text-white leading-none tracking-tight">{meal.count}</span>
                        <span className="text-[9px] font-black text-slate-400 uppercase mt-2 tracking-[0.2em]">{meal.label}</span>
                    </div>
                ))}
            </div>

        </div>
    );
};

export default Stats;