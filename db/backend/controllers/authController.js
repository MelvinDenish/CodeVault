const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getConnection } = require('../config/db');
const { jwtSecret, jwtExpiresIn, bcryptSaltRounds } = require('../config/auth');

// POST /api/register
async function register(req, res) {
  const { username, email, password } = req.body;
  
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }

  const conn = await getConnection();
  try {
    // Check existing
    const existing = await conn.execute(
      `SELECT COUNT(*) AS cnt FROM users WHERE username = :u OR email = :e`,
      { u: username, e: email }
    );
    if (existing.rows[0][0] > 0) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    const hash = await bcrypt.hash(password, bcryptSaltRounds);
    const result = await conn.execute(
      `INSERT INTO users (username, email, password_hash) VALUES (:u, :e, :h)
       RETURNING user_id INTO :id`,
      { 
        u: username, 
        e: email, 
        h: hash,
        id: { dir: require('oracledb').BIND_OUT, type: require('oracledb').NUMBER }
      }
    );
    await conn.commit();

    const userId = result.outBinds.id[0];
    const token = jwt.sign({ id: userId, username }, jwtSecret, { expiresIn: jwtExpiresIn });

    res.status(201).json({ userId, username, token });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    await conn.close();
  }
}

// POST /api/login
async function login(req, res) {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT user_id, username, email, password_hash FROM users WHERE email = :e`,
      { e: email }
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const [userId, username, userEmail, hash] = result.rows[0];
    const valid = await bcrypt.compare(password, hash);
    
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: userId, username }, jwtSecret, { expiresIn: jwtExpiresIn });
    res.json({ userId, username, email: userEmail, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await conn.close();
  }
}

// GET /api/user/me
async function getMe(req, res) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT user_id, username, email, avatar_url, bio, 
              TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS') as created_at
       FROM users WHERE user_id = :id`,
      { id: req.user.id }
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const [userId, username, email, avatar, bio, createdAt] = result.rows[0];
    res.json({ userId, username, email, avatarUrl: avatar, bio, createdAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await conn.close();
  }
}

// GET /api/user/:id
async function getUser(req, res) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT user_id, username, email, avatar_url, bio, 
              TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS') as created_at
       FROM users WHERE user_id = :id`,
      { id: parseInt(req.params.id) }
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const [userId, username, email, avatar, bio, createdAt] = result.rows[0];
    res.json({ userId, username, email, avatarUrl: avatar, bio, createdAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await conn.close();
  }
}

// PUT /api/user/me
async function updateProfile(req, res) {
  const { bio, avatarUrl } = req.body;
  const conn = await getConnection();
  try {
    await conn.execute(
      `UPDATE users SET bio = :bio, avatar_url = :avatar WHERE user_id = :id`,
      { bio: bio || null, avatar: avatarUrl || null, id: req.user.id }
    );
    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    await conn.close();
  }
}

module.exports = { register, login, getMe, getUser, updateProfile };
