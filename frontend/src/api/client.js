const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('codevault_token');
}

async function request(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${path}`, options);
  const data = await res.json();
  
  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

export const api = {
  // Auth
  register: (data) => request('POST', '/register', data),
  login: (data) => request('POST', '/login', data),
  getMe: () => request('GET', '/user/me'),
  updateProfile: (data) => request('PUT', '/user/me', data),
  getUser: (id) => request('GET', `/user/${id}`),

  // Repos
  createRepo: (data) => request('POST', '/repos', data),
  listRepos: () => request('GET', '/repos'),
  exploreRepos: () => request('GET', '/repos/explore'),
  getRepo: (id) => request('GET', `/repos/${id}`),
  updateRepo: (id, data) => request('PUT', `/repos/${id}`, data),
  deleteRepo: (id) => request('DELETE', `/repos/${id}`),
  toggleStar: (id) => request('POST', `/repos/${id}/star`),

  // Branches
  createBranch: (repoId, data) => request('POST', `/repos/${repoId}/branches`, data),
  listBranches: (repoId) => request('GET', `/repos/${repoId}/branches`),
  deleteBranch: (repoId, bid) => request('DELETE', `/repos/${repoId}/branches/${bid}`),

  // Commits
  createCommit: (repoId, data) => request('POST', `/repos/${repoId}/commits`, data),
  listCommits: (repoId, branchId) => request('GET', `/repos/${repoId}/commits${branchId ? `?branchId=${branchId}` : ''}`),
  getCommit: (id) => request('GET', `/commits/${id}`),
  getFiles: (repoId, branchId) => request('GET', `/repos/${repoId}/files${branchId ? `?branchId=${branchId}` : ''}`),

  // Pull Requests
  createPR: (repoId, data) => request('POST', `/repos/${repoId}/pullrequests`, data),
  listPRs: (repoId, status) => request('GET', `/repos/${repoId}/pullrequests?status=${status || 'open'}`),
  getPR: (id) => request('GET', `/pullrequests/${id}`),
  mergePR: (id) => request('POST', `/pullrequests/${id}/merge`),
  closePR: (id) => request('POST', `/pullrequests/${id}/close`),

  // Issues
  createIssue: (repoId, data) => request('POST', `/repos/${repoId}/issues`, data),
  listIssues: (repoId, status) => request('GET', `/repos/${repoId}/issues?status=${status || 'open'}`),
  getIssue: (id) => request('GET', `/issues/${id}`),
  updateIssue: (id, data) => request('PUT', `/issues/${id}`, data),
  addComment: (issueId, data) => request('POST', `/issues/${issueId}/comments`, data),

  // Collaborators
  addCollaborator: (repoId, data) => request('POST', `/repos/${repoId}/collaborators`, data),
  listCollaborators: (repoId) => request('GET', `/repos/${repoId}/collaborators`),
  removeCollaborator: (repoId, uid) => request('DELETE', `/repos/${repoId}/collaborators/${uid}`),

  // Fork
  forkRepo: (repoId) => request('POST', `/repos/${repoId}/fork`),

  // Activity & Search
  getActivity: (repoId) => request('GET', `/repos/${repoId}/activity`),
  search: (q) => request('GET', `/search?q=${encodeURIComponent(q)}`),
};
