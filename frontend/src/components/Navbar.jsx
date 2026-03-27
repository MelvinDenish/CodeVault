import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showMenu, setShowMenu] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };

  return (
    <nav style={{
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border-color)',
      padding: '0 24px',
      height: '64px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      backdropFilter: 'blur(12px)',
    }}>
      {/* Left */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'var(--gradient-blue)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px', fontWeight: 800, color: 'white'
          }}>⟨⟩</div>
          <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
            CodeVault
          </span>
        </Link>

        {user && (
          <form onSubmit={handleSearch} style={{ position: 'relative' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search repos, users..."
              style={{
                padding: '6px 14px 6px 36px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                fontSize: '13px',
                width: '280px',
                outline: 'none',
                transition: 'border-color 0.2s, width 0.3s',
              }}
              onFocus={(e) => e.target.style.width = '360px'}
              onBlur={(e) => e.target.style.width = '280px'}
            />
            <span style={{
              position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text-muted)', fontSize: '14px'
            }}>🔍</span>
          </form>
        )}
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {user ? (
          <>
            <Link to="/explore" className="btn btn-ghost" style={{ fontSize: '13px' }}>Explore</Link>
            <Link to="/new" className="btn btn-ghost" style={{ fontSize: '13px' }}>
              <span style={{ fontSize: '16px' }}>＋</span> New
            </Link>
            <div className="dropdown" style={{ position: 'relative' }}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                style={{
                  width: '34px', height: '34px', borderRadius: '50%',
                  background: 'var(--gradient-purple)',
                  border: '2px solid var(--border-color)',
                  color: 'white', fontWeight: 700, fontSize: '14px',
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', transition: 'border-color 0.2s',
                }}
                onMouseEnter={(e) => e.target.style.borderColor = 'var(--accent-purple)'}
                onMouseLeave={(e) => e.target.style.borderColor = 'var(--border-color)'}
              >
                {user.username?.[0]?.toUpperCase() || 'U'}
              </button>
              {showMenu && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setShowMenu(false)} />
                  <div className="dropdown-menu" style={{ right: 0, left: 'auto', minWidth: '180px', zIndex: 50 }}>
                    <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)', marginBottom: '4px' }}>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>{user.username}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{user.email}</div>
                    </div>
                    <button className="dropdown-item" onClick={() => { setShowMenu(false); navigate('/dashboard'); }}>
                      📊 Dashboard
                    </button>
                    <button className="dropdown-item" onClick={() => { setShowMenu(false); navigate('/profile'); }}>
                      👤 Profile
                    </button>
                    <div style={{ borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />
                    <button className="dropdown-item" style={{ color: 'var(--accent-red)' }}
                      onClick={() => { logout(); setShowMenu(false); navigate('/login'); }}>
                      🚪 Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <>
            <Link to="/login" className="btn btn-outline btn-sm">Sign in</Link>
            <Link to="/register" className="btn btn-primary btn-sm">Sign up</Link>
          </>
        )}
      </div>
    </nav>
  );
}
