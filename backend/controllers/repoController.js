const oracledb = require('oracledb');
const { getConnection } = require('../config/db');

// POST /api/repos
async function createRepo(req, res) {
  const { name, description, visibility } = req.body;
  const userId = req.user.id;

  if (!name) {
    return res.status(400).json({ error: 'Repository name is required' });
  }

  const conn = await getConnection();
  try {
    // Check name uniqueness for owner
    const existing = await conn.execute(
      `SELECT COUNT(*) FROM repositories WHERE repo_name = :n AND owner_id = :o`,
      { n: name, o: userId }
    );
    if (existing.rows[0][0] > 0) {
      return res.status(409).json({ error: 'You already have a repository with this name' });
    }

    const result = await conn.execute(
      `INSERT INTO repositories (repo_name, description, owner_id, visibility)
       VALUES (:n, :d, :o, :v)
       RETURNING repo_id INTO :id`,
      {
        n: name,
        d: description || null,
        o: userId,
        v: visibility || 'public',
        id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      }
    );
    await conn.commit();

    const repoId = result.outBinds.id[0];

    // Fetch the auto-created main branch
    const branchResult = await conn.execute(
      `SELECT branch_id, branch_name FROM branches WHERE repo_id = :rid`,
      { rid: repoId }
    );

    res.status(201).json({
      repoId,
      name,
      description: description || null,
      visibility: visibility || 'public',
      defaultBranch: 'main',
      branches: branchResult.rows.map(r => ({ branchId: r[0], name: r[1] }))
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    await conn.close();
  }
}

// GET /api/repos
async function listRepos(req, res) {
  const userId = req.user.id;
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT r.repo_id, r.repo_name, r.description, r.visibility, r.default_branch,
              TO_CHAR(r.created_at, 'YYYY-MM-DD"T"HH24:MI:SS') as created_at,
              u.username as owner_name,
              (SELECT COUNT(*) FROM commits c WHERE c.repo_id = r.repo_id) as commit_count,
              (SELECT COUNT(*) FROM branches b WHERE b.repo_id = r.repo_id) as branch_count,
              (SELECT COUNT(*) FROM stars s WHERE s.repo_id = r.repo_id) as star_count
       FROM repositories r
       JOIN users u ON r.owner_id = u.user_id
       WHERE r.owner_id = :uid
       ORDER BY r.created_at DESC`,
      { uid: userId }
    );

    const repos = result.rows.map(r => ({
      repoId: r[0], name: r[1], description: r[2], visibility: r[3],
      defaultBranch: r[4], createdAt: r[5], ownerName: r[6],
      commitCount: r[7], branchCount: r[8], starCount: r[9]
    }));

    res.json(repos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await conn.close();
  }
}

// GET /api/repos/explore - public repos
async function exploreRepos(req, res) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT r.repo_id, r.repo_name, r.description, r.visibility, r.default_branch,
              TO_CHAR(r.created_at, 'YYYY-MM-DD"T"HH24:MI:SS') as created_at,
              u.username as owner_name, r.owner_id,
              (SELECT COUNT(*) FROM commits c WHERE c.repo_id = r.repo_id) as commit_count,
              (SELECT COUNT(*) FROM branches b WHERE b.repo_id = r.repo_id) as branch_count,
              (SELECT COUNT(*) FROM stars s WHERE s.repo_id = r.repo_id) as star_count
       FROM repositories r
       JOIN users u ON r.owner_id = u.user_id
       WHERE r.visibility = 'public'
       ORDER BY r.created_at DESC
       FETCH FIRST 50 ROWS ONLY`
    );

    const repos = result.rows.map(r => ({
      repoId: r[0], name: r[1], description: r[2], visibility: r[3],
      defaultBranch: r[4], createdAt: r[5], ownerName: r[6], ownerId: r[7],
      commitCount: r[8], branchCount: r[9], starCount: r[10]
    }));

    res.json(repos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await conn.close();
  }
}

// GET /api/repos/:id
async function getRepo(req, res) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT r.repo_id, r.repo_name, r.description, r.owner_id, r.visibility, 
              r.default_branch,
              TO_CHAR(r.created_at, 'YYYY-MM-DD"T"HH24:MI:SS') as created_at,
              u.username as owner_name,
              (SELECT COUNT(*) FROM commits c WHERE c.repo_id = r.repo_id) as commit_count,
              (SELECT COUNT(*) FROM branches b WHERE b.repo_id = r.repo_id) as branch_count,
              (SELECT COUNT(*) FROM stars s WHERE s.repo_id = r.repo_id) as star_count,
              (SELECT COUNT(*) FROM issues i WHERE i.repo_id = r.repo_id AND i.status = 'open') as open_issues,
              (SELECT COUNT(*) FROM pull_requests p WHERE p.repo_id = r.repo_id AND p.status = 'open') as open_prs
       FROM repositories r
       JOIN users u ON r.owner_id = u.user_id
       WHERE r.repo_id = :id`,
      { id: parseInt(req.params.id) }
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    const r = result.rows[0];
    res.json({
      repoId: r[0], name: r[1], description: r[2], ownerId: r[3],
      visibility: r[4], defaultBranch: r[5], createdAt: r[6],
      ownerName: r[7], commitCount: r[8], branchCount: r[9],
      starCount: r[10], openIssues: r[11], openPrs: r[12]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await conn.close();
  }
}

// PUT /api/repos/:id
async function updateRepo(req, res) {
  const { name, description, visibility } = req.body;
  const conn = await getConnection();
  try {
    await conn.execute(
      `UPDATE repositories 
       SET repo_name = NVL(:n, repo_name), 
           description = NVL(:d, description),
           visibility = NVL(:v, visibility),
           updated_at = SYSTIMESTAMP
       WHERE repo_id = :id AND owner_id = :uid`,
      { 
        n: name || null, d: description || null, v: visibility || null,
        id: parseInt(req.params.id), uid: req.user.id
      }
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

// DELETE /api/repos/:id
async function deleteRepo(req, res) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `DELETE FROM repositories WHERE repo_id = :id AND owner_id = :uid`,
      { id: parseInt(req.params.id), uid: req.user.id }
    );
    await conn.commit();

    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: 'Repository not found or unauthorized' });
    }

    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    await conn.close();
  }
}

// POST /api/repos/:id/star
async function toggleStar(req, res) {
  const conn = await getConnection();
  try {
    const existing = await conn.execute(
      `SELECT star_id FROM stars WHERE user_id = :uid AND repo_id = :rid`,
      { uid: req.user.id, rid: parseInt(req.params.id) }
    );

    if (existing.rows.length > 0) {
      await conn.execute(
        `DELETE FROM stars WHERE user_id = :uid AND repo_id = :rid`,
        { uid: req.user.id, rid: parseInt(req.params.id) }
      );
      await conn.commit();
      res.json({ starred: false });
    } else {
      await conn.execute(
        `INSERT INTO stars (user_id, repo_id) VALUES (:uid, :rid)`,
        { uid: req.user.id, rid: parseInt(req.params.id) }
      );
      await conn.commit();
      res.json({ starred: true });
    }
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    await conn.close();
  }
}

module.exports = { createRepo, listRepos, exploreRepos, getRepo, updateRepo, deleteRepo, toggleStar };
