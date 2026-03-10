import { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';

// Import all your polished components
import Navbar from './components/Navbar';
import Login from './components/Login';
import Scanner from './components/Scanner';
import ParticipantList from './components/ParticipantList';
import CommandCenter from './components/CommandCenter';
import Stats from './components/Stats';
import BadgeGenerator from './components/BadgeGenerator';

// 🛡️ Custom Router Guard
const ProtectedRoute = ({ children, requireAdmin = false }) => {
    const { user, isLoading } = useContext(AuthContext);

    if (isLoading) {
        return <div className="h-screen flex items-center justify-center bg-slate-950 text-teal-400 font-black animate-pulse tracking-widest uppercase text-xs">Authenticating...</div>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (requireAdmin && user.role !== 'admin') {
        return <Navigate to="/" replace />; // Kick non-admins back to the scanner
    }

    return children;
};

function App() {
    const { user, isLoading } = useContext(AuthContext);

    if (isLoading) return null;

    return (
        <Router>
            <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-teal-500/30">
                {/* Only show Navbar if logged in */}
                {user && <Navbar />}
                
                <main className="p-4 md:p-8 pt-20 pb-28 max-w-7xl mx-auto">
                    <Routes>
                        {/* Public Route */}
                        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />

                        {/* Universal Protected Route (Both Volunteers & Admins) */}
                        <Route 
                            path="/" 
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
                        <Route 
                            path="/print" 
                            element={
                                <ProtectedRoute requireAdmin={true}>
                                    <BadgeGenerator />
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