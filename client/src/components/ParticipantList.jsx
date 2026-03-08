import { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';

const ParticipantList = () => {
    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // Search and Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('All');

    const fetchParticipants = async () => {
        setLoading(true);
        try {
            const response = await api.get('/participants');
            setParticipants(response.data);
            setError('');
        } catch (err) {
            setError('Failed to load participants.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchParticipants();
    }, []);

    // Instant Client-Side Filtering
    const filteredParticipants = useMemo(() => {
        return participants.filter(p => {
            const matchesSearch = 
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                p.qrId.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesFilter = activeFilter === 'All' || p.category === activeFilter;
            
            return matchesSearch && matchesFilter;
        });
    }, [participants, searchTerm, activeFilter]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
            <i className="ph-duotone ph-arrows-clockwise text-4xl text-teal-500 animate-spin mb-4 shadow-[0_0_20px_rgba(20,184,166,0.5)] rounded-full"></i>
            <p className="text-[10px] font-black uppercase tracking-widest text-teal-300">Syncing Database...</p>
        </div>
    );

    if (error) return (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold px-4 py-3 rounded-2xl text-center backdrop-blur-sm animate-enter mt-10 max-w-md mx-auto">
            {error}
        </div>
    );

    const categories = ['All', 'Participant', 'Volunteer', 'Guest'];

    return (
        <div className="flex flex-col h-full animate-enter w-full max-w-md mx-auto pb-20 relative z-20">
            
            {/* STICKY HEADER AREA */}
            <div className="sticky top-0 z-30 pt-4 pb-4 bg-slate-900/80 backdrop-blur-2xl border-b border-white/10 mx-[-1rem] px-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                
                <div className="flex items-center justify-between mb-5">
                    <h3 className="font-black text-white text-lg flex items-center gap-3 tracking-wide">
                        <div className="w-8 h-8 bg-teal-500/20 border border-teal-500/30 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(20,184,166,0.2)]">
                            <i className="ph-bold ph-users-three text-teal-400"></i>
                        </div>
                        Live Roster
                    </h3>
                    <button 
                        onClick={fetchParticipants} 
                        className="w-8 h-8 rounded-full bg-white/5 border border-white/10 text-teal-300 hover:bg-teal-500/20 hover:text-white active:scale-90 transition-all duration-300 flex items-center justify-center"
                    >
                        <i className="ph-bold ph-arrows-clockwise text-lg"></i>
                    </button>
                </div>

                {/* Search Bar */}
                <div className="relative mb-4 group">
                    <i className="ph-bold ph-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg group-focus-within:text-teal-400 transition-colors"></i>
                    <input 
                        type="text" 
                        placeholder="Search by Name or ID..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-900/50 border border-white/10 rounded-2xl py-3 pl-12 pr-10 text-white font-bold placeholder-slate-500 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-all shadow-inner"
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-teal-400 transition-colors">
                            <i className="ph-fill ph-x-circle text-xl"></i>
                        </button>
                    )}
                </div>

                {/* Filter Pills */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                    {categories.map(cat => (
                        <button 
                            key={cat}
                            onClick={() => setActiveFilter(cat)}
                            className={`whitespace-nowrap px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all duration-300 active:scale-95 border ${
                                activeFilter === cat 
                                ? 'bg-teal-500 border-teal-400 text-white shadow-[0_0_15px_rgba(20,184,166,0.4)]' 
                                : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-teal-200'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* LIST AREA */}
            <div className="mt-6 space-y-3">
                <div className="flex justify-between items-center px-1 mb-2">
                    <span className="text-[10px] font-black text-teal-200/50 uppercase tracking-widest">
                        Showing {filteredParticipants.length} entries
                    </span>
                </div>

                {filteredParticipants.length === 0 ? (
                    <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[2rem] text-center text-slate-500 font-bold border border-white/10 mt-4 shadow-inner">
                        <i className="ph-duotone ph-ghost text-5xl mb-3 opacity-40"></i>
                        <p className="text-[11px] uppercase tracking-widest">No participants found.</p>
                    </div>
                ) : (
                    filteredParticipants.map((p) => (
                        <div key={p._id} className="bg-white/5 backdrop-blur-lg p-4 rounded-2xl flex items-center justify-between shadow-[0_5px_15px_rgba(0,0,0,0.2)] hover:bg-white/10 hover:border-teal-500/30 transition-all border border-white/10 group cursor-pointer">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-slate-900/80 flex items-center justify-center shrink-0 border border-white/5 shadow-inner text-slate-500 group-hover:text-teal-400 transition-colors">
                                    <i className="ph-fill ph-user text-2xl"></i>
                                </div>
                                <div>
                                    <h4 className="font-black text-white leading-tight tracking-wide">{p.name}</h4>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest bg-slate-900/80 border border-white/10 px-2 py-0.5 rounded-md shadow-inner">
                                            {p.qrId}
                                        </span>
                                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${
                                            p.category === 'Volunteer' ? 'bg-purple-500/10 border-purple-500/30 text-purple-300' : 
                                            p.category === 'Guest' ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 
                                            'bg-teal-500/10 border-teal-500/30 text-teal-300'
                                        }`}>
                                            {p.category}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Options Stub */}
                            <button className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-700 transition-colors border border-white/5 active:scale-90">
                                <i className="ph-bold ph-dots-three-vertical text-lg"></i>
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ParticipantList;