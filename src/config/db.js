const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '1234',    
  database: 'boarddb'
});

connection.connect(err => {
  if (err) throw err;
  console.log('DB connected');
});

module.exports = connection;
