import { useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';
import api from '../api/axios';

const PendingScreen = () => {
  const { user, setUser, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    // If they aren't pending anymore (somehow got here by mistake), push them out
    if (user && user.role !== 'pending') {
      navigate('/scan');
      return;
    }

    // 🔄 SHORT POLLING LOGIC 🔄
    const intervalId = setInterval(async () => {
      try {
        // 🛑 THE FIX: We add a timestamp query to bust the browser cache!
        // This forces the browser to fetch fresh data from the server every single time.
        const response = await api.get(`/auth/me?t=${new Date().getTime()}`); 
        const latestUserData = response.data.user;

        console.log("Polling Check: Current Role is", latestUserData.role); // Debugging log

        if (latestUserData.role !== 'pending') {
          // 🎉 THE ADMIN APPROVED THEM! 🎉
          clearInterval(intervalId); // Stop polling immediately
          
          // Update Local Storage
          localStorage.setItem('mealpass_user', JSON.stringify(latestUserData));
          
          // Update Global State
          setUser(latestUserData);
          
          // Instantly teleport them to the scanner page without a refresh
          navigate('/scan'); 
        }
      } catch (error) {
        // If this logs a 404, your backend route isn't set up right!
        console.error("Failed to fetch user status. Is /auth/me working?", error);
      }
    }, 5000); // 5000ms = 5 seconds

    // Cleanup function to stop polling if they leave the page
    return () => clearInterval(intervalId);
  }, [navigate, user, setUser]);

  return (
    <div className="min-h-screen w-full bg-stone-950 flex flex-col items-center justify-center font-sans relative overflow-hidden px-4">
      
      {/* Ambient Lighting */}
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-emerald-600/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="relative z-10 flex flex-col items-center animate-enter text-center max-w-md">
        
        {/* Animated Radar/Ping Icon */}
        <div className="relative flex items-center justify-center mb-8">
          <div className="absolute w-24 h-24 bg-amber-500/20 rounded-full animate-ping"></div>
          <div className="absolute w-32 h-32 bg-amber-500/10 rounded-full animate-ping" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-16 h-16 bg-stone-900 border border-amber-500/30 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.2)] relative z-10">
            <i className="ph-duotone ph-hourglass-high text-3xl text-amber-500 animate-pulse"></i>
          </div>
        </div>

        <h1 className="text-3xl font-black text-white tracking-wide mb-3">
          Awaiting Verification
        </h1>
        
        <p className="text-stone-400 text-sm leading-relaxed mb-10 px-6">
          Your account has been created successfully. For security purposes, an NGO Administrator must manually verify your credentials before you can access the scanner module.
        </p>

        <div className="bg-stone-900/50 border border-stone-800 rounded-2xl p-4 w-full flex items-center gap-4 mb-8">
          <i className="ph-duotone ph-info text-2xl text-stone-500"></i>
          <div className="text-left">
            <p className="text-stone-300 text-xs font-bold tracking-wide">Status Check Active</p>
            <p className="text-stone-500 text-[10px]">This page will update automatically once approved.</p>
          </div>
        </div>

        <button 
          onClick={() => {
            logout();
            navigate('/login');
          }}
          className="text-[10px] font-black text-stone-500 hover:text-white uppercase tracking-widest transition-colors"
        >
          Sign Out & Return Later
        </button>

      </div>
    </div>
  );
};

export default PendingScreen;