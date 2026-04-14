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

            // Save the session
            localStorage.setItem('mealpass_token', res.data.token);
            localStorage.setItem('mealpass_user', JSON.stringify(user)); 
            
            // Route them based on Admin verification status
            if (user.role === 'pending') {
                window.location.href = '/pending'; 
            } else {
                window.location.href = '/scan'; 
            }
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
        // Register the new user
        await register(email, password);
        setIsSignup(false);
        setError('');
        
        // Log them in immediately after creating the account
        const loginRes = await login(email, password);
        
        // Route them to the waiting room
        if (loginRes.user.role === 'pending') {
            navigate('/pending');
        } else {
            navigate('/scan');
        }
      } else {
        // Standard Log In
        const loginRes = await login(email, password);
        
        // Route them based on verification status
        if (loginRes.user.role === 'pending') {
            navigate('/pending');
        } else {
            navigate('/scan'); 
        }
      }
    } catch (err) {
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
    <div className="min-h-screen w-full bg-stone-950 flex flex-col items-center justify-center p-6 py-12 font-sans relative overflow-x-hidden overflow-y-auto">
      
      {/* 🌅 Ambient Lighting */}
      <div className="absolute top-[-5%] right-[-10%] w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[10%] left-[-10%] w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-sm animate-enter relative z-10">
        
        <div className="text-center mb-10">
          <div className="w-20 h-20 mx-auto bg-stone-900 border border-stone-800 rounded-[1.5rem] flex items-center justify-center shadow-2xl mb-6">
            <i className="ph-duotone ph-bowl-food text-4xl text-emerald-500"></i>
          </div>
          <h1 className="text-4xl font-black text-stone-100 tracking-tight mb-2">
            Aahaaram
          </h1>
          <p className="text-stone-400 font-medium mt-2 text-[10px] uppercase tracking-[0.2em]">
            {isSignup ? 'Create Account' : 'Welcome Back'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="bg-stone-900/40 backdrop-blur-md border border-stone-800 p-8 rounded-[2.5rem] shadow-2xl space-y-5">
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-bold px-4 py-3 rounded-xl text-center backdrop-blur-sm animate-enter">
              {error}
            </div>
          )}

          {/* 🛡️ GOOGLE AUTH BUTTON 🛡️ */}
          <button 
            type="button" 
            onClick={() => handleGoogleAuth()}
            disabled={loading}
            className="w-full py-4 bg-white text-stone-900 font-bold text-sm rounded-2xl shadow-lg transition-all duration-300 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98]"
          >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
            <span>Continue with Google</span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 py-1">
            <div className="h-px flex-1 bg-stone-800/50"></div>
            <span className="text-[9px] font-bold uppercase text-stone-600 tracking-widest">Or</span>
            <div className="h-px flex-1 bg-stone-800/50"></div>
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-bold text-stone-500 uppercase tracking-widest ml-3">
              Email
            </label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-stone-950/50 border border-stone-800 rounded-2xl py-4 px-5 font-bold text-stone-200 placeholder-stone-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all shadow-inner text-sm" 
              placeholder="user@example.com"
              required={!isSignup}
            />
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between items-center ml-3 mr-1">
              <label className="text-[9px] font-bold text-stone-500 uppercase tracking-widest">
                Password
              </label>
              
              {!isSignup && (
                <button 
                  type="button" 
                  onClick={() => { setShowForgotModal(true); setForgotMsg(null); }}
                  className="text-[9px] font-bold text-stone-500 hover:text-emerald-400 uppercase tracking-widest transition-colors"
                >
                  Forgot Password?
                </button>
              )}
            </div>
            
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-stone-950/50 border border-stone-800 rounded-2xl py-4 px-5 font-bold text-stone-200 placeholder-stone-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all shadow-inner mt-1 text-sm" 
              placeholder="••••••••"
              required={!isSignup}
              minLength={6}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full py-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 font-bold text-sm mt-2 ${loading ? 'bg-stone-800 text-stone-500 cursor-not-allowed' : 'bg-emerald-600 text-white shadow-[0_10px_30px_rgba(5,150,105,0.2)] hover:bg-emerald-500 active:scale-95'}`}
          >
            <span>
              {loading ? 'Processing...' : (isSignup ? 'Sign Up' : 'Log In')}
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
              className="text-[10px] font-bold text-stone-500 hover:text-stone-300 uppercase tracking-widest transition-colors"
            >
              {isSignup ? 'Back to Login' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>

      {/* 🛡️ PASSWORD RECOVERY MODAL 🛡️ */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-stone-950/90 backdrop-blur-sm animate-enter">
          <div className="bg-stone-900 border border-stone-800 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
            
            <div className="absolute top-0 w-full h-32 bg-gradient-to-b from-emerald-500/10 to-transparent left-0 pointer-events-none"></div>

            <div className="text-center mb-6 relative z-10">
              <div className="w-16 h-16 mx-auto bg-stone-950 border border-stone-800 rounded-2xl flex items-center justify-center shadow-inner mb-4">
                <i className="ph-duotone ph-envelope-simple-open text-3xl text-emerald-500"></i>
              </div>
              <h2 className="text-2xl font-black text-stone-100 tracking-tight">Reset Password</h2>
              <p className="text-stone-500 text-[10px] font-bold uppercase tracking-widest mt-2">
                Enter your email to receive a reset link
              </p>
            </div>

            {forgotMsg && (
              <div className={`mb-6 p-3 rounded-xl text-[11px] font-bold text-center border backdrop-blur-sm animate-enter ${forgotMsg.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                {forgotMsg.text}
              </div>
            )}

            <form onSubmit={handleForgotPassword} className="space-y-4 relative z-10">
              <input 
                type="email" 
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                className="w-full bg-stone-950/50 border border-stone-800 rounded-2xl py-4 px-5 font-bold text-stone-200 placeholder-stone-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all shadow-inner text-sm" 
                placeholder="Email address"
                required
              />
              
              <button 
                type="submit" 
                disabled={forgotLoading}
                className={`w-full py-4 rounded-2xl transition-all duration-300 font-bold text-sm flex items-center justify-center gap-2 ${forgotLoading ? 'bg-stone-800 text-stone-500 cursor-not-allowed' : 'bg-emerald-600 text-white shadow-[0_10px_30px_rgba(5,150,105,0.2)] hover:bg-emerald-500 active:scale-95'}`}
              >
                {forgotLoading ? 'Sending...' : 'Send Link'}
              </button>
            </form>

            <button 
              onClick={() => { setShowForgotModal(false); setForgotMsg(null); }}
              className="w-full mt-4 py-3 text-stone-500 hover:text-stone-300 font-bold uppercase tracking-widest text-[10px] transition-colors relative z-10"
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