import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { useContext } from 'react';

// Import your components and pages
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Login from './pages/Login';
import ParticipantLogin from './pages/ParticipantLogin';
import Portal from './pages/Portal';
import ResetPassword from './pages/ResetPassword';
import Scanner from './components/Scanner';
import Stats from './components/Stats';
import ParticipantList from './components/ParticipantList';
import CommandCenter from './components/CommandCenter';
import BadgeGenerator from './components/BadgeGenerator';

// 🛡️ Protected Route Wrapper (Optional, but good practice)
const ProtectedRoute = ({ children, requireAdmin }) => {
    const { user, loading } = useContext(AuthContext);
    
    if (loading) return null; // Or a loading spinner
    if (!user) return <Navigate to="/login" replace />;
    if (requireAdmin && user.role !== 'admin') return <Navigate to="/scan" replace />;
    
    return children;
};

// 📱 THE GLOBAL LAYOUT WRAPPER (This fixes the overlapping issue!)
const AppLayout = ({ children }) => {
    return (
        // pt-20 pushes content below the top header
        // pb-28 pushes content above the bottom nav bar
        <div className="min-h-screen bg-slate-950 pt-20 pb-28 overflow-x-hidden font-sans text-slate-200">
            <Navbar />
            <main className="w-full h-full relative z-10 px-4 md:px-8">
                {children}
            </main>
        </div>
    );
};

const App = () => {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    {/* Public Full-Screen Pages (No Navbar) */}
                    <Route path="/" element={<Landing />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/pass" element={<ParticipantLogin />} />
                    <Route path="/portal" element={<Portal />} />
                    <Route path="/resetpassword/:token" element={<ResetPassword />} />

                    {/* App Pages (Wrapped in Layout with Navbar) */}
                    <Route path="/scan" element={
                        <ProtectedRoute>
                            <AppLayout>
                                <Scanner />
                            </AppLayout>
                        </ProtectedRoute>
                    } />
                    
                    <Route path="/dashboard" element={
                        <ProtectedRoute requireAdmin={true}>
                            <AppLayout>
                                <Stats />
                            </AppLayout>
                        </ProtectedRoute>
                    } />
                    
                    <Route path="/roster" element={
                        <ProtectedRoute requireAdmin={true}>
                            <AppLayout>
                                <ParticipantList />
                            </AppLayout>
                        </ProtectedRoute>
                    } />
                    
                    <Route path="/command" element={
                        <ProtectedRoute requireAdmin={true}>
                            <AppLayout>
                                <CommandCenter />
                            </AppLayout>
                        </ProtectedRoute>
                    } />
                    
                    <Route path="/print" element={
                        <ProtectedRoute requireAdmin={true}>
                            <AppLayout>
                                <BadgeGenerator />
                            </AppLayout>
                        </ProtectedRoute>
                    } />

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
};

export default App;