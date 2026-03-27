import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';

export default function Search() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState({ repos: [], users: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (query) {
      setLoading(true);
      api.search(query).then(setResults).catch(console.error).finally(() => setLoading(false));
    }
  }, [query]);

  return (
    <div className="fade-in" style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '24px' }}>
        Search results for "{query}"
      </h1>

      {loading ? (
        <div className="skeleton" style={{ height: '200px' }} />
      ) : (
        <>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>
            Repositories ({results.repos.length})
          </h2>
          {results.repos.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>No repositories found</p>
          ) : (
            <div style={{ display: 'grid', gap: '8px', marginBottom: '32px' }}>
              {results.repos.map(r => (
                <Link key={r.repoId} to={`/repo/${r.repoId}`} className="card" style={{ textDecoration: 'none', padding: '16px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--accent-blue)' }}>{r.ownerName}/{r.name}</span>
                  {r.description && <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>{r.description}</p>}
                </Link>
              ))}
            </div>
          )}

          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>
            Users ({results.users.length})
          </h2>
          {results.users.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No users found</p>
          ) : (
            <div style={{ display: 'grid', gap: '8px' }}>
              {results.users.map(u => (
                <div key={u.userId} className="card-flat" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: 'var(--gradient-purple)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontWeight: 700, color: 'white', fontSize: '16px'
                  }}>{u.username[0].toUpperCase()}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{u.username}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{u.email}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
