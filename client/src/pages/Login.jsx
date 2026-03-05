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
        // Hit the /api/auth/register endpoint
        await register(email, password);
        setIsSignup(false);
        setError('');
        alert("Account created successfully! Please log in.");
      } else {
        // Hit the /api/auth/login endpoint
        await login(email, password);
        navigate('/dashboard'); 
      }
    } catch (err) {
      // Safely extract the error message from the Express backend
      setError(err.response?.data?.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm animate-enter relative z-10">
        
        {/* Header Section */}
        <div className="text-center mb-10">
          <div className="w-24 h-24 mx-auto bg-white/90 backdrop-blur-xl rounded-[2rem] flex items-center justify-center shadow-2xl mb-6 animate-float">
            <i className="ph-duotone ph-shield-check text-5xl text-[#2480D1]"></i>
          </div>
          <h1 className="text-4xl font-extrabold text-white drop-shadow-md">
            Welcome
          </h1>
          <p className="text-teal-100 font-medium mt-2">
            Sign in to access the terminal
          </p>
        </div>

        {/* Form Section */}
        <form onSubmit={handleAuth} className="glass p-8 rounded-[2.5rem] shadow-2xl space-y-5">
          
          {/* Error Message Display */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-600 text-xs font-bold px-4 py-3 rounded-xl text-center">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase ml-3">
              Email Access
            </label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/50 border border-white rounded-2xl py-4 px-5 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2A7B9B] transition-all" 
              placeholder="admin@utsah.com"
              required
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase ml-3">
              Security Key
            </label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/50 border border-white rounded-2xl py-4 px-5 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2A7B9B] transition-all" 
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full py-4 text-white font-bold rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 ${loading ? 'bg-slate-600 cursor-not-allowed' : 'bg-slate-900 hover:scale-[1.02] active:scale-[0.98]'}`}
          >
            <span>
              {loading ? 'Processing...' : (isSignup ? 'Create Account' : 'Authenticate')}
            </span> 
            {!loading && <i className="ph-bold ph-arrow-right"></i>}
          </button>

          <div className="pt-2 text-center">
            <button 
              type="button"
              onClick={() => {
                setIsSignup(!isSignup);
                setError('');
              }} 
              className="text-xs font-bold text-[#2480D1] hover:text-[#2A7B9B] uppercase tracking-widest transition-colors"
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