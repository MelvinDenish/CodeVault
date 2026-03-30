const express = require('express');
const router = express.Router();
const { getCommit } = require('../controllers/commitController');
const { getPR, mergePR, closePR } = require('../controllers/prController');
const { getIssue, updateIssue, addComment } = require('../controllers/issueController');
const { search } = require('../controllers/collabController');
const { authMiddleware } = require('../middleware/auth');

// Direct commit access
router.get('/commits/:id', authMiddleware, getCommit);

// Pull Request actions
router.get('/pullrequests/:id', authMiddleware, getPR);
router.post('/pullrequests/:id/merge', authMiddleware, mergePR);
router.post('/pullrequests/:id/close', authMiddleware, closePR);

// Issue actions
router.get('/issues/:id', authMiddleware, getIssue);
router.put('/issues/:id', authMiddleware, updateIssue);
router.post('/issues/:id/comments', authMiddleware, addComment);

// Search
router.get('/search', authMiddleware, search);

module.exports = router;
