const crypto = require('crypto');
const oracledb = require('oracledb');
const { getConnection } = require('../config/db');
const Diff = require('diff');

// POST /api/repos/:id/commits
async function createCommit(req, res) {
  const repoId = parseInt(req.params.id);
  const userId = req.user.id;
  const { branchId, message, files } = req.body;

  if (!branchId || !message || !files || !files.length) {
    return res.status(400).json({ error: 'branchId, message, and files are required' });
  }

  const conn = await getConnection();
  try {
    // Verify branch belongs to repo
    const branchCheck = await conn.execute(
      `SELECT head_commit_id FROM branches WHERE branch_id = :bid AND repo_id = :rid`,
      { bid: branchId, rid: repoId }
    );
    if (branchCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Branch not found in this repository' });
    }

    const parentCommitId = branchCheck.rows[0][0];

    // Generate commit hash from content
    const commitContent = message + files.map(f => f.path + f.content).join('');
    const commitHash = crypto.createHash('sha256').update(commitContent + Date.now()).digest('hex').substring(0, 12);

    // Create commit record
    const commitResult = await conn.execute(
      `INSERT INTO commits (repo_id, branch_id, author_id, message, parent_commit_id, commit_hash)
       VALUES (:rid, :bid, :aid, :msg, :parent, :hash)
       RETURNING commit_id INTO :cid`,
      {
        rid: repoId,
        bid: branchId,
        aid: userId,
        msg: message,
        parent: parentCommitId || null,
        hash: commitHash,
        cid: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      }
    );

    const newCommitId = commitResult.outBinds.cid[0];

    // Store files with content-addressable storage
    for (const file of files) {
      const content = file.content || '';
      const fileHash = crypto.createHash('sha256').update(content).digest('hex');
      const fileSize = Buffer.byteLength(content, 'utf8');

      await conn.execute(
        `INSERT INTO files (commit_id, file_path, file_hash, file_content, file_size)
         VALUES (:cid, :fpath, :fhash, :fcontent, :fsize)`,
        {
          cid: newCommitId,
          fpath: file.path,
          fhash: fileHash,
          fcontent: { val: content, type: oracledb.DB_TYPE_CLOB },
          fsize: fileSize
        }
      );
    }

    // Update branch HEAD
    await conn.execute(
      `UPDATE branches SET head_commit_id = :cid WHERE branch_id = :bid`,
      { cid: newCommitId, bid: branchId }
    );

    await conn.commit();
    res.status(201).json({ commitId: newCommitId, commitHash, filesCount: files.length });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    await conn.close();
  }
}

// GET /api/repos/:id/commits?branchId=x
async function listCommits(req, res) {
  const repoId = parseInt(req.params.id);
  const branchId = req.query.branchId;
  const conn = await getConnection();
  try {
    let sql = `SELECT c.commit_id, c.commit_hash, c.message, c.parent_commit_id,
                      TO_CHAR(c.commit_time, 'YYYY-MM-DD"T"HH24:MI:SS') as commit_time,
                      u.username as author_name, u.user_id as author_id, c.branch_id,
                      (SELECT COUNT(*) FROM files f WHERE f.commit_id = c.commit_id) as file_count
               FROM commits c
               JOIN users u ON c.author_id = u.user_id
               WHERE c.repo_id = :rid`;
    const binds = { rid: repoId };

    if (branchId) {
      sql += ` AND c.branch_id = :bid`;
      binds.bid = parseInt(branchId);
    }

    sql += ` ORDER BY c.commit_time DESC FETCH FIRST 100 ROWS ONLY`;

    const result = await conn.execute(sql, binds);
    const commits = result.rows.map(r => ({
      commitId: r[0], commitHash: r[1], message: r[2], parentCommitId: r[3],
      commitTime: r[4], authorName: r[5], authorId: r[6], branchId: r[7],
      fileCount: r[8]
    }));

    res.json(commits);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await conn.close();
  }
}

// GET /api/commits/:id
async function getCommit(req, res) {
  const commitId = parseInt(req.params.id);
  const conn = await getConnection();
  try {
    const commitResult = await conn.execute(
      `SELECT c.commit_id, c.commit_hash, c.message, c.parent_commit_id,
              TO_CHAR(c.commit_time, 'YYYY-MM-DD"T"HH24:MI:SS') as commit_time,
              u.username as author_name, c.repo_id, c.branch_id
       FROM commits c
       JOIN users u ON c.author_id = u.user_id
       WHERE c.commit_id = :cid`,
      { cid: commitId }
    );

    if (commitResult.rows.length === 0) {
      return res.status(404).json({ error: 'Commit not found' });
    }

    const cr = commitResult.rows[0];

    // Get files in this commit
    const filesResult = await conn.execute(
      `SELECT file_id, file_path, file_hash, file_content, file_size
       FROM files WHERE commit_id = :cid ORDER BY file_path`,
      { cid: commitId }
    );

    const files = [];
    for (const f of filesResult.rows) {
      let content = f[3];
      if (content && typeof content.getData === 'function') {
        content = await content.getData();
      }
      files.push({
        fileId: f[0], filePath: f[1], fileHash: f[2],
        content: content || '', fileSize: f[4]
      });
    }

    // If there's a parent commit, compute diffs
    const diffs = [];
    if (cr[3]) { // parent_commit_id
      const parentFiles = await conn.execute(
        `SELECT file_path, file_content FROM files WHERE commit_id = :pid`,
        { pid: cr[3] }
      );

      const parentMap = {};
      for (const pf of parentFiles.rows) {
        let pcontent = pf[1];
        if (pcontent && typeof pcontent.getData === 'function') {
          pcontent = await pcontent.getData();
        }
        parentMap[pf[0]] = pcontent || '';
      }

      for (const file of files) {
        const oldContent = parentMap[file.filePath] || '';
        const changes = Diff.createTwoFilesPatch(
          file.filePath, file.filePath,
          oldContent, file.content,
          'old', 'new'
        );
        diffs.push({
          filePath: file.filePath,
          diff: changes,
          status: parentMap[file.filePath] !== undefined ? 'modified' : 'added'
        });
      }

      // Check for deleted files
      for (const path of Object.keys(parentMap)) {
        if (!files.find(f => f.filePath === path)) {
          diffs.push({
            filePath: path,
            diff: Diff.createTwoFilesPatch(path, path, parentMap[path], '', 'old', 'new'),
            status: 'deleted'
          });
        }
      }
    } else {
      // First commit - all files are "added"
      for (const file of files) {
        diffs.push({
          filePath: file.filePath,
          diff: Diff.createTwoFilesPatch(file.filePath, file.filePath, '', file.content, 'old', 'new'),
          status: 'added'
        });
      }
    }

    res.json({
      commitId: cr[0], commitHash: cr[1], message: cr[2],
      parentCommitId: cr[3], commitTime: cr[4], authorName: cr[5],
      repoId: cr[6], branchId: cr[7],
      files, diffs
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await conn.close();
  }
}

// GET /api/repos/:id/files?branchId=x&path=y
async function getFiles(req, res) {
  const repoId = parseInt(req.params.id);
  const branchId = req.query.branchId;
  const requestedPath = req.query.path || '';
  const conn = await getConnection();
  try {
    // Get head commit of branch
    let headCommitId;
    if (branchId) {
      const br = await conn.execute(
        `SELECT head_commit_id FROM branches WHERE branch_id = :bid AND repo_id = :rid`,
        { bid: parseInt(branchId), rid: repoId }
      );
      if (br.rows.length === 0 || !br.rows[0][0]) {
        return res.json({ files: [], tree: [] });
      }
      headCommitId = br.rows[0][0];
    } else {
      // Get default branch
      const br = await conn.execute(
        `SELECT b.head_commit_id FROM branches b
         JOIN repositories r ON b.repo_id = r.repo_id AND b.branch_name = r.default_branch
         WHERE b.repo_id = :rid`,
        { rid: repoId }
      );
      if (br.rows.length === 0 || !br.rows[0][0]) {
        return res.json({ files: [], tree: [] });
      }
      headCommitId = br.rows[0][0];
    }

    // Get all files at HEAD by walking back commit chain
    // For simplicity, get the latest version of each file path
    const filesResult = await conn.execute(
      `SELECT f.file_id, f.file_path, f.file_hash, f.file_content, f.file_size,
              TO_CHAR(c.commit_time, 'YYYY-MM-DD"T"HH24:MI:SS') as last_modified,
              c.message as last_commit_msg
       FROM files f
       JOIN commits c ON f.commit_id = c.commit_id
       WHERE f.commit_id = :cid
       ORDER BY f.file_path`,
      { cid: headCommitId }
    );

    const files = [];
    const tree = new Set();

    for (const f of filesResult.rows) {
      let content = f[3];
      if (content && typeof content.getData === 'function') {
        content = await content.getData();
      }

      files.push({
        fileId: f[0], filePath: f[1], fileHash: f[2],
        content: content || '', fileSize: f[4],
        lastModified: f[5], lastCommitMsg: f[6]
      });

      // Build tree
      const parts = f[1].split('/');
      let currentPath = '';
      for (let i = 0; i < parts.length - 1; i++) {
        currentPath += (currentPath ? '/' : '') + parts[i];
        tree.add(currentPath);
      }
    }

    // Filter by path if requested
    let filteredFiles = files;
    if (requestedPath) {
      filteredFiles = files.filter(f => f.filePath.startsWith(requestedPath));
    }

    res.json({ files: filteredFiles, directories: Array.from(tree) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await conn.close();
  }
}

module.exports = { createCommit, listCommits, getCommit, getFiles };
