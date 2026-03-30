const { getToken, getServerUrl } = require('./config');

async function request(method, path, body = null) {
    // Dynamic import for node-fetch (CommonJS compat)
    let fetch;
    try {
        fetch = globalThis.fetch || (await import('node-fetch')).default;
    } catch {
        fetch = require('node-fetch');
    }

    const baseUrl = getServerUrl();
    const headers = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(`${baseUrl}/api${path}`, options);

    let data;
    try {
        data = await res.json();
    } catch {
        data = {};
    }

    if (!res.ok) {
        throw new Error(data.error || `Request failed with status ${res.status}`);
    }
    return data;
}

const api = {
    // Auth
    register: (data) => request('POST', '/register', data),
    login: (data) => request('POST', '/login', data),
    getMe: () => request('GET', '/user/me'),

    // Repos
    createRepo: (data) => request('POST', '/repos', data),
    listRepos: () => request('GET', '/repos'),
    getRepo: (id) => request('GET', `/repos/${id}`),
    deleteRepo: (id) => request('DELETE', `/repos/${id}`),

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
    listPRs: (repoId) => request('GET', `/repos/${repoId}/pullrequests`),
    getPR: (id) => request('GET', `/pullrequests/${id}`),
    mergePR: (id) => request('POST', `/pullrequests/${id}/merge`),
    closePR: (id) => request('POST', `/pullrequests/${id}/close`),

    // Issues
    createIssue: (repoId, data) => request('POST', `/repos/${repoId}/issues`, data),
    listIssues: (repoId) => request('GET', `/repos/${repoId}/issues`),

    // Collab & Fork
    forkRepo: (repoId) => request('POST', `/repos/${repoId}/fork`),
    toggleStar: (repoId) => request('POST', `/repos/${repoId}/star`),
};

module.exports = { api };
