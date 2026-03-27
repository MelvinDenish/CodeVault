import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listRepos().then(setRepos).catch(console.error).finally(() => setLoading(false));
  }, []);

  const langColors = {
    js: '#f1e05a', py: '#3572A5', java: '#b07219', ts: '#3178c6',
    html: '#e34c26', css: '#563d7c', go: '#00ADD8', default: '#8b949e'
  };

  return (
    <div className="fade-in" style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '4px' }}>
            👋 Hello, {user?.username}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Manage your repositories and track your projects
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/new')}>
          <span style={{ fontSize: '16px' }}>＋</span> New Repository
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {[
          { label: 'Repositories', value: repos.length, icon: '📦', color: 'var(--accent-blue)' },
          { label: 'Total Commits', value: repos.reduce((a, r) => a + (r.commitCount || 0), 0), icon: '💾', color: 'var(--accent-green)' },
          { label: 'Total Branches', value: repos.reduce((a, r) => a + (r.branchCount || 0), 0), icon: '🌿', color: 'var(--accent-purple)' },
          { label: 'Stars', value: repos.reduce((a, r) => a + (r.starCount || 0), 0), icon: '⭐', color: 'var(--accent-orange)' },
        ].map((stat, i) => (
          <div key={i} className="card-flat" style={{ textAlign: 'center', padding: '24px' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>{stat.icon}</div>
            <div style={{ fontSize: '32px', fontWeight: 700, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Repository List */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600 }}>📂 Your Repositories</h2>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gap: '12px' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: '100px', borderRadius: '12px' }} />
          ))}
        </div>
      ) : repos.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>
            No repositories yet
          </h3>
          <p style={{ marginBottom: '20px' }}>Create your first repository to get started</p>
          <button className="btn btn-primary" onClick={() => navigate('/new')}>Create Repository</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {repos.map((repo, i) => (
            <Link key={repo.repoId} to={`/repo/${repo.repoId}`}
              className="card" style={{ textDecoration: 'none', animationDelay: `${i * 50}ms` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '16px' }}>📦</span>
                    <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--accent-blue)' }}>
                      {repo.name}
                    </span>
                    <span className={`badge ${repo.visibility === 'public' ? 'badge-green' : 'badge-orange'}`}>
                      {repo.visibility}
                    </span>
                  </div>
                  {repo.description && (
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', marginLeft: '26px' }}>
                      {repo.description}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <span>💾 {repo.commitCount}</span>
                  <span>🌿 {repo.branchCount}</span>
                  <span>⭐ {repo.starCount}</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '12px', marginLeft: '26px',
                fontSize: '12px', color: 'var(--text-muted)' }}>
                <span>Default: {repo.defaultBranch || 'main'}</span>
                <span>Updated {new Date(repo.createdAt).toLocaleDateString()}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
