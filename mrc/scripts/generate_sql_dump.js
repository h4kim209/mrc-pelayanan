const fs = require('fs');
const path = require('path');

const dbDir = path.join(__dirname, '..', 'database');
const outputFile = path.join(__dirname, '..', '..', 'mrc_database.sql');

function escapeSql(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return val;
  if (typeof val === 'boolean') return val ? 1 : 0;
  if (typeof val === 'object') {
    // stringify JSON and escape
    const jsonStr = JSON.stringify(val);
    return `'${jsonStr.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  }
  const str = String(val);
  return `'${str.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function readJsonFile(filename, defaultVal = []) {
  const filePath = path.join(dbDir, filename);
  if (!fs.existsSync(filePath)) return defaultVal;
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Error reading ${filename}:`, e.message);
    return defaultVal;
  }
}

let sql = `-- ============================================================
-- MRC Database SQL Dump (MySQL / phpMyAdmin Compatible)
-- Generated for aaPanel & MySQL Server
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- Table structure for borrowers
-- ------------------------------------------------------------
DROP TABLE IF EXISTS \`borrowers\`;
CREATE TABLE \`borrowers\` (
  \`id\` VARCHAR(100) NOT NULL,
  \`name\` VARCHAR(255) NOT NULL,
  \`nip\` VARCHAR(100) DEFAULT '',
  \`officerId\` VARCHAR(100) DEFAULT '',
  \`rfid\` VARCHAR(100) DEFAULT '',
  \`phone\` VARCHAR(50) DEFAULT '',
  \`gender\` VARCHAR(10) DEFAULT 'L',
  \`createdAt\` VARCHAR(50) DEFAULT NULL,
  \`updatedAt\` VARCHAR(50) DEFAULT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`idx_rfid\` (\`rfid\`),
  KEY \`idx_nip\` (\`nip\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table structure for items
-- ------------------------------------------------------------
DROP TABLE IF EXISTS \`items\`;
CREATE TABLE \`items\` (
  \`id\` VARCHAR(100) NOT NULL,
  \`name\` VARCHAR(255) NOT NULL,
  \`category\` VARCHAR(100) DEFAULT '',
  \`description\` TEXT DEFAULT NULL,
  \`icon\` VARCHAR(100) DEFAULT NULL,
  \`image\` LONGTEXT DEFAULT NULL,
  \`items\` LONGTEXT DEFAULT NULL, -- Stores array of ItemSerial as JSON
  \`createdAt\` VARCHAR(50) DEFAULT NULL,
  \`updatedAt\` VARCHAR(50) DEFAULT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`idx_category\` (\`category\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table structure for loans
-- ------------------------------------------------------------
DROP TABLE IF EXISTS \`loans\`;
CREATE TABLE \`loans\` (
  \`id\` VARCHAR(100) NOT NULL,
  \`borrowerId\` VARCHAR(100) NOT NULL,
  \`items\` LONGTEXT DEFAULT NULL, -- Stores array of LoanItem as JSON
  \`borrowDate\` VARCHAR(50) DEFAULT NULL,
  \`dueDate\` VARCHAR(50) DEFAULT NULL,
  \`returnDate\` VARCHAR(50) DEFAULT NULL,
  \`status\` VARCHAR(50) DEFAULT 'dipinjam',
  \`purpose\` TEXT DEFAULT NULL,
  \`notes\` TEXT DEFAULT NULL,
  \`createdAt\` VARCHAR(50) DEFAULT NULL,
  \`updatedAt\` VARCHAR(50) DEFAULT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`idx_borrowerId\` (\`borrowerId\`),
  KEY \`idx_status\` (\`status\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table structure for bookings
-- ------------------------------------------------------------
DROP TABLE IF EXISTS \`bookings\`;
CREATE TABLE \`bookings\` (
  \`id\` VARCHAR(100) NOT NULL,
  \`borrowerId\` VARCHAR(100) DEFAULT NULL,
  \`borrowerName\` VARCHAR(255) DEFAULT NULL,
  \`items\` LONGTEXT DEFAULT NULL, -- Stores array of booking items
  \`borrowDate\` VARCHAR(50) DEFAULT NULL,
  \`dueDate\` VARCHAR(50) DEFAULT NULL,
  \`status\` VARCHAR(50) DEFAULT 'pending',
  \`notes\` TEXT DEFAULT NULL,
  \`createdAt\` VARCHAR(50) DEFAULT NULL,
  \`updatedAt\` VARCHAR(50) DEFAULT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table structure for notifications
-- ------------------------------------------------------------
DROP TABLE IF EXISTS \`notifications\`;
CREATE TABLE \`notifications\` (
  \`id\` BIGINT NOT NULL,
  \`message\` TEXT NOT NULL,
  \`type\` VARCHAR(50) DEFAULT 'info',
  \`read\` TINYINT(1) DEFAULT 0,
  \`slot\` VARCHAR(50) DEFAULT NULL,
  \`timestamp\` VARCHAR(50) DEFAULT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`idx_read\` (\`read\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table structure for settings
-- ------------------------------------------------------------
DROP TABLE IF EXISTS \`settings\`;
CREATE TABLE \`settings\` (
  \`id\` INT NOT NULL DEFAULT 1,
  \`data\` LONGTEXT DEFAULT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

`;

console.log('Reading JSON database files...');

// 1. Borrowers
const borrowers = readJsonFile('borrowers.json', []);
console.log(`Exporting ${borrowers.length} borrowers...`);
if (borrowers.length > 0) {
  sql += `\n-- Dumping data for table borrowers\n`;
  for (const b of borrowers) {
    sql += `INSERT INTO \`borrowers\` (\`id\`, \`name\`, \`nip\`, \`officerId\`, \`rfid\`, \`phone\`, \`gender\`, \`createdAt\`, \`updatedAt\`) VALUES (${escapeSql(b.id)}, ${escapeSql(b.name)}, ${escapeSql(b.nip)}, ${escapeSql(b.officerId)}, ${escapeSql(b.rfid)}, ${escapeSql(b.phone)}, ${escapeSql(b.gender || 'L')}, ${escapeSql(b.createdAt)}, ${escapeSql(b.updatedAt)});\n`;
  }
}

// 2. Items
const items = readJsonFile('items.json', []);
console.log(`Exporting ${items.length} items...`);
if (items.length > 0) {
  sql += `\n-- Dumping data for table items\n`;
  for (const it of items) {
    sql += `INSERT INTO \`items\` (\`id\`, \`name\`, \`category\`, \`description\`, \`icon\`, \`image\`, \`items\`, \`createdAt\`, \`updatedAt\`) VALUES (${escapeSql(it.id)}, ${escapeSql(it.name)}, ${escapeSql(it.category)}, ${escapeSql(it.description)}, ${escapeSql(it.icon)}, ${escapeSql(it.image)}, ${escapeSql(it.items || [])}, ${escapeSql(it.createdAt)}, ${escapeSql(it.updatedAt)});\n`;
  }
}

// 3. Loans
const loans = readJsonFile('loans.json', []);
console.log(`Exporting ${loans.length} loans...`);
if (loans.length > 0) {
  sql += `\n-- Dumping data for table loans\n`;
  for (const l of loans) {
    sql += `INSERT INTO \`loans\` (\`id\`, \`borrowerId\`, \`items\`, \`borrowDate\`, \`dueDate\`, \`returnDate\`, \`status\`, \`purpose\`, \`notes\`, \`createdAt\`, \`updatedAt\`) VALUES (${escapeSql(l.id)}, ${escapeSql(l.borrowerId)}, ${escapeSql(l.items || [])}, ${escapeSql(l.borrowDate)}, ${escapeSql(l.dueDate)}, ${escapeSql(l.returnDate)}, ${escapeSql(l.status || 'dipinjam')}, ${escapeSql(l.purpose)}, ${escapeSql(l.notes)}, ${escapeSql(l.createdAt)}, ${escapeSql(l.updatedAt)});\n`;
  }
}

// 4. Bookings
const bookings = readJsonFile('bookings.json', []);
console.log(`Exporting ${bookings.length} bookings...`);
if (bookings.length > 0) {
  sql += `\n-- Dumping data for table bookings\n`;
  for (const bk of bookings) {
    sql += `INSERT INTO \`bookings\` (\`id\`, \`borrowerId\`, \`borrowerName\`, \`items\`, \`borrowDate\`, \`dueDate\`, \`status\`, \`notes\`, \`createdAt\`, \`updatedAt\`) VALUES (${escapeSql(bk.id)}, ${escapeSql(bk.borrowerId)}, ${escapeSql(bk.borrowerName)}, ${escapeSql(bk.items || [])}, ${escapeSql(bk.borrowDate)}, ${escapeSql(bk.dueDate)}, ${escapeSql(bk.status)}, ${escapeSql(bk.notes)}, ${escapeSql(bk.createdAt)}, ${escapeSql(bk.updatedAt)});\n`;
  }
}

// 5. Notifications
const notifications = readJsonFile('notifications.json', []);
console.log(`Exporting ${notifications.length} notifications...`);
if (notifications.length > 0) {
  sql += `\n-- Dumping data for table notifications\n`;
  // Limit to latest 500 notifications to keep SQL reasonable if too large
  const notifList = notifications.slice(0, 500);
  for (const n of notifList) {
    sql += `INSERT INTO \`notifications\` (\`id\`, \`message\`, \`type\`, \`read\`, \`slot\`, \`timestamp\`) VALUES (${escapeSql(n.id)}, ${escapeSql(n.message)}, ${escapeSql(n.type)}, ${escapeSql(n.read ? 1 : 0)}, ${escapeSql(n.slot)}, ${escapeSql(n.timestamp)});\n`;
  }
}

// 6. Settings
const settings = readJsonFile('settings.json', {});
console.log(`Exporting settings...`);
sql += `\n-- Dumping data for table settings\n`;
sql += `INSERT INTO \`settings\` (\`id\`, \`data\`) VALUES (1, ${escapeSql(settings)});\n`;

sql += `\nSET FOREIGN_KEY_CHECKS = 1;\n-- ================= Dump Completed =================\n`;

fs.writeFileSync(outputFile, sql, 'utf-8');
console.log(`Successfully generated SQL dump: ${outputFile}`);
