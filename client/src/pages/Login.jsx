import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';

const Login = () => {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, register } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignup) {
        await register(email, password);
        setIsSignup(false);
        setError('');
        alert("Account created successfully! Please log in.");
      } else {
        await login(email, password);
        navigate('/dashboard'); 
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    // Full-screen deep teal gradient
    <div className="fixed inset-0 w-full h-full bg-gradient-to-br from-teal-950 via-teal-900 to-slate-900 flex items-center justify-center p-6 font-sans overflow-hidden">
      
      {/* Background glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-teal-500/20 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-slate-900/80 rounded-full blur-[100px]"></div>

      <div className="w-full max-w-sm animate-enter relative z-10">
        
        {/* Header Section */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 mx-auto bg-teal-500/10 border border-teal-500/30 backdrop-blur-xl rounded-[1.5rem] flex items-center justify-center shadow-[0_0_30px_rgba(20,184,166,0.2)] mb-6 animate-float">
            <i className="ph-duotone ph-lock-key text-4xl text-teal-400"></i>
          </div>
          <h1 className="text-4xl font-black text-white tracking-wide">
            Access<span className="text-teal-400">Pro</span>
          </h1>
          <p className="text-teal-200/60 font-medium mt-2 text-sm uppercase tracking-[0.2em]">
            Secure Terminal Login
          </p>
        </div>

        {/* Form Section - Frosted Glass Card */}
        <form onSubmit={handleAuth} className="bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-[2.5rem] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.7)] space-y-6">
          
          {/* Error Message Display */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold px-4 py-3 rounded-xl text-center backdrop-blur-sm animate-enter">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black text-teal-200/70 uppercase tracking-widest ml-3">
              Email Access
            </label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-900/50 border border-white/10 rounded-2xl py-4 px-5 font-bold text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-all shadow-inner" 
              placeholder="admin@example.com"
              required
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] font-black text-teal-200/70 uppercase tracking-widest ml-3">
              Security Key
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

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full py-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 font-black tracking-wide ${loading ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-teal-500 text-white shadow-[0_0_20px_rgba(20,184,166,0.3)] hover:shadow-[0_0_30px_rgba(20,184,166,0.5)] active:scale-95 translate-y-[-2px] active:translate-y-[0px]'}`}
          >
            <span>
              {loading ? 'Processing...' : (isSignup ? 'Create Account' : 'Authenticate')}
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
              {isSignup ? 'Back to Login' : 'Create New Account'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default Login;