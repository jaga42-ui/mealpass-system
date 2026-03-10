import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import AdminPanel from '../components/AdminPanel';
import Scanner from '../components/Scanner';
import ParticipantList from '../components/ParticipantList';
import Stats from '../components/Stats'; 
import CommandCenter from '../components/CommandCenter'; 
import BadgeGenerator from '../components/BadgeGenerator'; // <-- 1. Import the new component

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
        // The new full-screen deep teal gradient wrapper
        <div className="fixed inset-0 w-full h-full bg-gradient-to-br from-teal-950 via-teal-900 to-slate-900 flex flex-col items-center overflow-hidden font-sans">
            
            <div className="w-full max-w-md h-full flex flex-col relative z-10 shadow-2xl bg-black/10">
                
                {/* Premium Glass Header */}
                <header className="relative px-6 py-5 z-50 shrink-0 bg-white/5 backdrop-blur-md border-b border-white/10 print:hidden">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-teal-500 rounded-xl flex items-center justify-center text-white shadow-[0_0_15px_rgba(20,184,166,0.4)]">
                                <i className="ph-bold ph-scan text-xl animate-pulse"></i>
                            </div>
                            <div className="text-white">
                                <h2 className="font-black text-xl tracking-wide leading-none">Access<span className="text-teal-400">Pro</span></h2>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[9px] font-bold text-teal-200/70 uppercase tracking-[0.2em]">
                                        {user?.role} Terminal
                                    </span>
                                </div>
                            </div>
                        </div>
                        <button 
                            onClick={handleLogout} 
                            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 text-teal-100 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/50 active:scale-90 transition-all duration-300 flex items-center justify-center"
                            title="Logout"
                        >
                            <i className="ph-bold ph-power text-lg"></i>
                        </button>
                    </div>
                </header>

                {/* Dynamic Content Area */}
                {/* Notice the 'print:overflow-visible' and 'print:pb-0' - this ensures the print view isn't cut off by scrollbars */}
                <main className="flex-1 w-full px-4 overflow-y-auto no-scrollbar pb-32 pt-6 print:p-0 print:overflow-visible print:bg-white print:h-auto">
                    {activeTab === 'scanner' && <Scanner />}
                    {activeTab === 'register' && user?.role === 'admin' && <AdminPanel />}
                    {activeTab === 'users' && user?.role === 'admin' && <ParticipantList />}
                    {activeTab === 'stats' && user?.role === 'admin' && <Stats />}
                    {activeTab === 'command' && user?.role === 'admin' && <CommandCenter />}
                    {activeTab === 'print' && user?.role === 'admin' && <BadgeGenerator />} {/* <-- 2. Render the Print Station */}
                </main>

                {/* Floating Frosted Pill Navigation */}
                <div className="absolute bottom-6 left-4 right-4 bg-slate-900/80 backdrop-blur-xl border border-white/10 p-2 rounded-3xl flex items-center justify-between shadow-[0_20px_50px_-10px_rgba(0,0,0,0.7)] z-50 print:hidden">
                    
                    <button 
                        onClick={() => setActiveTab('scanner')}
                        className={`flex flex-col items-center justify-center flex-1 py-3 rounded-2xl active:scale-95 transition-all duration-300 ${activeTab === 'scanner' ? 'bg-teal-500 text-white shadow-[0_0_20px_rgba(20,184,166,0.3)] translate-y-[-4px]' : 'text-slate-400 hover:text-teal-200 hover:bg-white/5'}`}
                    >
                        <i className={`text-2xl mb-1 ${activeTab === 'scanner' ? 'ph-fill ph-scan' : 'ph-bold ph-scan'}`}></i>
                        <span className="text-[9px] font-black uppercase tracking-wider">Scan</span>
                    </button>

                    {/* Admin Navigation Elements */}
                    {user?.role === 'admin' && (
                        <>
                            <button 
                                onClick={() => setActiveTab('users')}
                                className={`flex flex-col items-center justify-center flex-1 py-3 rounded-2xl active:scale-95 transition-all duration-300 ${activeTab === 'users' ? 'bg-teal-500 text-white shadow-[0_0_20px_rgba(20,184,166,0.3)] translate-y-[-4px]' : 'text-slate-400 hover:text-teal-200 hover:bg-white/5'}`}
                            >
                                <i className={`text-2xl mb-1 ${activeTab === 'users' ? 'ph-fill ph-users' : 'ph-bold ph-users'}`}></i>
                                <span className="text-[9px] font-black uppercase tracking-wider">Roster</span>
                            </button>

                            {/* 🛡️ 3. THE NEW PRINT TAB 🛡️ */}
                            <button 
                                onClick={() => setActiveTab('print')}
                                className={`flex flex-col items-center justify-center flex-1 py-3 rounded-2xl active:scale-95 transition-all duration-300 ${activeTab === 'print' ? 'bg-teal-500 text-white shadow-[0_0_20px_rgba(20,184,166,0.3)] translate-y-[-4px]' : 'text-slate-400 hover:text-teal-200 hover:bg-white/5'}`}
                            >
                                <i className={`text-2xl mb-1 ${activeTab === 'print' ? 'ph-fill ph-printer' : 'ph-bold ph-printer'}`}></i>
                                <span className="text-[9px] font-black uppercase tracking-wider">Print</span>
                            </button>

                            <button 
                                onClick={() => setActiveTab('stats')}
                                className={`flex flex-col items-center justify-center flex-1 py-3 rounded-2xl active:scale-95 transition-all duration-300 ${activeTab === 'stats' ? 'bg-teal-500 text-white shadow-[0_0_20px_rgba(20,184,166,0.3)] translate-y-[-4px]' : 'text-slate-400 hover:text-teal-200 hover:bg-white/5'}`}
                            >
                                <i className={`text-2xl mb-1 ${activeTab === 'stats' ? 'ph-fill ph-chart-bar' : 'ph-bold ph-chart-bar'}`}></i>
                                <span className="text-[9px] font-black uppercase tracking-wider">Stats</span>
                            </button>

                            <button 
                                onClick={() => setActiveTab('command')}
                                className={`flex flex-col items-center justify-center flex-1 py-3 rounded-2xl active:scale-95 transition-all duration-300 ${activeTab === 'command' ? 'bg-teal-500 text-white shadow-[0_0_20px_rgba(20,184,166,0.3)] translate-y-[-4px]' : 'text-slate-400 hover:text-teal-200 hover:bg-white/5'}`}
                            >
                                <i className={`text-2xl mb-1 ${activeTab === 'command' ? 'ph-fill ph-shield-star' : 'ph-bold ph-shield-star'}`}></i>
                                <span className="text-[9px] font-black uppercase tracking-wider">Cmd</span>
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;