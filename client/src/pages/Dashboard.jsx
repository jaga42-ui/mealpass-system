import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import AdminPanel from '../components/AdminPanel';
import Scanner from '../components/Scanner';
import ParticipantList from '../components/ParticipantList';
import Stats from '../components/Stats'; 
import CommandCenter from '../components/CommandCenter'; // <-- Powerhouse imported

const Dashboard = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    
    // Manage which tab is currently active
    const [activeTab, setActiveTab] = useState('scanner');

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="flex flex-col h-full w-full max-w-md mx-auto relative z-10 overflow-hidden">
            
            {/* Header / Navbar */}
            <header className="relative p-6 pb-2 animate-enter z-50 shrink-0">
                <div className="flex justify-between items-center transition-all duration-300">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/90 backdrop-blur rounded-2xl flex items-center justify-center text-[#2A7B9B] shadow-lg">
                            <i className="ph-duotone ph-bowl-food text-2xl"></i>
                        </div>
                        <div className="text-white drop-shadow-md">
                            <h2 className="font-extrabold text-xl leading-none">MealPass</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-bold opacity-80 uppercase tracking-widest">
                                    {user?.role} Terminal
                                </span>
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={handleLogout} 
                        className="w-10 h-10 rounded-full bg-white/20 backdrop-blur border border-white/30 text-white hover:bg-red-500/80 hover:border-red-500 transition-all flex items-center justify-center shadow-md"
                        title="Logout"
                    >
                        <i className="ph-bold ph-power text-lg"></i>
                    </button>
                </div>
            </header>

            {/* Dynamic Content Area */}
            <main className="flex-1 px-4 overflow-y-auto no-scrollbar pb-28 pt-4">
                {activeTab === 'scanner' && <Scanner />}
                
                {activeTab === 'register' && user?.role === 'admin' && <AdminPanel />}
                
                {activeTab === 'users' && user?.role === 'admin' && <ParticipantList />}

                {activeTab === 'stats' && user?.role === 'admin' && <Stats />}

                {/* Added Command Center Render */}
                {activeTab === 'command' && user?.role === 'admin' && <CommandCenter />}
            </main>

            {/* Bottom Navigation Bar (Glassmorphism) */}
            <div className="absolute bottom-6 left-4 right-4 glass p-2 rounded-2xl flex items-center justify-between shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] z-50">
                
                <button 
                    onClick={() => setActiveTab('scanner')}
                    className={`flex flex-col items-center justify-center w-full py-2 rounded-xl transition-all ${activeTab === 'scanner' ? 'bg-[#2A7B9B] text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                    <i className={`text-2xl ${activeTab === 'scanner' ? 'ph-fill ph-scan' : 'ph-duotone ph-scan'}`}></i>
                    <span className="text-[8px] font-bold uppercase mt-1 tracking-wider">Scan</span>
                </button>

                {/* Only Admins get the extra tabs */}
                {user?.role === 'admin' && (
                    <>
                        <button 
                            onClick={() => setActiveTab('register')}
                            className={`flex flex-col items-center justify-center w-full py-2 rounded-xl transition-all ${activeTab === 'register' ? 'bg-[#2A7B9B] text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
                        >
                            <i className={`text-2xl ${activeTab === 'register' ? 'ph-fill ph-user-plus' : 'ph-duotone ph-user-plus'}`}></i>
                            <span className="text-[8px] font-bold uppercase mt-1 tracking-wider">Add</span>
                        </button>

                        <button 
                            onClick={() => setActiveTab('users')}
                            className={`flex flex-col items-center justify-center w-full py-2 rounded-xl transition-all ${activeTab === 'users' ? 'bg-[#2A7B9B] text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
                        >
                            <i className={`text-2xl ${activeTab === 'users' ? 'ph-fill ph-users' : 'ph-duotone ph-users'}`}></i>
                            <span className="text-[8px] font-bold uppercase mt-1 tracking-wider">Roster</span>
                        </button>

                        <button 
                            onClick={() => setActiveTab('stats')}
                            className={`flex flex-col items-center justify-center w-full py-2 rounded-xl transition-all ${activeTab === 'stats' ? 'bg-[#2A7B9B] text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
                        >
                            <i className={`text-2xl ${activeTab === 'stats' ? 'ph-fill ph-chart-bar' : 'ph-duotone ph-chart-bar'}`}></i>
                            <span className="text-[8px] font-bold uppercase mt-1 tracking-wider">Stats</span>
                        </button>

                        {/* NEW COMMAND BUTTON */}
                        <button 
                            onClick={() => setActiveTab('command')}
                            className={`flex flex-col items-center justify-center w-full py-2 rounded-xl transition-all ${activeTab === 'command' ? 'bg-[#2A7B9B] text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
                        >
                            <i className={`text-2xl ${activeTab === 'command' ? 'ph-fill ph-shield-star' : 'ph-duotone ph-shield-star'}`}></i>
                            <span className="text-[8px] font-bold uppercase mt-1 tracking-wider">Command</span>
                        </button>
                    </>
                )}
            </div>

        </div>
    );
};

export default Dashboard;