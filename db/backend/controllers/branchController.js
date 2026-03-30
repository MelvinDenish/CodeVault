const oracledb = require('oracledb');
const { getConnection } = require('../config/db');

// POST /api/repos/:id/branches
async function createBranch(req, res) {
  const repoId = parseInt(req.params.id);
  const { branchName, sourceBranchId } = req.body;

  if (!branchName) {
    return res.status(400).json({ error: 'Branch name is required' });
  }

  const conn = await getConnection();
  try {
    // Check name uniqueness
    const existing = await conn.execute(
      `SELECT COUNT(*) FROM branches WHERE repo_id = :rid AND branch_name = :name`,
      { rid: repoId, name: branchName }
    );
    if (existing.rows[0][0] > 0) {
      return res.status(409).json({ error: 'Branch already exists' });
    }

    // Get source commit
    let sourceCommitId = null;
    if (sourceBranchId) {
      const source = await conn.execute(
        `SELECT head_commit_id FROM branches WHERE branch_id = :bid AND repo_id = :rid`,
        { bid: sourceBranchId, rid: repoId }
      );
      if (source.rows.length > 0) {
        sourceCommitId = source.rows[0][0];
      }
    } else {
      // Default: branch from default branch
      const def = await conn.execute(
        `SELECT b.head_commit_id FROM branches b 
         JOIN repositories r ON b.repo_id = r.repo_id AND b.branch_name = r.default_branch
         WHERE b.repo_id = :rid`,
        { rid: repoId }
      );
      if (def.rows.length > 0) {
        sourceCommitId = def.rows[0][0];
      }
    }

    const result = await conn.execute(
      `INSERT INTO branches (repo_id, branch_name, head_commit_id)
       VALUES (:rid, :name, :head)
       RETURNING branch_id INTO :bid`,
      {
        rid: repoId, name: branchName, head: sourceCommitId,
        bid: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      }
    );
    await conn.commit();

    res.status(201).json({
      branchId: result.outBinds.bid[0],
      branchName,
      headCommitId: sourceCommitId
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    await conn.close();
  }
}

// GET /api/repos/:id/branches
async function listBranches(req, res) {
  const repoId = parseInt(req.params.id);
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT b.branch_id, b.branch_name, b.head_commit_id,
              TO_CHAR(b.created_at, 'YYYY-MM-DD"T"HH24:MI:SS') as created_at,
              c.commit_hash, c.message as head_msg,
              TO_CHAR(c.commit_time, 'YYYY-MM-DD"T"HH24:MI:SS') as head_time,
              r.default_branch
       FROM branches b
       LEFT JOIN commits c ON b.head_commit_id = c.commit_id
       JOIN repositories r ON b.repo_id = r.repo_id
       WHERE b.repo_id = :rid
       ORDER BY b.branch_name`,
      { rid: repoId }
    );

    const branches = result.rows.map(r => ({
      branchId: r[0], branchName: r[1], headCommitId: r[2],
      createdAt: r[3], headCommitHash: r[4], headMessage: r[5],
      headTime: r[6], isDefault: r[1] === r[7]
    }));

    res.json(branches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await conn.close();
  }
}

// DELETE /api/repos/:id/branches/:bid
async function deleteBranch(req, res) {
  const repoId = parseInt(req.params.id);
  const branchId = parseInt(req.params.bid);
  const conn = await getConnection();
  try {
    // Don't allow deleting default branch
    const check = await conn.execute(
      `SELECT r.default_branch, b.branch_name 
       FROM repositories r JOIN branches b ON b.repo_id = r.repo_id
       WHERE r.repo_id = :rid AND b.branch_id = :bid`,
      { rid: repoId, bid: branchId }
    );
    if (check.rows.length > 0 && check.rows[0][0] === check.rows[0][1]) {
      return res.status(400).json({ error: 'Cannot delete the default branch' });
    }

    await conn.execute(
      `DELETE FROM branches WHERE branch_id = :bid AND repo_id = :rid`,
      { bid: branchId, rid: repoId }
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

module.exports = { createBranch, listBranches, deleteBranch };
