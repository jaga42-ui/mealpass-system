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
        <div className="space-y-4 animate-enter relative z-20 w-full max-w-md mx-auto mt-6">
            <div className="glass-dark p-6 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden bg-slate-800/80 backdrop-blur-md border border-white/10">
                <h3 className="font-bold text-lg mb-5 flex items-center gap-2">
                    <i className="ph-fill ph-user-plus text-[#2480D1]"></i> 
                    Register Participant
                </h3>

                {message && (
                    <div className={`mb-4 p-3 rounded-xl text-xs font-bold break-all ${message.type === 'error' ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleAddParticipant} className="space-y-3">
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Unique ID (e.g. UTS26V01)</label>
                        <input 
                            type="text" 
                            value={qrId}
                            onChange={(e) => setQrId(e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 font-bold text-white focus:ring-2 focus:ring-[#2480D1] outline-none uppercase" 
                            placeholder="UTS26..."
                            required
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Full Name</label>
                        <input 
                            type="text" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 font-bold text-white focus:ring-2 focus:ring-[#2480D1] outline-none" 
                            placeholder="John Doe"
                            required
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Category</label>
                        <select 
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 font-bold text-white focus:ring-2 focus:ring-[#2480D1] outline-none"
                        >
                            <option value="Volunteer">Volunteer</option>
                            <option value="Participant">Participant</option>
                            <option value="Guest">Guest</option>
                        </select>
                    </div>
                    
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full mt-4 py-3 bg-[#2480D1] hover:bg-[#1a66a8] text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50"
                    >
                        {loading ? 'Saving...' : 'Save & Generate Key'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AdminPanel;