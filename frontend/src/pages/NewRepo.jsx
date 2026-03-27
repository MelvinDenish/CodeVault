import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

export default function NewRepo() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setError('Repository name is required');
    if (!/^[a-zA-Z0-9_.-]+$/.test(name)) return setError('Name can only contain letters, numbers, hyphens, dots, and underscores');
    
    setLoading(true);
    setError('');
    try {
      const repo = await api.createRepo({ name: name.trim(), description, visibility });
      navigate(`/repo/${repo.repoId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in" style={{ maxWidth: '640px', margin: '0 auto', padding: '40px 24px' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>Create a new repository</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '14px' }}>
        A repository contains all project files, including the revision history.
      </p>

      <form onSubmit={handleSubmit}>
        {error && (
          <div style={{
            padding: '10px 14px', background: 'rgba(248,81,73,0.1)',
            border: '1px solid rgba(248,81,73,0.3)', borderRadius: '8px',
            color: 'var(--accent-red)', fontSize: '13px', marginBottom: '20px',
          }}>{error}</div>
        )}

        <div style={{ marginBottom: '24px' }}>
          <label className="label">Repository name *</label>
          <input type="text" className="input-field" value={name}
            onChange={(e) => setName(e.target.value)} required
            placeholder="my-awesome-project" style={{ fontSize: '16px' }} />
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
            Great repository names are short and memorable.
          </p>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label className="label">Description (optional)</label>
          <textarea className="input-field" value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Briefly describe your repository" rows={3} />
        </div>

        <div style={{ marginBottom: '32px' }}>
          <label className="label">Visibility</label>
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            {['public', 'private'].map(v => (
              <button key={v} type="button"
                onClick={() => setVisibility(v)}
                style={{
                  flex: 1, padding: '16px', borderRadius: '10px',
                  border: `2px solid ${visibility === v ? 'var(--accent-blue)' : 'var(--border-color)'}`,
                  background: visibility === v ? 'rgba(88,166,255,0.08)' : 'var(--bg-primary)',
                  cursor: 'pointer', transition: 'all 0.2s',
                  color: 'var(--text-primary)',
                }}>
                <div style={{ fontSize: '20px', marginBottom: '6px' }}>{v === 'public' ? '🌐' : '🔒'}</div>
                <div style={{ fontWeight: 600, fontSize: '14px', textTransform: 'capitalize' }}>{v}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {v === 'public' ? 'Anyone can see this repository' : 'Only you and collaborators can see'}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '24px' }}>
          <button type="submit" className="btn btn-success btn-lg" disabled={loading}
            style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? '⏳ Creating...' : '✨ Create repository'}
          </button>
        </div>
      </form>
    </div>
  );
}
