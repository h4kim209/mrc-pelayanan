require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const loansPath = path.join(__dirname, '..', 'database', 'loans.json');
const notificationsPath = path.join(__dirname, '..', 'database', 'notifications.json');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mrc_db',
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
});

function readJSON(file) {
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return [];
  }
}

async function getLoans() {
  try {
    const [rows] = await pool.query('SELECT * FROM loans');
    return rows;
  } catch (err) {
    // Fallback to JSON
    return readJSON(loansPath);
  }
}

async function getNotifications() {
  try {
    const [rows] = await pool.query('SELECT * FROM notifications ORDER BY id DESC LIMIT 500');
    return rows;
  } catch (err) {
    return readJSON(notificationsPath);
  }
}

async function addNotification(message, type, slot = null) {
  const timestamp = new Date().toISOString();
  const notifId = Date.now();
  try {
    await pool.query(
      'INSERT INTO notifications (id, message, type, `read`, slot, timestamp) VALUES (?, ?, ?, 0, ?, ?)',
      [notifId, message, type, slot, timestamp]
    );
  } catch (err) {
    // Fallback to JSON
    const notifs = readJSON(notificationsPath);
    const obj = { id: notifId, message, type, read: false, timestamp };
    if (slot) obj.slot = slot;
    notifs.unshift(obj);
    fs.writeFileSync(notificationsPath, JSON.stringify(notifs, null, 2));
  }
}

async function runScheduler() {
  const now = new Date();
  if (typeof runScheduler._lastWeekendSkipDate === 'undefined') runScheduler._lastWeekendSkipDate = null;
  const today = now.toISOString().split('T')[0];
  const todayStr = today;

  function dueDateStr(d) {
    if (!d) return null;
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return null;
    return dt.toISOString().split('T')[0];
  }

  function isReturned(l) {
    if (!l) return false;
    if (l.returnDate) return true;
    if (l.status) {
      try {
        const s = String(l.status).trim().toLowerCase();
        if (s === 'dikembalikan') return true;
      } catch (e) {
        // ignore
      }
    }
    return false;
  }

  const loans = await getLoans();

  const overdue = loans.filter((l) => {
    if (isReturned(l)) return false;
    const ds = dueDateStr(l.dueDate);
    if (!ds) return false;
    return ds < todayStr;
  });

  const dueToday = loans.filter((l) => {
    if (isReturned(l)) return false;
    const ds = dueDateStr(l.dueDate);
    if (!ds) return false;
    return ds === todayStr;
  });

  const notifications = await getNotifications();

  const hour = now.getHours();
  const minute = now.getMinutes();
  const day = now.getDay();

  if (day === 0 || day === 6) {
    if (runScheduler._lastWeekendSkipDate !== today) {
      console.log('Today is weekend, skipping scheduled notifications.');
      runScheduler._lastWeekendSkipDate = today;
    }
    return;
  }

  function slotExists(type, slotId) {
    return notifications.some(
      (n) => n.type === type && n.slot === slotId && n.timestamp && n.timestamp.split('T')[0] === todayStr
    );
  }

  // Overdue triggers (at 07:00 and 15:00)
  if ((hour === 7 || hour === 15) && minute === 0) {
    const slotId = `overdue-${String(hour).padStart(2, '0')}`;
    if (!slotExists('overdue', slotId)) {
      if (overdue.length > 0) {
        const message = `Ada ${overdue.length} peminjaman yang sudah terlambat dikembalikan!`;
        await addNotification(message, 'overdue', slotId);
        console.log('Scheduled overdue notification added for', slotId, message);
      } else {
        console.log('Scheduled overdue check at', slotId, 'found no overdue loans.');
      }
    } else {
      console.log('Overdue notification for', slotId, 'already exists today, skipping.');
    }
  }

  // Due-today trigger at 11:00
  if (hour === 11 && minute === 0) {
    const slotId = 'return-11';
    if (!slotExists('return', slotId)) {
      if (dueToday.length > 0) {
        const message = `Ada ${dueToday.length} peminjaman yang jatuh tempo hari ini`;
        await addNotification(message, 'return', slotId);
        console.log('Scheduled return-today notification added for', slotId, message);
      } else {
        console.log('Scheduled return check at 11:00 found no loans due today.');
      }
    } else {
      console.log('Return-today notification for 11:00 already exists today, skipping.');
    }
  }
}

// Single-run invocation
runScheduler().catch(console.error);

let intervalMs = parseInt(process.env.SCHEDULER_INTERVAL_MS || '0', 10);
if (!intervalMs || intervalMs <= 0) intervalMs = 60 * 60 * 1000;
let intervalId = null;

const _now = new Date();
const nextHour = new Date(_now);
nextHour.setHours(_now.getHours() + 1, 0, 0, 0);
const msUntilNextHour = nextHour.getTime() - _now.getTime();
console.log(`Starting scheduler loop, interval ${intervalMs}ms; first repeat in ${msUntilNextHour}ms`);
setTimeout(() => {
  intervalId = setInterval(() => {
    try {
      runScheduler().catch(console.error);
    } catch (e) {
      console.error('Scheduler iteration failed', e);
    }
  }, intervalMs);
}, Math.max(0, msUntilNextHour));

function shutdown() {
  console.log('Shutting down scheduler...');
  if (intervalId) clearInterval(intervalId);
  pool.end().finally(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
