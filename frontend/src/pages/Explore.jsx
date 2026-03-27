import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

export default function Explore() {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.exploreRepos().then(setRepos).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <div className="fade-in" style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>🌍 Explore</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Discover public repositories from the CodeVault community
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gap: '12px' }}>
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: '100px' }} />)}
        </div>
      ) : repos.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: '48px' }}>🌌</div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '8px' }}>
            No public repositories yet
          </h3>
          <p>Be the first to create a public repository!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {repos.map(repo => (
            <Link key={repo.repoId} to={`/repo/${repo.repoId}`} className="card" style={{ textDecoration: 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>
                      {repo.ownerName}/{repo.name}
                    </span>
                    <span className="badge badge-green">public</span>
                  </div>
                  {repo.description && (
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{repo.description}</p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <span>⭐ {repo.starCount}</span>
                  <span>💾 {repo.commitCount}</span>
                  <span>🌿 {repo.branchCount}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
