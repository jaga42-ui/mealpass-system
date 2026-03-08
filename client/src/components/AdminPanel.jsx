import { useState } from 'react';
import api from '../api/axios';

const AdminPanel = () => {
    const [qrId, setQrId] = useState('');
    const [name, setName] = useState('');
    const [category, setCategory] = useState('Volunteer');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    const handleAddParticipant = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const response = await api.post('/participants', {
                qrId: qrId.toUpperCase(),
                name,
                category
            });
            
            setMessage({ type: 'success', text: `Added! Secret Key: ${response.data.participant.secret}` });
            setQrId('');
            setName('');
            
            // In a real scenario, we'd save this secret to generate the QR code,
            // but for now we just want to see that it works!
            console.log("Save this secret for the QR Generator:", response.data.participant.secret);
            
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Error adding participant' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4 animate-enter relative z-20 w-full max-w-md mx-auto">
            {/* Premium Frosted Glass Card */}
            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-[2.5rem] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.7)] relative overflow-hidden">
                
                <h3 className="font-black text-2xl text-white mb-6 flex items-center gap-3 tracking-wide">
                    <div className="w-10 h-10 bg-teal-500/20 border border-teal-500/30 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(20,184,166,0.2)]">
                        <i className="ph-bold ph-user-plus text-teal-400 text-xl"></i>
                    </div>
                    Register
                </h3>

                {message && (
                    <div className={`mb-6 p-4 rounded-2xl text-[11px] font-bold break-all border backdrop-blur-sm animate-enter ${message.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-teal-500/10 border-teal-500/30 text-teal-300'}`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleAddParticipant} className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-teal-200/70 uppercase tracking-widest ml-3">Unique ID</label>
                        <input 
                            type="text" 
                            value={qrId}
                            onChange={(e) => setQrId(e.target.value)}
                            className="w-full bg-slate-900/50 border border-white/10 rounded-2xl py-4 px-5 font-bold text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-all shadow-inner uppercase" 
                            placeholder="e.g. UTS26V01"
                            required
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-teal-200/70 uppercase tracking-widest ml-3">Full Name</label>
                        <input 
                            type="text" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-slate-900/50 border border-white/10 rounded-2xl py-4 px-5 font-bold text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-all shadow-inner" 
                            placeholder="John Doe"
                            required
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-teal-200/70 uppercase tracking-widest ml-3">Category</label>
                        <select 
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full bg-slate-900/50 border border-white/10 rounded-2xl py-4 px-5 font-bold text-white focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-all shadow-inner appearance-none"
                        >
                            {/* Styling the options so they look good in the native dropdown menu */}
                            <option value="Volunteer" className="bg-slate-800 text-white">Volunteer</option>
                            <option value="Participant" className="bg-slate-800 text-white">Participant</option>
                            <option value="Guest" className="bg-slate-800 text-white">Guest</option>
                        </select>
                    </div>
                    
                    <button 
                        type="submit" 
                        disabled={loading}
                        className={`w-full py-4 mt-2 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 font-black tracking-wide ${loading ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-teal-500 text-white shadow-[0_0_20px_rgba(20,184,166,0.3)] hover:shadow-[0_0_30px_rgba(20,184,166,0.5)] active:scale-95 translate-y-[-2px] active:translate-y-[0px]'}`}
                    >
                        {loading ? 'Registering...' : 'Save & Generate Key'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AdminPanel;