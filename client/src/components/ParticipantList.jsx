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

    if (loading) return <div className="text-center text-[#2A7B9B] font-bold py-10 animate-pulse">Syncing Database...</div>;
    if (error) return <div className="text-center text-red-400 font-bold py-10">{error}</div>;

    const categories = ['All', 'Participant', 'Volunteer', 'Guest'];

    return (
        <div className="flex flex-col h-full animate-enter relative z-20 w-full max-w-md mx-auto mt-2 pb-20">
            
            {/* STICKY HEADER AREA */}
            <div className="sticky top-0 z-30 pt-4 pb-4 bg-slate-900/40 backdrop-blur-xl border-b border-white/5 mx-[-1rem] px-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-extrabold text-white text-lg flex items-center gap-2">
                        <i className="ph-fill ph-users-three text-[#2480D1]"></i> 
                        Live Roster
                    </h3>
                    <button onClick={fetchParticipants} className="text-slate-400 hover:text-white transition-colors">
                        <i className="ph-bold ph-arrows-clockwise text-xl"></i>
                    </button>
                </div>

                {/* Search Bar */}
                <div className="relative mb-4">
                    <i className="ph-bold ph-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg"></i>
                    <input 
                        type="text" 
                        placeholder="Search by Name or ID..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-800/80 border border-slate-700 rounded-2xl py-3 pl-12 pr-4 text-white font-bold placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#2A7B9B] transition-all"
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
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
                            className={`whitespace-nowrap px-4 py-2 rounded-xl font-bold text-xs transition-all ${activeFilter === cat ? 'bg-[#2A7B9B] text-white shadow-md' : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* LIST AREA */}
            <div className="mt-4 space-y-3">
                <div className="flex justify-between items-center px-1 mb-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        Showing {filteredParticipants.length} entries
                    </span>
                </div>

                {filteredParticipants.length === 0 ? (
                    <div className="glass-dark p-8 rounded-[2rem] text-center text-slate-400 font-bold border border-white/10 mt-4">
                        <i className="ph-duotone ph-ghost text-4xl mb-2 opacity-50"></i>
                        <p>No participants found.</p>
                    </div>
                ) : (
                    filteredParticipants.map((p) => (
                        <div key={p._id} className="glass p-4 rounded-2xl flex items-center justify-between shadow-sm hover:scale-[1.01] transition-transform border border-white/5">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700 shadow-inner overflow-hidden text-slate-400">
                                    <i className="ph-fill ph-user text-2xl"></i>
                                </div>
                                <div>
                                    <h4 className="font-extrabold text-white leading-tight">{p.name}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] font-bold text-[#2A7B9B] uppercase tracking-widest bg-[#2A7B9B]/10 border border-[#2A7B9B]/20 px-2 py-0.5 rounded-md">
                                            {p.qrId}
                                        </span>
                                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md ${p.category === 'Volunteer' ? 'bg-purple-500/20 text-purple-300' : p.category === 'Guest' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-slate-700 text-slate-300'}`}>
                                            {p.category}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Deactivation / Edit Stub (For future use) */}
                            <button className="w-8 h-8 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
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