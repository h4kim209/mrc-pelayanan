const fs = require('fs');
const path = require('path');
const mysql = require('../node_modules/mysql2/promise');

(async () => {
  // 1. Update settings.json
  const settingsJsonPath = path.join(__dirname, '..', 'database', 'settings.json');
  if (fs.existsSync(settingsJsonPath)) {
    const s = JSON.parse(fs.readFileSync(settingsJsonPath, 'utf-8'));
    if (!s.operator) {
      s.operator = {
        username: "operator",
        password: "operator123"
      };
      fs.writeFileSync(settingsJsonPath, JSON.stringify(s, null, 2), 'utf-8');
      console.log('settings.json updated with operator');
    }
  }

  // 2. Update MySQL settings
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'mrc_db'
  });

  const [rows] = await conn.execute('SELECT data FROM settings WHERE id = 1');
  if (rows.length > 0) {
    let data = rows[0].data;
    if (typeof data === 'string') data = JSON.parse(data);
    if (!data.operator) {
      data.operator = {
        username: "operator",
        password: "operator123"
      };
    }
    await conn.execute('UPDATE settings SET data = ? WHERE id = 1', [JSON.stringify(data)]);
    console.log('MySQL settings table updated with operator');
  }
  await conn.end();
})();
