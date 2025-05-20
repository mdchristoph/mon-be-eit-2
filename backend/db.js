const mysql = require('mysql');
const conn = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'rfid_access'
});
conn.connect(err => {
  if (err) throw err;
  console.log('✅ Connecté à MySQL');
});
module.exports = conn;