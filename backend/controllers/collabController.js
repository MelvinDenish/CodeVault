const oracledb = require('oracledb');
const { getConnection } = require('../config/db');

// POST /api/repos/:id/collaborators
async function addCollaborator(req, res) {
  const repoId = parseInt(req.params.id);
  const { username, role } = req.body;
  const conn = await getConnection();
  try {
    // Find user by username
    const user = await conn.execute(
      `SELECT user_id FROM users WHERE username = :u`,
      { u: username }
    );
    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const userId = user.rows[0][0];

    // Check ownership
    const repo = await conn.execute(
      `SELECT owner_id FROM repositories WHERE repo_id = :rid`,
      { rid: repoId }
    );
    if (repo.rows.length === 0) {
      return res.status(404).json({ error: 'Repository not found' });
    }
    if (repo.rows[0][0] !== req.user.id) {
      return res.status(403).json({ error: 'Only the owner can add collaborators' });
    }
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot add yourself as collaborator' });
    }

    // Check existing
    const existing = await conn.execute(
      `SELECT collab_id FROM collaborators WHERE repo_id = :rid AND user_id = :uid`,
      { rid: repoId, uid: userId }
    );
    if (existing.rows.length > 0) {
      // Update role
      await conn.execute(
        `UPDATE collaborators SET role = :role WHERE repo_id = :rid AND user_id = :uid`,
        { role: role || 'viewer', rid: repoId, uid: userId }
      );
    } else {
      await conn.execute(
        `INSERT INTO collaborators (repo_id, user_id, role) VALUES (:rid, :uid, :role)`,
        { rid: repoId, uid: userId, role: role || 'viewer' }
      );
    }
    await conn.commit();
    res.json({ success: true, userId, role: role || 'viewer' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    await conn.close();
  }
}

// GET /api/repos/:id/collaborators
async function listCollaborators(req, res) {
  const repoId = parseInt(req.params.id);
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT c.collab_id, u.user_id, u.username, u.email, c.role,
              TO_CHAR(c.created_at, 'YYYY-MM-DD"T"HH24:MI:SS') as added_at
       FROM collaborators c
       JOIN users u ON c.user_id = u.user_id
       WHERE c.repo_id = :rid`,
      { rid: repoId }
    );

    const collabs = result.rows.map(r => ({
      collabId: r[0], userId: r[1], username: r[2], email: r[3],
      role: r[4], addedAt: r[5]
    }));

    res.json(collabs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await conn.close();
  }
}

// DELETE /api/repos/:id/collaborators/:uid
async function removeCollaborator(req, res) {
  const repoId = parseInt(req.params.id);
  const userId = parseInt(req.params.uid);
  const conn = await getConnection();
  try {
    await conn.execute(
      `DELETE FROM collaborators WHERE repo_id = :rid AND user_id = :uid`,
      { rid: repoId, uid: userId }
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

// POST /api/repos/:id/fork
async function forkRepo(req, res) {
  const originalRepoId = parseInt(req.params.id);
  const userId = req.user.id;
  const conn = await getConnection();
  try {
    // Get original repo info
    const original = await conn.execute(
      `SELECT repo_name, description, visibility FROM repositories WHERE repo_id = :rid`,
      { rid: originalRepoId }
    );
    if (original.rows.length === 0) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    const [repoName, description] = original.rows[0];

    // Create forked repo
    const newRepo = await conn.execute(
      `INSERT INTO repositories (repo_name, description, owner_id, visibility)
       VALUES (:name, :desc, :uid, 'public')
       RETURNING repo_id INTO :rid`,
      {
        name: repoName, desc: `Forked from repo #${originalRepoId}: ${description || ''}`,
        uid: userId,
        rid: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      }
    );

    const forkedRepoId = newRepo.outBinds.rid[0];

    // Record fork relationship
    await conn.execute(
      `INSERT INTO forks (original_repo, forked_repo, forked_by) VALUES (:orig, :fork, :uid)`,
      { orig: originalRepoId, fork: forkedRepoId, uid: userId }
    );

    // Copy branches and their head commits/files
    const branches = await conn.execute(
      `SELECT branch_id, branch_name, head_commit_id FROM branches WHERE repo_id = :rid`,
      { rid: originalRepoId }
    );

    for (const branch of branches.rows) {
      const [origBranchId, branchName, headCommitId] = branch;

      if (branchName === 'main') {
        // Update auto-created main branch
        if (headCommitId) {
          // Copy commit and files
          const newCommitId = await copyCommit(conn, headCommitId, forkedRepoId, null, userId);
          await conn.execute(
            `UPDATE branches SET head_commit_id = :cid 
             WHERE repo_id = :rid AND branch_name = 'main'`,
            { cid: newCommitId, rid: forkedRepoId }
          );
        }
      } else {
        let newHeadCommitId = null;
        if (headCommitId) {
          newHeadCommitId = await copyCommit(conn, headCommitId, forkedRepoId, null, userId);
        }
        await conn.execute(
          `INSERT INTO branches (repo_id, branch_name, head_commit_id)
           VALUES (:rid, :name, :head)`,
          { rid: forkedRepoId, name: branchName, head: newHeadCommitId }
        );
      }
    }

    // Log activity
    await conn.execute(
      `INSERT INTO activity_logs (user_id, repo_id, action, details)
       VALUES (:uid, :rid, 'fork', 'Forked from repo #' || :orig)`,
      { uid: userId, rid: forkedRepoId, orig: originalRepoId }
    );

    await conn.commit();
    res.status(201).json({ forkedRepoId, originalRepoId });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    await conn.close();
  }
}

// Helper: copy a commit and its files to a new repo
async function copyCommit(conn, commitId, newRepoId, newBranchId, userId) {
  // Get commit details
  const commit = await conn.execute(
    `SELECT message, commit_hash FROM commits WHERE commit_id = :cid`,
    { cid: commitId }
  );
  if (commit.rows.length === 0) return null;

  // Get branch id in new repo
  if (!newBranchId) {
    const br = await conn.execute(
      `SELECT branch_id FROM branches WHERE repo_id = :rid AND branch_name = 'main'`,
      { rid: newRepoId }
    );
    if (br.rows.length > 0) newBranchId = br.rows[0][0];
  }

  // Create new commit
  const newCommit = await conn.execute(
    `INSERT INTO commits (repo_id, branch_id, author_id, message, commit_hash)
     VALUES (:rid, :bid, :uid, :msg, :hash)
     RETURNING commit_id INTO :cid`,
    {
      rid: newRepoId, bid: newBranchId, uid: userId,
      msg: commit.rows[0][0], hash: commit.rows[0][1],
      cid: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
    }
  );

  const newCommitId = newCommit.outBinds.cid[0];

  // Copy files
  const files = await conn.execute(
    `SELECT file_path, file_hash, file_content, file_size FROM files WHERE commit_id = :cid`,
    { cid: commitId }
  );

  for (const f of files.rows) {
    let content = f[2];
    if (content && typeof content.getData === 'function') {
      content = await content.getData();
    }
    await conn.execute(
      `INSERT INTO files (commit_id, file_path, file_hash, file_content, file_size)
       VALUES (:cid, :path, :hash, :content, :size)`,
      { cid: newCommitId, path: f[0], hash: f[1], content: content || '', size: f[3] }
    );
  }

  return newCommitId;
}

// GET /api/repos/:id/activity
async function getActivity(req, res) {
  const repoId = parseInt(req.params.id);
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT al.log_id, al.action, al.details,
              TO_CHAR(al.action_time, 'YYYY-MM-DD"T"HH24:MI:SS') as action_time,
              u.username
       FROM activity_logs al
       LEFT JOIN users u ON al.user_id = u.user_id
       WHERE al.repo_id = :rid
       ORDER BY al.action_time DESC
       FETCH FIRST 50 ROWS ONLY`,
      { rid: repoId }
    );

    const activities = result.rows.map(r => ({
      logId: r[0], action: r[1], details: r[2],
      actionTime: r[3], username: r[4]
    }));

    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await conn.close();
  }
}

// GET /api/search?q=term
async function search(req, res) {
  const query = req.query.q;
  if (!query) return res.json({ repos: [], users: [] });

  const conn = await getConnection();
  try {
    const searchTerm = `%${query}%`;

    const repos = await conn.execute(
      `SELECT r.repo_id, r.repo_name, r.description, u.username as owner_name
       FROM repositories r
       JOIN users u ON r.owner_id = u.user_id
       WHERE (LOWER(r.repo_name) LIKE LOWER(:q) OR LOWER(r.description) LIKE LOWER(:q))
         AND r.visibility = 'public'
       FETCH FIRST 20 ROWS ONLY`,
      { q: searchTerm }
    );

    const users = await conn.execute(
      `SELECT user_id, username, email FROM users
       WHERE LOWER(username) LIKE LOWER(:q) OR LOWER(email) LIKE LOWER(:q)
       FETCH FIRST 20 ROWS ONLY`,
      { q: searchTerm }
    );

    res.json({
      repos: repos.rows.map(r => ({
        repoId: r[0], name: r[1], description: r[2], ownerName: r[3]
      })),
      users: users.rows.map(r => ({
        userId: r[0], username: r[1], email: r[2]
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await conn.close();
  }
}

module.exports = { addCollaborator, listCollaborators, removeCollaborator, forkRepo, getActivity, search };
