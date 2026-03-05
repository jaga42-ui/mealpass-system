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
        return <div className="text-center text-teal-100 font-bold py-10 animate-pulse">Calculating telemetry...</div>;
    }

    if (!statsData) {
        return <div className="text-center text-red-400 font-bold py-10">Failed to load stats.</div>;
    }

    return (
        <div className="space-y-4 animate-enter relative z-20 w-full max-w-md mx-auto mt-6">
            
            {/* Header Area */}
            <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="font-extrabold text-white text-lg">Live Telemetry</h3>
                <button 
                    onClick={fetchStats} 
                    className="bg-white/20 text-white hover:bg-white/30 text-xs font-bold px-3 py-1 rounded-full backdrop-blur-md flex items-center gap-1 transition-colors active:scale-95"
                >
                    <i className="ph-bold ph-arrows-clockwise"></i> Refresh
                </button>
            </div>

            {/* Total Meals Hero Card */}
            <div className="glass p-6 rounded-[2rem] flex flex-col items-center justify-center text-center mb-4 relative overflow-hidden shadow-lg">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 to-[#2A7B9B]"></div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total Served Today</span>
                <span className="text-6xl font-black text-[#2A7B9B] drop-shadow-sm">{statsData.total}</span>
            </div>

            {/* 2x2 Grid for Individual Meals */}
            <div className="grid grid-cols-2 gap-4">
                {[
                    { label: 'Breakfast', count: statsData.stats.Breakfast, icon: 'ph-coffee', color: 'text-orange-500', bg: 'bg-orange-100' },
                    { label: 'Lunch', count: statsData.stats.Lunch, icon: 'ph-hamburger', color: 'text-green-500', bg: 'bg-green-100' },
                    { label: 'Snacks', count: statsData.stats.Snacks, icon: 'ph-cookie', color: 'text-yellow-500', bg: 'bg-yellow-100' },
                    { label: 'Dinner', count: statsData.stats.Dinner, icon: 'ph-moon-stars', color: 'text-indigo-500', bg: 'bg-indigo-100' }
                ].map((meal) => (
                    <div key={meal.label} className="glass p-5 rounded-[1.5rem] flex flex-col items-center text-center shadow-sm hover:scale-[1.02] transition-transform">
                        <div className={`w-12 h-12 ${meal.bg} rounded-full flex items-center justify-center mb-3 shadow-inner`}>
                            <i className={`ph-fill ${meal.icon} text-2xl ${meal.color}`}></i>
                        </div>
                        <span className="text-3xl font-extrabold text-slate-800 leading-none">{meal.count}</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase mt-2 tracking-wider">{meal.label}</span>
                    </div>
                ))}
            </div>

        </div>
    );
};

export default Stats;