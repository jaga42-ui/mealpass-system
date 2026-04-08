import { useContext } from 'react';
import { NavLink } from 'react-router-dom';
// 👇 Notice the two dots (../) here to go up from /components into /context
import { AuthContext } from '../context/AuthContext';

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);

    // Styling for the bottom tab icons
    const navLinkClass = ({ isActive }) => 
        `flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 ${
            isActive 
            ? 'bg-teal-500/20 text-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.2)] -translate-y-2' 
            : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
        }`;

    return (
        <>
            {/* 📱 TOP HEADER (Minimal: Just Logo & Logout) */}
            <div className="fixed top-0 left-0 w-full z-[400] flex items-center justify-between p-4 bg-gradient-to-b from-slate-950/90 to-transparent pointer-events-none">
                <div className="flex items-center gap-2 pointer-events-auto">
                    <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-teal-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(20,184,166,0.3)]">
                        <i className="ph-bold ph-shield-check text-white text-sm"></i>
                    </div>
                    <span className="font-black text-white text-sm tracking-widest uppercase drop-shadow-md">
                        Aahaaram
                    </span>
                </div>

                <button 
                    onClick={logout}
                    className="pointer-events-auto w-8 h-8 bg-rose-500/10 backdrop-blur-md hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/30 rounded-lg flex items-center justify-center transition-all duration-300 shadow-[0_0_15px_rgba(244,63,94,0.2)] active:scale-95"
                >
                    <i className="ph-bold ph-power text-sm"></i>
                </button>
            </div>

            {/* 📱 BOTTOM TAB BAR (Thumb Navigation) */}
            <nav className="fixed bottom-0 left-0 w-full z-[500] bg-slate-950/90 backdrop-blur-2xl border-t border-white/10 pb-safe pt-2 px-2 sm:px-6 shadow-[0_-10px_40px_rgba(0,0,0,0.8)]">
                <div className="flex items-center justify-around max-w-md mx-auto relative pb-2">
                    
                    <NavLink to="/scan" className={navLinkClass}>
                        <i className="ph-bold ph-scan text-2xl mb-1"></i>
                        <span className="text-[8px] font-black uppercase tracking-widest">Scan</span>
                    </NavLink>

                    {/* Admin Only Tabs */}
                    {user?.role === 'admin' && (
                        <>
                            <NavLink to="/dashboard" className={navLinkClass}>
                                <i className="ph-bold ph-chart-polar text-2xl mb-1"></i>
                                <span className="text-[8px] font-black uppercase tracking-widest">Stats</span>
                            </NavLink>
                            
                            <NavLink to="/roster" className={navLinkClass}>
                                <i className="ph-bold ph-users text-2xl mb-1"></i>
                                <span className="text-[8px] font-black uppercase tracking-widest">Roster</span>
                            </NavLink>
                            
                            <NavLink to="/command" className={navLinkClass}>
                                <i className="ph-bold ph-sliders text-2xl mb-1"></i>
                                <span className="text-[8px] font-black uppercase tracking-widest">Cmd</span>
                            </NavLink>

                            <NavLink to="/print" className={navLinkClass}>
                                <i className="ph-bold ph-printer text-2xl mb-1"></i>
                                <span className="text-[8px] font-black uppercase tracking-widest">Print</span>
                            </NavLink>
                        </>
                    )}
                </div>
            </nav>
        </>
    );
};

export default Navbar;