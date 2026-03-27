import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function RepoView() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [repo, setRepo] = useState(null);
  const [branches, setBranches] = useState([]);
  const [commits, setCommits] = useState([]);
  const [files, setFiles] = useState([]);
  const [issues, setIssues] = useState([]);
  const [prs, setPrs] = useState([]);
  const [activity, setActivity] = useState([]);
  const [currentBranch, setCurrentBranch] = useState(null);
  const [activeTab, setActiveTab] = useState('code');
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const [showNewBranch, setShowNewBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [showCommitForm, setShowCommitForm] = useState(false);
  const [commitMsg, setCommitMsg] = useState('');
  const [commitFiles, setCommitFiles] = useState([{ path: '', content: '' }]);
  const [showNewIssue, setShowNewIssue] = useState(false);
  const [newIssueTitle, setNewIssueTitle] = useState('');
  const [newIssueDesc, setNewIssueDesc] = useState('');
  const [showNewPR, setShowNewPR] = useState(false);
  const [prTitle, setPrTitle] = useState('');
  const [prDesc, setPrDesc] = useState('');
  const [prSource, setPrSource] = useState('');
  const [prTarget, setPrTarget] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => { loadRepo(); }, [id]);

  async function loadRepo() {
    setLoading(true);
    try {
      const [repoData, branchData] = await Promise.all([
        api.getRepo(id),
        api.listBranches(id)
      ]);
      setRepo(repoData);
      setBranches(branchData);
      const defaultBr = branchData.find(b => b.isDefault) || branchData[0];
      if (defaultBr) {
        setCurrentBranch(defaultBr);
        loadBranchData(defaultBr.branchId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadBranchData(branchId) {
    try {
      const [commitData, fileData] = await Promise.all([
        api.listCommits(id, branchId),
        api.getFiles(id, branchId)
      ]);
      setCommits(commitData);
      setFiles(fileData.files || []);
    } catch (err) { console.error(err); }
  }

  async function loadIssues() {
    try { setIssues(await api.listIssues(id)); } catch(e) { console.error(e); }
  }

  async function loadPRs() {
    try { setPrs(await api.listPRs(id)); } catch(e) { console.error(e); }
  }

  async function loadActivity() {
    try { setActivity(await api.getActivity(id)); } catch(e) { console.error(e); }
  }

  useEffect(() => {
    if (activeTab === 'issues') loadIssues();
    if (activeTab === 'prs') loadPRs();
    if (activeTab === 'activity') loadActivity();
  }, [activeTab]);

  async function handleCreateBranch() {
    if (!newBranchName.trim()) return;
    try {
      await api.createBranch(id, { branchName: newBranchName, sourceBranchId: currentBranch?.branchId });
      const br = await api.listBranches(id);
      setBranches(br);
      setNewBranchName('');
      setShowNewBranch(false);
      showToast(`Branch "${newBranchName}" created`);
    } catch (err) { showToast(err.message, 'error'); }
  }

  async function handleCommit() {
    if (!commitMsg.trim() || !commitFiles.some(f => f.path && f.content)) return;
    try {
      const validFiles = commitFiles.filter(f => f.path && f.content);
      await api.createCommit(id, {
        branchId: currentBranch.branchId,
        message: commitMsg,
        files: validFiles
      });
      setCommitMsg('');
      setCommitFiles([{ path: '', content: '' }]);
      setShowCommitForm(false);
      loadBranchData(currentBranch.branchId);
      showToast('Commit created successfully');
    } catch (err) { showToast(err.message, 'error'); }
  }

  async function handleCreateIssue() {
    if (!newIssueTitle.trim()) return;
    try {
      await api.createIssue(id, { title: newIssueTitle, description: newIssueDesc });
      setNewIssueTitle(''); setNewIssueDesc(''); setShowNewIssue(false);
      loadIssues();
      showToast('Issue created');
    } catch (err) { showToast(err.message, 'error'); }
  }

  async function handleCreatePR() {
    if (!prTitle.trim() || !prSource || !prTarget) return;
    try {
      await api.createPR(id, { title: prTitle, description: prDesc, sourceBranchId: parseInt(prSource), targetBranchId: parseInt(prTarget) });
      setPrTitle(''); setPrDesc(''); setShowNewPR(false);
      loadPRs();
      showToast('Pull request created');
    } catch (err) { showToast(err.message, 'error'); }
  }

  async function handleFork() {
    try {
      const result = await api.forkRepo(id);
      showToast('Repository forked!');
      navigate(`/repo/${result.forkedRepoId}`);
    } catch (err) { showToast(err.message, 'error'); }
  }

  async function handleDeleteBranch(bid) {
    try {
      await api.deleteBranch(id, bid);
      const br = await api.listBranches(id);
      setBranches(br);
      showToast('Branch deleted');
    } catch (err) { showToast(err.message, 'error'); }
  }

  if (loading) return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
      <div className="skeleton" style={{ height: '40px', width: '300px', marginBottom: '20px' }} />
      <div className="skeleton" style={{ height: '200px' }} />
    </div>
  );

  if (!repo) return <div className="empty-state"><h2>Repository not found</h2></div>;

  const isOwner = user?.userId === repo.ownerId;

  const tabs = [
    { id: 'code', label: '📄 Code', count: files.length },
    { id: 'commits', label: '💾 Commits', count: commits.length },
    { id: 'branches', label: '🌿 Branches', count: branches.length },
    { id: 'prs', label: '🔀 Pull Requests', count: repo.openPrs },
    { id: 'issues', label: '🐛 Issues', count: repo.openIssues },
    { id: 'activity', label: '📊 Activity' },
  ];

  return (
    <div className="fade-in" style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <span style={{ fontSize: '20px' }}>📦</span>
            <h1 style={{ fontSize: '24px', fontWeight: 700 }}>
              <span style={{ color: 'var(--accent-blue)' }}>{repo.ownerName}</span>
              <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>/</span>
              <span>{repo.name}</span>
            </h1>
            <span className={`badge ${repo.visibility === 'public' ? 'badge-green' : 'badge-orange'}`}>
              {repo.visibility}
            </span>
          </div>
          {repo.description && <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginLeft: '32px' }}>{repo.description}</p>}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-outline btn-sm" onClick={() => api.toggleStar(id).then(() => loadRepo())}>
            ⭐ Star ({repo.starCount})
          </button>
          {!isOwner && <button className="btn btn-outline btn-sm" onClick={handleFork}>🍴 Fork</button>}
          {isOwner && <button className="btn btn-outline btn-sm" onClick={() => navigate(`/repo/${id}/settings`)}>⚙️ Settings</button>}
        </div>
      </div>

      {/* Branch selector */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ position: 'relative' }}>
          <button className="btn btn-outline btn-sm" onClick={() => setShowBranchMenu(!showBranchMenu)}>
            🌿 {currentBranch?.branchName || 'main'} ▾
          </button>
          {showBranchMenu && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setShowBranchMenu(false)} />
              <div className="dropdown-menu" style={{ zIndex: 50, maxHeight: '300px', overflow: 'auto' }}>
                {branches.map(br => (
                  <button key={br.branchId} className="dropdown-item"
                    style={{ fontWeight: br.branchId === currentBranch?.branchId ? 700 : 400 }}
                    onClick={() => {
                      setCurrentBranch(br);
                      loadBranchData(br.branchId);
                      setShowBranchMenu(false);
                    }}>
                    {br.branchName} {br.isDefault && '(default)'}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowNewBranch(!showNewBranch)}>＋ New Branch</button>
        <button className="btn btn-primary btn-sm" onClick={() => setShowCommitForm(!showCommitForm)}>💾 New Commit</button>
      </div>

      {/* New branch form */}
      {showNewBranch && (
        <div className="card-flat fade-in" style={{ marginBottom: '16px', padding: '16px', display: 'flex', gap: '8px' }}>
          <input className="input-field" placeholder="Branch name" value={newBranchName}
            onChange={(e) => setNewBranchName(e.target.value)} style={{ flex: 1 }} />
          <button className="btn btn-success btn-sm" onClick={handleCreateBranch}>Create</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowNewBranch(false)}>Cancel</button>
        </div>
      )}

      {/* Commit form */}
      {showCommitForm && (
        <div className="card-flat fade-in" style={{ marginBottom: '16px', padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>Create a new commit</h3>
          <input className="input-field" placeholder="Commit message" value={commitMsg}
            onChange={(e) => setCommitMsg(e.target.value)} style={{ marginBottom: '12px' }} />
          {commitFiles.map((f, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input className="input-field" placeholder="File path (e.g. src/index.js)" value={f.path}
                onChange={(e) => { const nf = [...commitFiles]; nf[i].path = e.target.value; setCommitFiles(nf); }}
                style={{ width: '240px' }} />
              <textarea className="input-field" placeholder="File content..." value={f.content}
                onChange={(e) => { const nf = [...commitFiles]; nf[i].content = e.target.value; setCommitFiles(nf); }}
                style={{ flex: 1, minHeight: '60px', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' }} />
              {commitFiles.length > 1 && (
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--accent-red)' }}
                  onClick={() => setCommitFiles(commitFiles.filter((_, j) => j !== i))}>✕</button>
              )}
            </div>
          ))}
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setCommitFiles([...commitFiles, { path: '', content: '' }])}>
              ＋ Add file
            </button>
            <div style={{ flex: 1 }} />
            <button className="btn btn-ghost btn-sm" onClick={() => setShowCommitForm(false)}>Cancel</button>
            <button className="btn btn-success btn-sm" onClick={handleCommit}>Commit changes</button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tab-nav">
        {tabs.map(tab => (
          <button key={tab.id} className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}>
            {tab.label}
            {tab.count !== undefined && (
              <span style={{
                background: 'var(--bg-card)', borderRadius: '10px', padding: '1px 8px',
                fontSize: '12px', marginLeft: '6px', color: 'var(--text-muted)'
              }}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'code' && (
        <div className="fade-in">
          {files.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                No files yet
              </h3>
              <p>Create your first commit to add files to this repository</p>
            </div>
          ) : selectedFile ? (
            <div>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedFile(null)}
                style={{ marginBottom: '12px' }}>← Back to files</button>
              <div className="card-flat" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' }}>{selectedFile.filePath}</span>
                  <span className="badge badge-blue">{Math.round((selectedFile.fileSize || 0) / 1024 * 100) / 100} KB</span>
                </div>
                <pre style={{
                  padding: '16px', margin: 0, fontSize: '13px', lineHeight: '1.6',
                  fontFamily: "'JetBrains Mono', monospace", overflow: 'auto',
                  background: 'var(--bg-primary)', color: 'var(--text-primary)', whiteSpace: 'pre-wrap'
                }}>
                  {selectedFile.content?.split('\n').map((line, i) => (
                    <div key={i} style={{ display: 'flex' }}>
                      <span style={{ width: '45px', textAlign: 'right', paddingRight: '16px',
                        color: 'var(--text-muted)', userSelect: 'none', flexShrink: 0 }}>{i + 1}</span>
                      <span>{line}</span>
                    </div>
                  ))}
                </pre>
              </div>
            </div>
          ) : (
            <div className="card-flat" style={{ padding: 0, overflow: 'hidden' }}>
              {files.map((file, i) => (
                <div key={file.fileId}
                  onClick={() => setSelectedFile(file)}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 16px', cursor: 'pointer',
                    borderBottom: i < files.length - 1 ? '1px solid var(--border-color)' : 'none',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(88,166,255,0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '14px' }}>📄</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: 'var(--accent-blue)' }}>
                      {file.filePath}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <span>{file.lastCommitMsg}</span>
                    <span>{file.lastModified}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'commits' && (
        <div className="fade-in" style={{ display: 'grid', gap: '8px' }}>
          {commits.length === 0 ? (
            <div className="empty-state"><div style={{ fontSize: '48px' }}>💾</div><p>No commits yet</p></div>
          ) : commits.map(c => (
            <Link key={c.commitId} to={`/commit/${c.commitId}`} className="card" style={{ textDecoration: 'none', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>{c.message}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {c.authorName} committed on {new Date(c.commitTime).toLocaleString()}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span className="badge badge-blue" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {c.commitHash}
                  </span>
                  <span className="badge badge-purple">{c.fileCount} files</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {activeTab === 'branches' && (
        <div className="fade-in" style={{ display: 'grid', gap: '8px' }}>
          {branches.map(br => (
            <div key={br.branchId} className="card-flat" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '16px' }}>🌿</span>
                <span style={{ fontWeight: 600 }}>{br.branchName}</span>
                {br.isDefault && <span className="badge badge-green">default</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {br.headCommitHash && (
                  <span className="badge badge-blue" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>
                    {br.headCommitHash}
                  </span>
                )}
                {br.headMessage && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{br.headMessage}</span>}
                {!br.isDefault && isOwner && (
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--accent-red)' }}
                    onClick={() => handleDeleteBranch(br.branchId)}>🗑️</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'prs' && (
        <div className="fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Pull Requests</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowNewPR(true)}>＋ New Pull Request</button>
          </div>
          {showNewPR && (
            <div className="card-flat fade-in" style={{ marginBottom: '16px', padding: '20px' }}>
              <input className="input-field" placeholder="PR Title" value={prTitle}
                onChange={(e) => setPrTitle(e.target.value)} style={{ marginBottom: '8px' }} />
              <textarea className="input-field" placeholder="Description (optional)" value={prDesc}
                onChange={(e) => setPrDesc(e.target.value)} style={{ marginBottom: '8px' }} />
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <select className="input-field" value={prSource} onChange={(e) => setPrSource(e.target.value)}>
                  <option value="">Source branch</option>
                  {branches.map(b => <option key={b.branchId} value={b.branchId}>{b.branchName}</option>)}
                </select>
                <span style={{ alignSelf: 'center', color: 'var(--text-muted)' }}>→</span>
                <select className="input-field" value={prTarget} onChange={(e) => setPrTarget(e.target.value)}>
                  <option value="">Target branch</option>
                  {branches.map(b => <option key={b.branchId} value={b.branchId}>{b.branchName}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowNewPR(false)}>Cancel</button>
                <button className="btn btn-success btn-sm" onClick={handleCreatePR}>Create PR</button>
              </div>
            </div>
          )}
          {prs.length === 0 ? (
            <div className="empty-state"><div style={{ fontSize: '48px' }}>🔀</div><p>No open pull requests</p></div>
          ) : prs.map(pr => (
            <Link key={pr.prId} to={`/pr/${pr.prId}`} className="card" style={{ textDecoration: 'none', marginBottom: '8px', display: 'block' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>#{pr.prId} {pr.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {pr.authorName} wants to merge {pr.sourceBranchName} → {pr.targetBranchName}
                  </div>
                </div>
                <span className={`badge ${pr.status === 'open' ? 'badge-green' : pr.status === 'merged' ? 'badge-purple' : 'badge-red'}`}>
                  {pr.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {activeTab === 'issues' && (
        <div className="fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Issues</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowNewIssue(true)}>＋ New Issue</button>
          </div>
          {showNewIssue && (
            <div className="card-flat fade-in" style={{ marginBottom: '16px', padding: '20px' }}>
              <input className="input-field" placeholder="Issue title" value={newIssueTitle}
                onChange={(e) => setNewIssueTitle(e.target.value)} style={{ marginBottom: '8px' }} />
              <textarea className="input-field" placeholder="Describe the issue..." value={newIssueDesc}
                onChange={(e) => setNewIssueDesc(e.target.value)} style={{ marginBottom: '12px' }} />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowNewIssue(false)}>Cancel</button>
                <button className="btn btn-success btn-sm" onClick={handleCreateIssue}>Submit</button>
              </div>
            </div>
          )}
          {issues.length === 0 ? (
            <div className="empty-state"><div style={{ fontSize: '48px' }}>🐛</div><p>No open issues</p></div>
          ) : issues.map(issue => (
            <Link key={issue.issueId} to={`/issue/${issue.issueId}`} className="card"
              style={{ textDecoration: 'none', marginBottom: '8px', display: 'block' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>#{issue.issueId} {issue.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    opened by {issue.createdByName} · {issue.commentCount} comments
                  </div>
                </div>
                <span className={`badge ${issue.status === 'open' ? 'badge-green' : 'badge-red'}`}>{issue.status}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="fade-in" style={{ display: 'grid', gap: '8px' }}>
          {activity.length === 0 ? (
            <div className="empty-state"><div style={{ fontSize: '48px' }}>📊</div><p>No activity yet</p></div>
          ) : activity.map(a => (
            <div key={a.logId} className="card-flat" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '16px' }}>
                {a.action === 'commit' ? '💾' : a.action === 'pull_request' ? '🔀' : a.action === 'merge' ? '🔗' : a.action === 'fork' ? '🍴' : '📌'}
              </span>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 500 }}>{a.username}</span>
                <span style={{ color: 'var(--text-secondary)', marginLeft: '8px' }}>{a.details}</span>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {new Date(a.actionTime).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Toast */}
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
