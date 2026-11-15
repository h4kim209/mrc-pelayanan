const fs = require('fs');
const path = require('path');

const dumpFile = path.join(__dirname, '..', 'scripts', 'generate_sql_dump.js');
let dump = fs.readFileSync(dumpFile, 'utf-8');

dump = dump.replace(
  `  \`notes\` TEXT DEFAULT NULL,
  \`createdAt\` VARCHAR(50) DEFAULT NULL,`,
  `  \`notes\` TEXT DEFAULT NULL,
  \`borrowPhoto\` VARCHAR(255) DEFAULT NULL,
  \`returnPhoto\` VARCHAR(255) DEFAULT NULL,
  \`createdAt\` VARCHAR(50) DEFAULT NULL,`
);

dump = dump.replace(
  `sql += \`INSERT INTO \\\`loans\\\` (\\\`id\\\`, \\\`borrowerId\\\`, \\\`items\\\`, \\\`borrowDate\\\`, \\\`dueDate\\\`, \\\`returnDate\\\`, \\\`status\\\`, \\\`purpose\\\`, \\\`notes\\\`, \\\`createdAt\\\`, \\\`updatedAt\\\`) VALUES (\${escapeSql(l.id)}, \${escapeSql(l.borrowerId)}, \${escapeSql(l.items)}, \${escapeSql(l.borrowDate)}, \${escapeSql(l.dueDate)}, \${escapeSql(l.returnDate)}, \${escapeSql(l.status)}, \${escapeSql(l.purpose)}, \${escapeSql(l.notes)}, \${escapeSql(l.createdAt)}, \${escapeSql(l.updatedAt)} );\\n\`;`,
  `sql += \`INSERT INTO \\\`loans\\\` (\\\`id\\\`, \\\`borrowerId\\\`, \\\`items\\\`, \\\`borrowDate\\\`, \\\`dueDate\\\`, \\\`returnDate\\\`, \\\`status\\\`, \\\`purpose\\\`, \\\`notes\\\`, \\\`borrowPhoto\\\`, \\\`returnPhoto\\\`, \\\`createdAt\\\`, \\\`updatedAt\\\`) VALUES (\${escapeSql(l.id)}, \${escapeSql(l.borrowerId)}, \${escapeSql(l.items)}, \${escapeSql(l.borrowDate)}, \${escapeSql(l.dueDate)}, \${escapeSql(l.returnDate)}, \${escapeSql(l.status)}, \${escapeSql(l.purpose)}, \${escapeSql(l.notes)}, \${escapeSql(l.borrowPhoto)}, \${escapeSql(l.returnPhoto)}, \${escapeSql(l.createdAt)}, \${escapeSql(l.updatedAt)} );\\n\`;`
);

fs.writeFileSync(dumpFile, dump, 'utf-8');
console.log('generate_sql_dump.js updated');
