import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import NewRepo from './pages/NewRepo';
import RepoView from './pages/RepoView';
import CommitDetail from './pages/CommitDetail';
import PRDetail from './pages/PRDetail';
import IssueDetail from './pages/IssueDetail';
import Explore from './pages/Explore';
import Search from './pages/Search';
import Profile from './pages/Profile';
import Settings from './pages/Settings';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px)' }}>
      <div className="skeleton" style={{ width: '200px', height: '40px' }} />
    </div>
  );
  return user ? children : <Navigate to="/login" />;
}

function LandingPage() {
  const { user } = useAuth();
  if (user) return <Navigate to="/dashboard" />;

  return (
    <div style={{
      minHeight: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '40px 24px',
      background: 'radial-gradient(ellipse at top, rgba(16,185,129,0.08) 0%, transparent 50%), radial-gradient(ellipse at bottom right, rgba(167,139,250,0.06) 0%, transparent 50%)',
    }}>
      <div className="fade-in" style={{ textAlign: 'center', maxWidth: '700px' }}>
        <div style={{
          width: '80px', height: '80px', borderRadius: '20px',
          background: 'var(--gradient-primary)', margin: '0 auto 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '40px', fontWeight: 800, color: 'white',
          boxShadow: '0 12px 40px rgba(16,185,129,0.3)',
        }}>⟨⟩</div>

        <h1 style={{ fontSize: '52px', fontWeight: 800, lineHeight: 1.1, marginBottom: '20px' }}>
          Where code lives,
          <br />
          <span style={{
            background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 40%, #a78bfa 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>collaboration thrives.</span>
        </h1>

        <p style={{ fontSize: '18px', color: 'var(--text-secondary)', marginBottom: '40px', lineHeight: 1.6 }}>
          CodeVault is a powerful version control platform built with Oracle Database.
          Manage repositories, track changes, and collaborate with your team.
        </p>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <a href="/register" className="btn btn-primary btn-lg"
            style={{ padding: '14px 32px', fontSize: '16px', boxShadow: '0 8px 30px rgba(16,185,129,0.3)' }}>
            🚀 Get Started Free
          </a>
          <a href="/explore" className="btn btn-outline btn-lg" style={{ padding: '14px 32px', fontSize: '16px' }}>
            🌍 Explore
          </a>
        </div>

        {/* Feature cards */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px',
          marginTop: '80px', textAlign: 'left'
        }}>
          {[
            { icon: '🔐', title: 'Content-Addressable', desc: 'SHA-256 file hashing with deduplication for efficient storage' },
            { icon: '🌿', title: 'Git-Like Branching', desc: 'Create branches, merge with conflict detection, pull requests' },
            { icon: '🏛️', title: 'Oracle Powered', desc: 'Enterprise-grade Oracle Database backend with PL/SQL logic' },
          ].map((f, i) => (
            <div key={i} className="card-flat" style={{
              padding: '24px', textAlign: 'center',
              background: 'rgba(17,25,22,0.8)', backdropFilter: 'blur(12px)',
            }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>{f.icon}</div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>{f.title}</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AppRoutes() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/new" element={<ProtectedRoute><NewRepo /></ProtectedRoute>} />
        <Route path="/repo/:id" element={<ProtectedRoute><RepoView /></ProtectedRoute>} />
        <Route path="/repo/:id/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/commit/:id" element={<ProtectedRoute><CommitDetail /></ProtectedRoute>} />
        <Route path="/pr/:id" element={<ProtectedRoute><PRDetail /></ProtectedRoute>} />
        <Route path="/issue/:id" element={<ProtectedRoute><IssueDetail /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
