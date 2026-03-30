const express = require('express');
const router = express.Router();
const { register, login, getMe, getUser, updateProfile } = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/user/me', authMiddleware, getMe);
router.get('/user/:id', authMiddleware, getUser);
router.put('/user/me', authMiddleware, updateProfile);

module.exports = router;
