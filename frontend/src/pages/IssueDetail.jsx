import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';

export default function IssueDetail() {
  const { id } = useParams();
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');

  const loadIssue = useCallback(async () => {
    try { setIssue(await api.getIssue(id)); } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => {
    loadIssue();
  }, [loadIssue]);

  const handleComment = async () => {
    if (!comment.trim()) return;
    try {
      await api.addComment(id, { body: comment });
      setComment('');
      loadIssue();
    } catch (err) { console.error(err); }
  };

  const toggleStatus = async () => {
    try {
      await api.updateIssue(id, { status: issue.status === 'open' ? 'closed' : 'open' });
      loadIssue();
    } catch (err) { console.error(err); }
  };

  if (loading) return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px' }}>
      <div className="skeleton" style={{ height: '200px' }} />
    </div>
  );

  if (!issue) return <div className="empty-state"><h2>Issue not found</h2></div>;

  return (
    <div className="fade-in" style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px' }}>
      <Link to={`/repo/${issue.repoId}`} className="btn btn-ghost btn-sm" style={{ marginBottom: '16px' }}>
        ← Back to repository
      </Link>

      <div className="card-flat" style={{ marginBottom: '24px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>
              #{issue.issueId} {issue.title}
            </h1>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <span className={`badge ${issue.status === 'open' ? 'badge-green' : 'badge-red'}`}>
                {issue.status}
              </span>
              <span>opened by {issue.createdByName} on {new Date(issue.createdAt).toLocaleDateString()}</span>
              {issue.assigneeName && <span>· assigned to {issue.assigneeName}</span>}
            </div>
          </div>
          <button className={`btn btn-sm ${issue.status === 'open' ? 'btn-danger' : 'btn-success'}`} onClick={toggleStatus}>
            {issue.status === 'open' ? '🔒 Close' : '🔓 Reopen'}
          </button>
        </div>
        {issue.description && (
          <div style={{ marginTop: '16px', padding: '16px', background: 'var(--bg-primary)', borderRadius: '8px',
            fontSize: '14px', lineHeight: '1.7', color: 'var(--text-secondary)' }}>
            {issue.description}
          </div>
        )}
      </div>

      {/* Comments */}
      <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>
        Comments ({issue.comments?.length || 0})
      </h2>

      {issue.comments?.map(c => (
        <div key={c.commentId} className="card-flat" style={{ marginBottom: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontWeight: 600, fontSize: '13px' }}>{c.username}</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {new Date(c.createdAt).toLocaleString()}
            </span>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>{c.body}</p>
        </div>
      ))}

      {/* Add comment */}
      <div className="card-flat" style={{ marginTop: '16px', padding: '20px' }}>
        <textarea className="input-field" placeholder="Leave a comment..." value={comment}
          onChange={(e) => setComment(e.target.value)}
          style={{ marginBottom: '12px', minHeight: '100px' }} />
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-success btn-sm" onClick={handleComment} disabled={!comment.trim()}>
            💬 Comment
          </button>
        </div>
      </div>
    </div>
  );
}
