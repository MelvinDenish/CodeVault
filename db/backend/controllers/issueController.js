const oracledb = require('oracledb');
const { getConnection } = require('../config/db');

// POST /api/repos/:id/issues
async function createIssue(req, res) {
  const repoId = parseInt(req.params.id);
  const { title, description, assigneeId } = req.body;
  const userId = req.user.id;

  if (!title) return res.status(400).json({ error: 'Title is required' });

  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `INSERT INTO issues (repo_id, title, description, created_by, assignee_id)
       VALUES (:rid, :title, :desc, :uid, :aid)
       RETURNING issue_id INTO :iid`,
      {
        rid: repoId, title, desc: description || null,
        uid: userId, aid: assigneeId || null,
        iid: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      }
    );
    await conn.commit();
    res.status(201).json({ issueId: result.outBinds.iid[0], status: 'open' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    await conn.close();
  }
}

// GET /api/repos/:id/issues
async function listIssues(req, res) {
  const repoId = parseInt(req.params.id);
  const status = req.query.status || 'open';
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT i.issue_id, i.title, i.status,
              u.username as created_by_name, i.created_by,
              a.username as assignee_name, i.assignee_id,
              TO_CHAR(i.created_at, 'YYYY-MM-DD"T"HH24:MI:SS') as created_at,
              (SELECT COUNT(*) FROM issue_comments ic WHERE ic.issue_id = i.issue_id) as comment_count
       FROM issues i
       JOIN users u ON i.created_by = u.user_id
       LEFT JOIN users a ON i.assignee_id = a.user_id
       WHERE i.repo_id = :rid AND i.status = :status
       ORDER BY i.created_at DESC`,
      { rid: repoId, status }
    );

    const issues = result.rows.map(r => ({
      issueId: r[0], title: r[1], status: r[2],
      createdByName: r[3], createdBy: r[4],
      assigneeName: r[5], assigneeId: r[6],
      createdAt: r[7], commentCount: r[8]
    }));

    res.json(issues);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await conn.close();
  }
}

// GET /api/issues/:id
async function getIssue(req, res) {
  const issueId = parseInt(req.params.id);
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT i.issue_id, i.title, i.description, i.status, i.repo_id,
              u.username as created_by_name, i.created_by,
              a.username as assignee_name, i.assignee_id,
              TO_CHAR(i.created_at, 'YYYY-MM-DD"T"HH24:MI:SS') as created_at,
              TO_CHAR(i.closed_at, 'YYYY-MM-DD"T"HH24:MI:SS') as closed_at
       FROM issues i
       JOIN users u ON i.created_by = u.user_id
       LEFT JOIN users a ON i.assignee_id = a.user_id
       WHERE i.issue_id = :iid`,
      { iid: issueId }
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    const r = result.rows[0];
    let description = r[2];
    if (description && typeof description.getData === 'function') {
      description = await description.getData();
    }

    // Get comments
    const comments = await conn.execute(
      `SELECT ic.comment_id, ic.body, u.username, ic.user_id,
              TO_CHAR(ic.created_at, 'YYYY-MM-DD"T"HH24:MI:SS') as created_at
       FROM issue_comments ic
       JOIN users u ON ic.user_id = u.user_id
       WHERE ic.issue_id = :iid
       ORDER BY ic.created_at ASC`,
      { iid: issueId }
    );

    const commentList = [];
    for (const c of comments.rows) {
      let body = c[1];
      if (body && typeof body.getData === 'function') {
        body = await body.getData();
      }
      commentList.push({
        commentId: c[0], body: body || '', username: c[2],
        userId: c[3], createdAt: c[4]
      });
    }

    res.json({
      issueId: r[0], title: r[1], description: description || '', status: r[3],
      repoId: r[4], createdByName: r[5], createdBy: r[6],
      assigneeName: r[7], assigneeId: r[8],
      createdAt: r[9], closedAt: r[10],
      comments: commentList
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await conn.close();
  }
}

// PUT /api/issues/:id
async function updateIssue(req, res) {
  const issueId = parseInt(req.params.id);
  const { status, title, assigneeId } = req.body;
  const conn = await getConnection();
  try {
    let sql = `UPDATE issues SET updated_at = SYSTIMESTAMP`;
    const binds = { iid: issueId };

    if (status) {
      sql += `, status = :status`;
      binds.status = status;
      if (status === 'closed') sql += `, closed_at = SYSTIMESTAMP`;
    }
    if (title) {
      sql += `, title = :title`;
      binds.title = title;
    }
    if (assigneeId !== undefined) {
      sql += `, assignee_id = :aid`;
      binds.aid = assigneeId || null;
    }

    sql += ` WHERE issue_id = :iid`;
    await conn.execute(sql, binds);
    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    await conn.close();
  }
}

// POST /api/issues/:id/comments
async function addComment(req, res) {
  const issueId = parseInt(req.params.id);
  const { body } = req.body;
  const userId = req.user.id;

  if (!body) return res.status(400).json({ error: 'Comment body is required' });

  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `INSERT INTO issue_comments (issue_id, user_id, body)
       VALUES (:iid, :uid, :body)
       RETURNING comment_id INTO :cid`,
      {
        iid: issueId, uid: userId, body,
        cid: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      }
    );
    await conn.commit();
    res.status(201).json({ commentId: result.outBinds.cid[0] });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    await conn.close();
  }
}

module.exports = { createIssue, listIssues, getIssue, updateIssue, addComment };
