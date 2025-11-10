const express = require('express');
const router = express.Router();
const db = require('../config/db');

function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect('/');
  next();
}
function isAdmin(req) {
  return req.session.user && req.session.user.role === 'admin';
}

router.get('/', requireLogin, (req, res, next) => {
  const q = (req.query.q || '').trim();
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const limit = 10;
  const offset = (page - 1) * limit;

  const noticeSql = `
    SELECT p.post_id, p.title, p.views,
           DATE_FORMAT(p.created_at, '%Y-%m-%d') AS created_date,
           u.user_name AS author_name
    FROM posts p
    JOIN users u ON u.user_id = p.user_id
    WHERE p.is_notice = 1
    ORDER BY p.post_id DESC
  `;

  const where = q ? 'WHERE p.is_notice = 0 AND p.title LIKE ?' : 'WHERE p.is_notice = 0';
  const whereParams = q ? [`%${q}%`] : [];

  const countSql = `SELECT COUNT(*) AS cnt FROM posts p ${where}`;
  const listSql = `
    SELECT p.post_id, p.title, p.views,
           DATE_FORMAT(p.created_at, '%Y-%m-%d') AS created_date,
           u.user_name AS author_name
    FROM posts p
    JOIN users u ON u.user_id = p.user_id
    ${where}
    ORDER BY p.post_id DESC
    LIMIT ? OFFSET ?
  `;

  db.query(noticeSql, [], (e0, noticeRows) => {
    if (e0) return next(e0);

    db.query(countSql, whereParams, (e1, countRows) => {
      if (e1) return next(e1);

      const total = countRows[0].cnt;
      const totalPages = Math.max(Math.ceil(total / limit), 1);

      db.query(listSql, [...whereParams, limit, offset], (e2, rows) => {
        if (e2) return next(e2);

        return res.render('board', {
          title: '게시판',
          user: req.session.user,
          active: 'board',
          notices: noticeRows || [],
          posts: rows || [],
          q,
          currentPage: page,
          totalPages
        });
      });
    });
  });
});

router.get('/new', requireLogin, (req, res) => {
  res.render('board_form', {
    title: '글쓰기',
    user: req.session.user,
    active: 'board',
    post: null,
    mode: 'new'
  });
});

router.post('/new', requireLogin, (req, res, next) => {
  const { title, content } = req.body;
  const isNotice = isAdmin(req) && req.body.is_notice === 'on' ? 1 : 0;
  const sql = `INSERT INTO posts (user_id, title, content, is_notice)
               VALUES (?, ?, ?, ?)`;
  db.query(sql, [req.session.user.user_id, title, content, isNotice], (err) => {
    if (err) return next(err);
    res.redirect('/board');
  });
});

router.get('/:id', requireLogin, (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.redirect('/board');

  const incSql = 'UPDATE posts SET views = views + 1 WHERE post_id = ?';
  const readSql = `
    SELECT p.*, u.user_name AS author_name,
           DATE_FORMAT(p.created_at, '%Y-%m-%d %H:%i') AS created_at_fmt,
           DATE_FORMAT(p.updated_at, '%Y-%m-%d %H:%i') AS updated_at_fmt
    FROM posts p
    JOIN users u ON u.user_id = p.user_id
    WHERE p.post_id = ?`;

  db.query(incSql, [id], (incErr) => {
    if (incErr) return next(incErr);
    db.query(readSql, [id], (err, rows) => {
      if (err) return next(err);
      if (!rows.length) return res.redirect('/board');
      return res.render('board_detail', {
        title: '게시글',
        user: req.session.user,
        active: 'board',
        post: rows[0]
      });
    });
  });
});

router.get('/:id/edit', requireLogin, (req, res, next) => {
  const id = Number(req.params.id) || 0;
  const sql = 'SELECT * FROM posts WHERE post_id = ?';
  db.query(sql, [id], (err, rows) => {
    if (err) return next(err);
    if (rows.length === 0) return res.redirect('/board');
    const post = rows[0];
    if (!isAdmin(req) && post.user_id !== req.session.user.user_id) {
      return res.redirect('/board');
    }
    res.render('board_form', {
      title: '글 수정',
      user: req.session.user,
      active: 'board',
      post,
      mode: 'edit'
    });
  });
});

router.post('/:id/edit', requireLogin, (req, res, next) => {
  const id = parseInt(req.params.id, 10);
  const { title, content } = req.body;
  const isNotice = isAdmin(req) && req.body.is_notice === 'on' ? 1 : 0;

  const sql = isAdmin(req)
    ? `UPDATE posts SET title=?, content=?, is_notice=? WHERE post_id=?`
    : `UPDATE posts SET title=?, content=?, is_notice=? WHERE post_id=? AND user_id=?`;

  const params = isAdmin(req)
    ? [title, content, isNotice, id]
    : [title, content, isNotice, id, req.session.user.user_id];

  db.query(sql, params, (err) => {
    if (err) return next(err);
    res.redirect(`/board/${id}`);
  });
});

router.post('/:id/delete', requireLogin, (req, res, next) => {
  const id = parseInt(req.params.id, 10);
  const userId = req.session.user.user_id;
  const admin = isAdmin(req);

  const sql = admin
    ? 'DELETE FROM posts WHERE post_id = ?'
    : 'DELETE FROM posts WHERE post_id = ? AND user_id = ?';
  const params = admin ? [id] : [id, userId];

  db.query(sql, params, (err, result) => {
    if (err) return next(err);
    if (result.affectedRows === 0) {
      return res.status(403).send('삭제 권한이 없거나 글이 존재하지 않습니다.');
    }
    return res.redirect('/board');
  });
});

router.get('/:id/delete', requireLogin, (req, res, next) => {
  const id = parseInt(req.params.id, 10);
  const userId = req.session.user.user_id;
  const admin = isAdmin(req);

  const sql = admin
    ? 'DELETE FROM posts WHERE post_id = ?'
    : 'DELETE FROM posts WHERE post_id = ? AND user_id = ?';
  const params = admin ? [id] : [id, userId];

  db.query(sql, params, (err, result) => {
    if (err) return next(err);
    if (result.affectedRows === 0) {
      return res.status(403).send('삭제 권한이 없거나 글이 존재하지 않습니다.');
    }
    return res.redirect('/board');
  });
});

module.exports = router;