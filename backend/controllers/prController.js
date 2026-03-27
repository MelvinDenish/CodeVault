const oracledb = require('oracledb');
const { getConnection } = require('../config/db');
const Diff = require('diff');

// POST /api/repos/:id/pullrequests
async function createPR(req, res) {
  const repoId = parseInt(req.params.id);
  const { title, description, sourceBranchId, targetBranchId } = req.body;
  const userId = req.user.id;

  if (!title || !sourceBranchId || !targetBranchId) {
    return res.status(400).json({ error: 'title, sourceBranchId, and targetBranchId required' });
  }

  if (sourceBranchId === targetBranchId) {
    return res.status(400).json({ error: 'Source and target branches must be different' });
  }

  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `INSERT INTO pull_requests (repo_id, title, description, source_branch, target_branch, author_id)
       VALUES (:rid, :title, :desc, :src, :tgt, :uid)
       RETURNING pr_id INTO :prid`,
      {
        rid: repoId, title, desc: description || null,
        src: sourceBranchId, tgt: targetBranchId, uid: userId,
        prid: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      }
    );
    await conn.commit();

    res.status(201).json({ prId: result.outBinds.prid[0], status: 'open' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    await conn.close();
  }
}

// GET /api/repos/:id/pullrequests
async function listPRs(req, res) {
  const repoId = parseInt(req.params.id);
  const status = req.query.status || 'open';
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT p.pr_id, p.title, p.description, p.status,
              sb.branch_name as source_name, tb.branch_name as target_name,
              p.source_branch, p.target_branch,
              u.username as author_name, p.author_id,
              TO_CHAR(p.created_at, 'YYYY-MM-DD"T"HH24:MI:SS') as created_at,
              TO_CHAR(p.merged_at, 'YYYY-MM-DD"T"HH24:MI:SS') as merged_at
       FROM pull_requests p
       JOIN branches sb ON p.source_branch = sb.branch_id
       JOIN branches tb ON p.target_branch = tb.branch_id
       JOIN users u ON p.author_id = u.user_id
       WHERE p.repo_id = :rid AND p.status = :status
       ORDER BY p.created_at DESC`,
      { rid: repoId, status }
    );

    const prs = result.rows.map(r => ({
      prId: r[0], title: r[1], description: r[2], status: r[3],
      sourceBranchName: r[4], targetBranchName: r[5],
      sourceBranchId: r[6], targetBranchId: r[7],
      authorName: r[8], authorId: r[9],
      createdAt: r[10], mergedAt: r[11]
    }));

    res.json(prs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await conn.close();
  }
}

// GET /api/pullrequests/:id
async function getPR(req, res) {
  const prId = parseInt(req.params.id);
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT p.pr_id, p.title, p.description, p.status, p.repo_id,
              sb.branch_name as source_name, tb.branch_name as target_name,
              p.source_branch, p.target_branch,
              sb.head_commit_id as source_head, tb.head_commit_id as target_head,
              u.username as author_name, p.author_id,
              TO_CHAR(p.created_at, 'YYYY-MM-DD"T"HH24:MI:SS') as created_at,
              TO_CHAR(p.merged_at, 'YYYY-MM-DD"T"HH24:MI:SS') as merged_at
       FROM pull_requests p
       JOIN branches sb ON p.source_branch = sb.branch_id
       JOIN branches tb ON p.target_branch = tb.branch_id
       JOIN users u ON p.author_id = u.user_id
       WHERE p.pr_id = :prid`,
      { prid: prId }
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pull request not found' });
    }

    const r = result.rows[0];

    // Get diff between source and target
    const sourceFiles = await getFilesAtCommit(conn, r[9]);
    const targetFiles = await getFilesAtCommit(conn, r[10]);

    const diffs = computeDiffs(sourceFiles, targetFiles);

    res.json({
      prId: r[0], title: r[1], description: r[2], status: r[3], repoId: r[4],
      sourceBranchName: r[5], targetBranchName: r[6],
      sourceBranchId: r[7], targetBranchId: r[8],
      sourceHead: r[9], targetHead: r[10],
      authorName: r[11], authorId: r[12],
      createdAt: r[13], mergedAt: r[14],
      diffs
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await conn.close();
  }
}

// POST /api/pullrequests/:id/merge
async function mergePR(req, res) {
  const prId = parseInt(req.params.id);
  const conn = await getConnection();
  try {
    // Get PR details
    const pr = await conn.execute(
      `SELECT p.source_branch, p.target_branch, p.repo_id, p.status,
              sb.head_commit_id as source_head, tb.head_commit_id as target_head
       FROM pull_requests p
       JOIN branches sb ON p.source_branch = sb.branch_id
       JOIN branches tb ON p.target_branch = tb.branch_id
       WHERE p.pr_id = :prid`,
      { prid: prId }
    );

    if (pr.rows.length === 0) {
      return res.status(404).json({ error: 'PR not found' });
    }

    const [sourceBranch, targetBranch, repoId, status, sourceHead, targetHead] = pr.rows[0];

    if (status !== 'open') {
      return res.status(400).json({ error: 'PR is not open' });
    }

    if (!sourceHead) {
      return res.status(400).json({ error: 'Source branch has no commits' });
    }

    // Check for conflicts
    const sourceFiles = await getFilesAtCommit(conn, sourceHead);
    const targetFiles = await getFilesAtCommit(conn, targetHead);

    const conflicts = detectConflicts(sourceFiles, targetFiles);

    if (conflicts.length > 0) {
      return res.json({ 
        merged: false, 
        conflicts: conflicts.map(c => c.filePath),
        message: 'Merge conflicts detected'
      });
    }

    // Fast-forward merge: update target branch head to source head
    await conn.execute(
      `UPDATE branches SET head_commit_id = :head WHERE branch_id = :bid`,
      { head: sourceHead, bid: targetBranch }
    );

    // Update PR status
    await conn.execute(
      `UPDATE pull_requests SET status = 'merged', merged_at = SYSTIMESTAMP, updated_at = SYSTIMESTAMP
       WHERE pr_id = :prid`,
      { prid: prId }
    );

    // Log activity
    await conn.execute(
      `INSERT INTO activity_logs (user_id, repo_id, action, details)
       VALUES (:uid, :rid, 'merge', 'Merged PR #' || :prid)`,
      { uid: req.user.id, rid: repoId, prid: prId }
    );

    await conn.commit();
    res.json({ merged: true, conflicts: [] });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    await conn.close();
  }
}

// POST /api/pullrequests/:id/close
async function closePR(req, res) {
  const prId = parseInt(req.params.id);
  const conn = await getConnection();
  try {
    await conn.execute(
      `UPDATE pull_requests SET status = 'closed', updated_at = SYSTIMESTAMP WHERE pr_id = :prid`,
      { prid: prId }
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

// Helper: get files at a commit
async function getFilesAtCommit(conn, commitId) {
  if (!commitId) return {};
  const result = await conn.execute(
    `SELECT file_path, file_content FROM files WHERE commit_id = :cid`,
    { cid: commitId }
  );
  const files = {};
  for (const r of result.rows) {
    let content = r[1];
    if (content && typeof content.getData === 'function') {
      content = await content.getData();
    }
    files[r[0]] = content || '';
  }
  return files;
}

// Helper: compute diffs between two file sets
function computeDiffs(sourceFiles, targetFiles) {
  const diffs = [];
  const allPaths = new Set([...Object.keys(sourceFiles), ...Object.keys(targetFiles)]);

  for (const path of allPaths) {
    const sourceContent = sourceFiles[path] || '';
    const targetContent = targetFiles[path] || '';

    if (sourceContent !== targetContent) {
      diffs.push({
        filePath: path,
        diff: Diff.createTwoFilesPatch(path, path, targetContent, sourceContent, 'target', 'source'),
        status: !targetFiles[path] ? 'added' : !sourceFiles[path] ? 'deleted' : 'modified'
      });
    }
  }
  return diffs;
}

// Helper: detect conflicts (simplified)
function detectConflicts(sourceFiles, targetFiles) {
  const conflicts = [];
  for (const path of Object.keys(sourceFiles)) {
    if (targetFiles[path] && sourceFiles[path] !== targetFiles[path]) {
      // Both modified same file differently - potential conflict
      // In a real system we'd do 3-way diff
      // For now: if both have changes to same file at same lines → conflict
      const changes = Diff.structuredPatch(path, path, targetFiles[path], sourceFiles[path]);
      const hasConflict = changes.hunks.some(h => h.oldLines > 0 && h.newLines > 0);
      if (hasConflict) {
        conflicts.push({ filePath: path });
      }
    }
  }
  return conflicts;
}

module.exports = { createPR, listPRs, getPR, mergePR, closePR };
