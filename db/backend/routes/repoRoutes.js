const express = require('express');
const router = express.Router();
const { createRepo, listRepos, exploreRepos, getRepo, updateRepo, deleteRepo, toggleStar } = require('../controllers/repoController');
const { createBranch, listBranches, deleteBranch } = require('../controllers/branchController');
const { createCommit, listCommits, getFiles } = require('../controllers/commitController');
const { createPR, listPRs } = require('../controllers/prController');
const { createIssue, listIssues } = require('../controllers/issueController');
const { addCollaborator, listCollaborators, removeCollaborator, forkRepo, getActivity } = require('../controllers/collabController');
const { authMiddleware } = require('../middleware/auth');

// Repository CRUD
router.post('/', authMiddleware, createRepo);
router.get('/', authMiddleware, listRepos);
router.get('/explore', exploreRepos);
router.get('/:id', authMiddleware, getRepo);
router.put('/:id', authMiddleware, updateRepo);
router.delete('/:id', authMiddleware, deleteRepo);
router.post('/:id/star', authMiddleware, toggleStar);

// Branches
router.post('/:id/branches', authMiddleware, createBranch);
router.get('/:id/branches', authMiddleware, listBranches);
router.delete('/:id/branches/:bid', authMiddleware, deleteBranch);

// Commits & Files
router.post('/:id/commits', authMiddleware, createCommit);
router.get('/:id/commits', authMiddleware, listCommits);
router.get('/:id/files', authMiddleware, getFiles);

// Pull Requests
router.post('/:id/pullrequests', authMiddleware, createPR);
router.get('/:id/pullrequests', authMiddleware, listPRs);

// Issues
router.post('/:id/issues', authMiddleware, createIssue);
router.get('/:id/issues', authMiddleware, listIssues);

// Collaborators
router.post('/:id/collaborators', authMiddleware, addCollaborator);
router.get('/:id/collaborators', authMiddleware, listCollaborators);
router.delete('/:id/collaborators/:uid', authMiddleware, removeCollaborator);

// Forking
router.post('/:id/fork', authMiddleware, forkRepo);

// Activity
router.get('/:id/activity', authMiddleware, getActivity);

module.exports = router;
