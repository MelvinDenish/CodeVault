import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';

export default function PRDetail() {
  const { id } = useParams();
  const [pr, setPr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState(false);
  const [mergeResult, setMergeResult] = useState(null);

  useEffect(() => {
    api.getPR(id).then(setPr).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  const handleMerge = async () => {
    setMerging(true);
    try {
      const result = await api.mergePR(id);
      setMergeResult(result);
      if (result.merged) {
        const updated = await api.getPR(id);
        setPr(updated);
      }
    } catch (err) {
      setMergeResult({ merged: false, message: err.message });
    } finally {
      setMerging(false);
    }
  };

  const handleClose = async () => {
    try {
      await api.closePR(id);
      const updated = await api.getPR(id);
      setPr(updated);
    } catch (err) { console.error(err); }
  };

  const renderDiff = (diffText) => {
    if (!diffText) return null;
    return diffText.split('\n').map((line, i) => {
      let cls = '';
      if (line.startsWith('+') && !line.startsWith('+++')) cls = 'diff-added';
      else if (line.startsWith('-') && !line.startsWith('---')) cls = 'diff-removed';
      else if (line.startsWith('@@')) cls = 'diff-header';
      return <div key={i} className={`diff-line ${cls}`}><span className="diff-line-number">{i + 1}</span>{line}</div>;
    });
  };

  if (loading) return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>
      <div className="skeleton" style={{ height: '200px' }} />
    </div>
  );

  if (!pr) return <div className="empty-state"><h2>PR not found</h2></div>;

  return (
    <div className="fade-in" style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>
      <Link to={`/repo/${pr.repoId}`} className="btn btn-ghost btn-sm" style={{ marginBottom: '16px' }}>
        ← Back to repository
      </Link>

      <div className="card-flat" style={{ marginBottom: '24px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>
              #{pr.prId} {pr.title}
            </h1>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <span className={`badge ${pr.status === 'open' ? 'badge-green' : pr.status === 'merged' ? 'badge-purple' : 'badge-red'}`}>
                {pr.status}
              </span>
              <span>{pr.authorName} wants to merge</span>
              <span className="badge badge-blue">{pr.sourceBranchName}</span>
              <span>→</span>
              <span className="badge badge-blue">{pr.targetBranchName}</span>
            </div>
            {pr.description && (
              <p style={{ marginTop: '12px', color: 'var(--text-secondary)', fontSize: '14px' }}>{pr.description}</p>
            )}
          </div>
        </div>

        {pr.status === 'open' && (
          <div style={{ marginTop: '20px', display: 'flex', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <button className="btn btn-success" onClick={handleMerge} disabled={merging}>
              {merging ? '⏳ Merging...' : '🔗 Merge Pull Request'}
            </button>
            <button className="btn btn-danger btn-sm" onClick={handleClose}>Close PR</button>
          </div>
        )}

        {mergeResult && (
          <div style={{
            marginTop: '12px', padding: '12px', borderRadius: '8px',
            background: mergeResult.merged ? 'rgba(63,185,80,0.1)' : 'rgba(248,81,73,0.1)',
            border: `1px solid ${mergeResult.merged ? 'rgba(63,185,80,0.3)' : 'rgba(248,81,73,0.3)'}`,
            color: mergeResult.merged ? 'var(--accent-green)' : 'var(--accent-red)',
            fontSize: '14px',
          }}>
            {mergeResult.merged ? '✅ Successfully merged!' : `❌ ${mergeResult.message || 'Merge conflicts detected'}`}
            {mergeResult.conflicts?.length > 0 && (
              <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                {mergeResult.conflicts.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Diffs */}
      <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>
        Changes ({pr.diffs?.length || 0} files)
      </h2>
      {pr.diffs?.map((diff, i) => (
        <div key={i} className="card-flat" style={{ marginBottom: '16px', padding: 0, overflow: 'hidden' }}>
          <div style={{
            padding: '10px 16px', background: 'var(--bg-tertiary)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' }}>{diff.filePath}</span>
            <span className={`badge ${diff.status === 'added' ? 'badge-green' : diff.status === 'deleted' ? 'badge-red' : 'badge-orange'}`}>
              {diff.status}
            </span>
          </div>
          <div className="diff-container" style={{ border: 'none', borderRadius: 0, maxHeight: '400px', overflow: 'auto' }}>
            {renderDiff(diff.diff)}
          </div>
        </div>
      ))}
    </div>
  );
}
