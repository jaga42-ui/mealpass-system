import { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';

// Import all your polished components
import Navbar from './components/Navbar';
import Landing from './pages/Landing'; 
import Login from './pages/Login';
import ParticipantLogin from './pages/ParticipantLogin'; 
import Portal from './pages/Portal'; 
import ResetPassword from './pages/ResetPassword'; // 🚀 Added missing import
import Scanner from './components/Scanner';
import ParticipantList from './components/ParticipantList';
import CommandCenter from './components/CommandCenter';
import Stats from './components/Stats';

// 🛡️ Custom Router Guard
const ProtectedRoute = ({ children, requireAdmin = false }) => {
    // 👇 Make sure 'loading' matches what AuthContext exports!
    const { user, loading } = useContext(AuthContext);

    if (loading) {
        return <div className="h-screen flex items-center justify-center bg-slate-950 text-teal-400 font-black animate-pulse tracking-widest uppercase text-xs">Authenticating...</div>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (requireAdmin && user.role !== 'admin') {
        return <Navigate to="/scan" replace />; // Kick non-admins back to the scanner
    }

    return children;
};

function App() {
    // 👇 Make sure 'loading' matches what AuthContext exports!
    const { user, loading } = useContext(AuthContext);

    if (loading) return null;

    return (
        <Router>
            <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-teal-500/30 overflow-x-hidden">
                {/* Only show Navbar if logged in */}
                {user && <Navbar />}
                
                {/* 👇 Added pt-20 and pb-28 here to prevent content from hiding under Navbars */}
                <main className="p-4 md:p-8 pt-20 pb-28 max-w-7xl mx-auto w-full relative z-10">
                    <Routes>
                        {/* 🌍 PUBLIC ROUTES */}
                        <Route path="/" element={!user ? <Landing /> : <Navigate to="/scan" />} />
                        <Route path="/login" element={!user ? <Login /> : <Navigate to="/scan" />} />
                        <Route path="/pass" element={<ParticipantLogin />} />
                        <Route path="/portal" element={<Portal />} /> 
                        <Route path="/resetpassword/:token" element={<ResetPassword />} />

                        {/* 🛡️ UNIVERSAL PROTECTED ROUTE (Both Volunteers & Admins) */}
                        <Route 
                            path="/scan" 
                            element={
                                <ProtectedRoute>
                                    <Scanner />
                                </ProtectedRoute>
                            } 
                        />

                        {/* 👑 ADMIN ONLY ROUTES */}
                        <Route 
                            path="/dashboard" 
                            element={
                                <ProtectedRoute requireAdmin={true}>
                                    <Stats />
                                </ProtectedRoute>
                            } 
                        />
                        <Route 
                            path="/roster" 
                            element={
                                <ProtectedRoute requireAdmin={true}>
                                    <ParticipantList />
                                </ProtectedRoute>
                            } 
                        />
                        <Route 
                            path="/command" 
                            element={
                                <ProtectedRoute requireAdmin={true}>
                                    <CommandCenter />
                                </ProtectedRoute>
                            } 
                        />
                        {/* Catch-all redirect */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </main>
            </div>
        </Router>
    );
}

export default App;