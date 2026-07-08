export function normalizeApiBase(value = '/api') {
  const normalized = (value || '/api').trim().replace(/\/+$/, '');
  return normalized || '/api';
}

const API_BASE = normalizeApiBase(import.meta.env?.VITE_API_BASE_URL);
const DEFAULT_TIMEOUT_MS = 8000;
const RETRY_DELAY_MS = 350;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getToken() {
  return localStorage.getItem('codevault_token');
}

function isRetriableStatus(status) {
  return status === 408 || status === 429 || status >= 500;
}

function isRetriableError(error) {
  return error?.name === 'AbortError' || error instanceof TypeError;
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function request(method, path, body = null, config = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = config.retries ?? (method === 'GET' ? 1 : 0);
  const url = `${API_BASE}${path}`;
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const res = await fetchWithTimeout(url, options, timeoutMs);
      const contentType = res.headers.get('content-type') || '';
      const data = contentType.includes('application/json') ? await res.json() : null;

      if (!res.ok) {
        if (attempt < retries && isRetriableStatus(res.status)) {
          await delay(RETRY_DELAY_MS);
          continue;
        }
        throw new Error(data?.error || `Request failed (${res.status})`);
      }
      return data;
    } catch (error) {
      lastError = error;
      if (attempt < retries && isRetriableError(error)) {
        await delay(RETRY_DELAY_MS);
        continue;
      }

      if (error?.name === 'AbortError') {
        throw new Error('Request timed out. Please try again.');
      }
      throw error;
    }
  }

  throw lastError;
}

async function healthCheck() {
  const res = await fetchWithTimeout(`${API_BASE}/health`, { method: 'GET' }, 4000);
  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : null;

  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  health: healthCheck,

  // Auth
  register: (data) => request('POST', '/register', data),
  login: (data) => request('POST', '/login', data),
  getMe: () => request('GET', '/user/me', null, { timeoutMs: 5000, retries: 0 }),
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
