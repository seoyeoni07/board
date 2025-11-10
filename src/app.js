const express = require('express');
const path = require('path');
const session = require('express-session');

const indexRouter = require('./routes/index');
const boardRouter = require('./routes/board');

const app = express();
const port = 3000;

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'replace-with-strong-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 } // 1h
}));

app.use('/', indexRouter);
app.use('/board', boardRouter);

app.use((req, res) => {
  res.status(404).send('Not Found');
});

app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(500).send('서버 오류: ' + (err.code || err.message));
});

app.listen(port, () => {
  console.log(`서버 실행: http://localhost:${port}`);
});

module.exports = app;