import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';

const ResetPassword = () => {
    const { token } = useParams(); // Automatically grabs the secure token from the URL
    const navigate = useNavigate();
    
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage(null);

        // Basic Frontend Validation
        if (password !== confirmPassword) {
            return setMessage({ type: 'error', text: 'Passwords do not match.' });
        }
        if (password.length < 6) {
            return setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
        }

        setLoading(true);

        try {
            // Send the token and new password to the backend route we just built
            const response = await api.put(`/auth/resetpassword/${token}`, { password });
            
            setMessage({ type: 'success', text: response.data.message });
            setIsSuccess(true);
        } catch (error) {
            setMessage({ 
                type: 'error', 
                text: error.response?.data?.message || 'Invalid or expired token. Please request a new one.' 
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        // 👇 Scroll-lock removed! Replaced with min-h-screen and overflow-y-auto 👇
        <div className="min-h-screen w-full bg-gradient-to-br from-teal-950 via-teal-900 to-slate-900 flex items-center justify-center p-6 py-12 font-sans relative overflow-x-hidden overflow-y-auto">
            
            {/* Cinematic Background Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-teal-500/20 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-slate-900/80 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="w-full max-w-sm animate-enter relative z-10">
                
                {/* Header Section */}
                <div className="text-center mb-10">
                    <div className="w-20 h-20 mx-auto bg-teal-500/10 border border-teal-500/30 backdrop-blur-xl rounded-[1.5rem] flex items-center justify-center shadow-[0_0_30px_rgba(20,184,166,0.2)] mb-6 animate-float">
                        <i className={`ph-duotone ${isSuccess ? 'ph-check-circle text-emerald-400' : 'ph-lock-key-open text-teal-400'} text-4xl`}></i>
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-wide">
                        Secure <span className="text-teal-400">Reset</span>
                    </h1>
                    <p className="text-teal-200/60 font-medium mt-2 text-[10px] uppercase tracking-[0.2em]">
                        {isSuccess ? 'Access Restored' : 'Enter your new security key'}
                    </p>
                </div>

                {/* Form Section - Frosted Glass Card */}
                <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-[2.5rem] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.7)] space-y-6">
                    
                    {message && (
                        <div className={`p-4 rounded-2xl text-[11px] font-bold text-center border backdrop-blur-sm animate-enter ${message.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>
                            {message.text}
                        </div>
                    )}

                    {!isSuccess ? (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-teal-200/70 uppercase tracking-widest ml-3">
                                    New Password
                                </label>
                                <input 
                                    type="password" 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-slate-900/50 border border-white/10 rounded-2xl py-4 px-5 font-bold text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-all shadow-inner" 
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-teal-200/70 uppercase tracking-widest ml-3">
                                    Confirm Password
                                </label>
                                <input 
                                    type="password" 
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-slate-900/50 border border-white/10 rounded-2xl py-4 px-5 font-bold text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-all shadow-inner" 
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                />
                            </div>

                            <button 
                                type="submit" 
                                disabled={loading}
                                className={`w-full py-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 font-black tracking-wide ${loading ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-teal-500 text-white shadow-[0_0_20px_rgba(20,184,166,0.3)] hover:shadow-[0_0_30px_rgba(20,184,166,0.5)] active:scale-95 translate-y-[-2px] active:translate-y-[0px]'}`}
                            >
                                {loading ? 'Securing...' : 'Lock In Password'}
                                {!loading && <i className="ph-bold ph-arrow-right text-lg"></i>}
                            </button>
                        </form>
                    ) : (
                        <button 
                            onClick={() => navigate('/login')}
                            className="w-full py-4 bg-slate-900 border border-white/10 text-white rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 font-black tracking-wide hover:bg-slate-800 active:scale-95"
                        >
                            Return to Login
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
};

export default ResetPassword;