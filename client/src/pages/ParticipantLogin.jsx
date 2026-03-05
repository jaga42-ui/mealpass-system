import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const ParticipantLogin = () => {
    const [qrId, setQrId] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Hit the new public backend route we just created
            const response = await api.post('/participants/login', { qrId: qrId.trim() });
            
            // Save their portal data to localStorage so they don't have to log in every time
            localStorage.setItem('mealpass_portal', JSON.stringify(response.data.participant));
            
            // Redirect to the dynamic QR code generator
            navigate('/portal');
        } catch (err) {
            setError(err.response?.data?.message || 'Access Denied. Check your ID.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-screen items-center justify-center p-6 text-white animate-enter relative z-10">
            <div className="w-full max-w-sm glass p-8 rounded-[2.5rem] shadow-2xl">
                
                <div className="text-center mb-8">
                    <div className="w-20 h-20 mx-auto bg-white/90 backdrop-blur-xl rounded-[1.5rem] flex items-center justify-center shadow-xl mb-4">
                        <i className="ph-duotone ph-ticket text-4xl text-[#2480D1]"></i>
                    </div>
                    <h2 className="text-3xl font-extrabold text-slate-800">My Pass</h2>
                    <p className="text-slate-500 font-bold mt-1 text-sm">Enter your Event ID to access</p>
                </div>

                {error && (
                    <div className="mb-4 bg-red-500/10 border border-red-500/50 text-red-600 text-xs font-bold px-4 py-3 rounded-xl text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <input 
                            type="text" 
                            value={qrId}
                            onChange={(e) => setQrId(e.target.value)}
                            className="w-full bg-white/50 border border-slate-300 rounded-2xl py-4 px-5 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2A7B9B] transition-all uppercase" 
                            placeholder="e.g. UTS26V01"
                            required
                        />
                    </div>
                    
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full py-4 bg-[#2480D1] hover:bg-[#1a66a8] text-white font-bold rounded-2xl shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        <span>{loading ? 'Verifying...' : 'Get My Pass'}</span> 
                    </button>
                </form>

            </div>
        </div>
    );
};

export default ParticipantLogin;