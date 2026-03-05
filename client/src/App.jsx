import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from './context/AuthContext';

// Admin Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

// Participant Pages
import ParticipantLogin from './pages/ParticipantLogin';
import Portal from './pages/Portal';

// A simple wrapper to protect routes from unauthenticated admins/volunteers
const ProtectedRoute = ({ children }) => {
  const { user, isLoading } = useContext(AuthContext);
  if (isLoading) return <div className="h-screen flex items-center justify-center text-white font-bold animate-pulse">Loading secure terminal...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  return (
    <Router>
      <div className="h-screen w-full flex flex-col custom-bg text-slate-800 selection:bg-teal-500 selection:text-white">
        <Routes>
          {/* Admin / Volunteer Routes */}
          <Route path="/login" element={<Login />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />

          {/* Public Participant Routes */}
          <Route path="/pass" element={<ParticipantLogin />} />
          <Route path="/portal" element={<Portal />} />

          {/* Fallback - Redirects unknown URLs to the Admin login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;