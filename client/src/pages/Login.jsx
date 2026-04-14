import { useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';
import { useGoogleLogin } from '@react-oauth/google';
import api from '../api/axios';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Read state from location (defaults to false if arriving directly)
  const [isSignup, setIsSignup] = useState(location.state?.isSignup || false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Forgot Password State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState(null);

  const { login, register } = useContext(AuthContext);

  // --- 🌐 GOOGLE OAUTH LOGIC 🌐 ---
  const handleGoogleAuth = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/auth/google', { access_token: tokenResponse.access_token });
            const user = res.data.user;

            // 🛑 GATEKEEPER 3: Intercept Google accounts
            if (user.role === 'pending') {
                setError('Account registered via Google. Please wait for Admin approval.');
                setLoading(false);
                return; // Stop execution!
            }
            
            localStorage.setItem('mealpass_token', res.data.token);
            localStorage.setItem('mealpass_user', JSON.stringify(user)); 
            
            window.location.href = '/scan'; 
        } catch (err) {
            setError(err.response?.data?.message || 'Google authentication failed.');
            setLoading(false);
        }
    },
    onError: () => setError('Google authentication failed.')
  });
  // --------------------------------

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignup) {
        await register(email, password);
        setIsSignup(false);
        setError('');
        alert("Account created successfully! Please wait for admin approval before logging in.");
      } else {
        // Because of our Context fix, if they are pending, this await will throw an error automatically!
        await login(email, password);
        navigate('/scan'); 
      }
    } catch (err) {
      // The pending error thrown from AuthContext gets caught right here
      setError(err.response?.data?.message || err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotMsg(null);
    setForgotLoading(true);

    try {
      const response = await api.post('/auth/forgotpassword', { email: forgotEmail });
      setForgotMsg({ type: 'success', text: response.data.message });
      setForgotEmail(''); 
    } catch (err) {
      setForgotMsg({ 
        type: 'error', 
        text: err.response?.data?.message || 'Failed to send recovery email. Check address.' 
      });
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-teal-950 via-teal-900 to-slate-900 flex items-center justify-center p-6 py-12 font-sans relative overflow-x-hidden overflow-y-auto">
      
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-teal-500/20 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-slate-900/80 rounded-full blur-[100px]"></div>

      <div className="w-full max-w-sm animate-enter relative z-10">
        
        <div className="text-center mb-10">
          <div className="w-20 h-20 mx-auto bg-teal-500/10 border border-teal-500/30 backdrop-blur-xl rounded-[1.5rem] flex items-center justify-center shadow-[0_0_30px_rgba(20,184,166,0.2)] mb-6 animate-float">
            <i className="ph-duotone ph-bowl-food text-4xl text-teal-400"></i>
          </div>
          <h1 className="text-4xl font-black text-white tracking-wide">
            Aahaaram
          </h1>
          <p className="text-teal-200/60 font-medium mt-2 text-sm uppercase tracking-[0.2em]">
            {isSignup ? 'Create Account' : 'Welcome Back'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-[2.5rem] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.7)] space-y-5">
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold px-4 py-3 rounded-xl text-center backdrop-blur-sm animate-enter">
              {error}
            </div>
          )}

          {/* 🛡️ GOOGLE AUTH BUTTON 🛡️ */}
          <button 
            type="button" 
            onClick={() => handleGoogleAuth()}
            disabled={loading}
            className="w-full py-4 bg-white text-slate-900 font-black rounded-2xl shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all duration-300 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98]"
          >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
            <span>Continue with Google</span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 py-1">
            <div className="h-px w-full bg-white/10"></div>
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Or</span>
            <div className="h-px w-full bg-white/10"></div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-teal-200/70 uppercase tracking-widest ml-3">
              Email
            </label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-900/50 border border-white/10 rounded-2xl py-4 px-5 font-bold text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-all shadow-inner" 
              placeholder="user@example.com"
              required={!isSignup}
            />
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between items-center ml-3 mr-1">
              <label className="text-[10px] font-black text-teal-200/70 uppercase tracking-widest">
                Password
              </label>
              
              {!isSignup && (
                <button 
                  type="button" 
                  onClick={() => { setShowForgotModal(true); setForgotMsg(null); }}
                  className="text-[9px] font-black text-slate-400 hover:text-teal-300 uppercase tracking-widest transition-colors"
                >
                  Forgot Password?
                </button>
              )}
            </div>
            
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-900/50 border border-white/10 rounded-2xl py-4 px-5 font-bold text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-all shadow-inner mt-1" 
              placeholder="••••••••"
              required={!isSignup}
              minLength={6}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full py-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 font-black tracking-wide mt-2 ${loading ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-teal-500 text-white shadow-[0_0_20px_rgba(20,184,166,0.3)] hover:shadow-[0_0_30px_rgba(20,184,166,0.5)] active:scale-95 translate-y-[-2px] active:translate-y-[0px]'}`}
          >
            <span>
              {loading ? 'Loading...' : (isSignup ? 'Sign Up' : 'Log In')}
            </span> 
            {!loading && <i className="ph-bold ph-arrow-right text-lg"></i>}
          </button>

          <div className="pt-2 text-center">
            <button 
              type="button"
              onClick={() => {
                setIsSignup(!isSignup);
                setError('');
              }} 
              className="text-[11px] font-black text-slate-400 hover:text-teal-300 uppercase tracking-widest transition-colors"
            >
              {isSignup ? 'Back to Login' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>

      {/* 🛡️ PASSWORD RECOVERY MODAL 🛡️ */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md animate-enter">
          <div className="bg-slate-900 border border-white/10 w-full max-w-sm rounded-[2.5rem] p-8 shadow-[0_30px_60px_rgba(0,0,0,0.9)] relative overflow-hidden">
            
            <div className="absolute top-0 w-full h-32 bg-gradient-to-b from-teal-500/20 to-transparent left-0 pointer-events-none"></div>

            <div className="text-center mb-6 relative z-10">
              <div className="w-16 h-16 mx-auto bg-teal-500/10 border border-teal-500/30 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(20,184,166,0.2)] mb-4">
                <i className="ph-duotone ph-envelope-simple-open text-3xl text-teal-400"></i>
              </div>
              <h2 className="text-2xl font-black text-white tracking-wide">Reset Password</h2>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2">
                Enter your email to receive a reset link
              </p>
            </div>

            {forgotMsg && (
              <div className={`mb-6 p-3 rounded-xl text-[10px] font-bold text-center border backdrop-blur-sm animate-enter ${forgotMsg.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>
                {forgotMsg.text}
              </div>
            )}

            <form onSubmit={handleForgotPassword} className="space-y-4 relative z-10">
              <input 
                type="email" 
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-4 px-5 font-bold text-white placeholder-slate-600 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-all shadow-inner text-sm" 
                placeholder="Email address"
                required
              />
              
              <button 
                type="submit" 
                disabled={forgotLoading}
                className={`w-full py-4 rounded-2xl transition-all duration-300 font-black tracking-widest uppercase text-[10px] flex items-center justify-center gap-2 ${forgotLoading ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-teal-500 text-white shadow-[0_0_20px_rgba(20,184,166,0.3)] hover:shadow-[0_0_30px_rgba(20,184,166,0.5)] active:scale-95'}`}
              >
                {forgotLoading ? 'Sending...' : 'Send Link'}
              </button>
            </form>

            <button 
              onClick={() => { setShowForgotModal(false); setForgotMsg(null); }}
              className="w-full mt-4 py-3 text-slate-500 hover:text-white font-black uppercase tracking-widest text-[10px] transition-colors relative z-10"
            >
              Cancel
            </button>

          </div>
        </div>
      )}

    </div>
  );
};

export default Login;