import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';

export default function CommitDetail() {
  const { id } = useParams();
  const [commit, setCommit] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCommit(id).then(setCommit).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>
      <div className="skeleton" style={{ height: '60px', marginBottom: '20px' }} />
      <div className="skeleton" style={{ height: '300px' }} />
    </div>
  );

  if (!commit) return <div className="empty-state"><h2>Commit not found</h2></div>;

  const renderDiff = (diffText) => {
    if (!diffText) return null;
    return diffText.split('\n').map((line, i) => {
      let cls = '';
      if (line.startsWith('+') && !line.startsWith('+++')) cls = 'diff-added';
      else if (line.startsWith('-') && !line.startsWith('---')) cls = 'diff-removed';
      else if (line.startsWith('@@')) cls = 'diff-header';

      return (
        <div key={i} className={`diff-line ${cls}`}>
          <span className="diff-line-number">{i + 1}</span>
          {line}
        </div>
      );
    });
  };

  return (
    <div className="fade-in" style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <Link to={`/repo/${commit.repoId}`} className="btn btn-ghost btn-sm" style={{ marginBottom: '16px' }}>
        ← Back to repository
      </Link>

      <div className="card-flat" style={{ marginBottom: '24px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>{commit.message}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <span>👤 {commit.authorName}</span>
              <span>🕐 {new Date(commit.commitTime).toLocaleString()}</span>
              <span className="badge badge-blue" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {commit.commitHash}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span className="badge badge-purple">{commit.files?.length || 0} files</span>
          </div>
        </div>
      </div>

      {/* Diffs */}
      <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>
        Changes ({commit.diffs?.length || 0} files)
      </h2>

      {commit.diffs?.map((diff, i) => (
        <div key={i} className="card-flat" style={{ marginBottom: '16px', padding: 0, overflow: 'hidden' }}>
          <div style={{
            padding: '10px 16px', background: 'var(--bg-tertiary)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: 500 }}>
              {diff.filePath}
            </span>
            <span className={`badge ${diff.status === 'added' ? 'badge-green' : diff.status === 'deleted' ? 'badge-red' : 'badge-orange'}`}>
              {diff.status}
            </span>
          </div>
          <div className="diff-container" style={{ border: 'none', borderRadius: 0, maxHeight: '500px', overflow: 'auto' }}>
            {renderDiff(diff.diff)}
          </div>
        </div>
      ))}
    </div>
  );
}
