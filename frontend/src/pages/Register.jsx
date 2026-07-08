import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }
    if (password.length < 6) {
      return setError('Password must be at least 6 characters');
    }
    setLoading(true);
    try {
      await register(username, email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '20px',
      background: 'radial-gradient(ellipse at top, rgba(167,139,250,0.06) 0%, transparent 60%)',
    }}>
      <div className="fade-in" style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px',
            background: 'var(--gradient-purple)', margin: '0 auto 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '28px', fontWeight: 800, color: 'white',
            boxShadow: '0 8px 30px rgba(137,87,229,0.3)',
          }}>⟨⟩</div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>Create account</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Join CodeVault to start building</p>
        </div>

        <div className="card-flat" style={{ padding: '28px' }}>
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{
                padding: '10px 14px', background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px',
                color: 'var(--accent-red)', fontSize: '13px', marginBottom: '20px',
              }}>{error}</div>
            )}

            <div style={{ marginBottom: '18px' }}>
              <label className="label">Username</label>
              <input type="text" className="input-field" value={username}
                onChange={(e) => setUsername(e.target.value)} required placeholder="johndoe" />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label className="label">Email address</label>
              <input type="email" className="input-field" value={email}
                onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label className="label">Password</label>
              <input type="password" className="input-field" value={password}
                onChange={(e) => setPassword(e.target.value)} required placeholder="Min 6 characters" />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label className="label">Confirm Password</label>
              <input type="password" className="input-field" value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)} required placeholder="••••••••" />
            </div>

            <button type="submit" className="btn btn-primary btn-lg" disabled={loading}
              style={{ width: '100%', justifyContent: 'center', background: 'var(--gradient-purple)' }}>
              {loading ? '⏳ Creating...' : '🚀 Create account'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent-green)', textDecoration: 'none', fontWeight: 500 }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
