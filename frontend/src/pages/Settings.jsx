import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [repo, setRepo] = useState(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [visibility, setVisibility] = useState('public');
    const [collaborators, setCollaborators] = useState([]);
    const [newCollab, setNewCollab] = useState('');
    const [newCollabRole, setNewCollabRole] = useState('viewer');
    const [toast, setToast] = useState(null);
    const [loading, setLoading] = useState(true);
    const [confirmDelete, setConfirmDelete] = useState('');

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        loadData();
    }, [id]);

    async function loadData() {
        try {
            const [repoData, collabData] = await Promise.all([
                api.getRepo(id),
                api.listCollaborators(id)
            ]);
            setRepo(repoData);
            setName(repoData.name);
            setDescription(repoData.description || '');
            setVisibility(repoData.visibility);
            setCollaborators(collabData);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        try {
            await api.updateRepo(id, { name, description, visibility });
            showToast('Settings saved');
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    async function handleAddCollab() {
        if (!newCollab.trim()) return;
        try {
            await api.addCollaborator(id, { username: newCollab, role: newCollabRole });
            setNewCollab('');
            const collabData = await api.listCollaborators(id);
            setCollaborators(collabData);
            showToast(`Added ${newCollab} as ${newCollabRole}`);
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    async function handleRemoveCollab(uid) {
        try {
            await api.removeCollaborator(id, uid);
            const collabData = await api.listCollaborators(id);
            setCollaborators(collabData);
            showToast('Collaborator removed');
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    async function handleDelete() {
        if (confirmDelete !== repo?.name) return;
        try {
            await api.deleteRepo(id);
            showToast('Repository deleted');
            navigate('/dashboard');
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    if (loading) return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 24px' }}>
            <div className="skeleton" style={{ height: '40px', width: '300px', marginBottom: '20px' }} />
            <div className="skeleton" style={{ height: '200px' }} />
        </div>
    );

    if (!repo) return <div className="empty-state"><h2>Repository not found</h2></div>;

    return (
        <div className="fade-in" style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/repo/${id}`)}>← Back</button>
                <h1 style={{ fontSize: '24px', fontWeight: 700 }}>⚙️ Repository Settings</h1>
            </div>

            {/* General */}
            <div className="card-flat" style={{ padding: '24px', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>General</h2>

                <div style={{ marginBottom: '16px' }}>
                    <label className="label">Repository name</label>
                    <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} />
                </div>

                <div style={{ marginBottom: '16px' }}>
                    <label className="label">Description</label>
                    <textarea className="input-field" value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Short description of this repository" rows={3} />
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label className="label">Visibility</label>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        {['public', 'private'].map(v => (
                            <button key={v} className={`btn ${visibility === v ? 'btn-primary' : 'btn-outline'} btn-sm`}
                                onClick={() => setVisibility(v)}>
                                {v === 'public' ? '🌍' : '🔒'} {v.charAt(0).toUpperCase() + v.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                <button className="btn btn-primary" onClick={handleSave}>💾 Save changes</button>
            </div>

            {/* Collaborators */}
            <div className="card-flat" style={{ padding: '24px', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>Collaborators</h2>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    <input className="input-field" placeholder="Username" value={newCollab}
                        onChange={(e) => setNewCollab(e.target.value)} style={{ flex: 1 }} />
                    <select className="input-field" value={newCollabRole}
                        onChange={(e) => setNewCollabRole(e.target.value)} style={{ width: '140px' }}>
                        <option value="viewer">Viewer</option>
                        <option value="editor">Editor</option>
                        <option value="admin">Admin</option>
                    </select>
                    <button className="btn btn-success btn-sm" onClick={handleAddCollab}>Add</button>
                </div>

                {collaborators.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No collaborators added yet</p>
                ) : (
                    <div style={{ display: 'grid', gap: '8px' }}>
                        {collaborators.map(c => (
                            <div key={c.userId} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '10px 14px', background: 'var(--bg-primary)', borderRadius: '8px',
                                border: '1px solid var(--border-color)',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{
                                        width: '32px', height: '32px', borderRadius: '50%',
                                        background: 'var(--gradient-teal)', display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: 'white',
                                    }}>{c.username?.[0]?.toUpperCase()}</div>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '14px' }}>{c.username}</div>
                                        <span className="badge badge-green" style={{ fontSize: '11px' }}>{c.role}</span>
                                    </div>
                                </div>
                                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--accent-red)' }}
                                    onClick={() => handleRemoveCollab(c.userId)}>Remove</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Danger Zone */}
            <div className="card-flat" style={{ padding: '24px', border: '1px solid rgba(239,68,68,0.3)' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: 'var(--accent-red)' }}>
                    🚨 Danger Zone
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>
                    Deleting a repository is <strong>permanent</strong>. All branches, commits, issues, and pull requests will be permanently deleted.
                </p>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                        <label className="label">Type "{repo?.name}" to confirm</label>
                        <input className="input-field" value={confirmDelete}
                            onChange={(e) => setConfirmDelete(e.target.value)}
                            placeholder={repo?.name} />
                    </div>
                    <button className="btn btn-danger" onClick={handleDelete}
                        disabled={confirmDelete !== repo?.name}>
                        🗑️ Delete Repository
                    </button>
                </div>
            </div>

            {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
        </div>
    );
}
