const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.get('/', (req, res) => {
  res.render('login', { error: null });
});

router.get('/signup', (req, res) => {
  res.render('signup', { error: null });
});

router.post('/login', (req, res, next) => {
  const { email, password } = req.body;
  const sql = `
    SELECT user_id, user_name, email, role
      FROM users
     WHERE email = ? AND password = ?
    LIMIT 1
  `;
  db.query(sql, [email, password], (err, rows) => {
    if (err) return next(err);
    if (rows.length === 0) {
      return res.render('login', { error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }
    const u = rows[0];
    req.session.user = {
      user_id: u.user_id,
      user_name: u.user_name,
      email: u.email,
      role: u.role,
    };
    return res.redirect('/board');
  });
});

router.post('/signup', (req, res) => {
  const { username, email, password } = req.body;

  const sql = `
    INSERT INTO users (user_name, email, password)
    VALUES (?, ?, ?)
  `;

  db.query(sql, [username, email, password], (err) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.render('signup', { error: '이미 등록된 이메일입니다.' });
      }
      return next(err);
    }
    res.redirect('/');
  });
});

router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    res.clearCookie('connect.sid');
    return res.redirect('/');
  });
});

module.exports = router;