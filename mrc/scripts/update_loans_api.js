const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'app', 'api', 'loans', 'route.ts');
let code = fs.readFileSync(file, 'utf-8');

// 1. in formatLoan
code = code.replace(
  '    notes: row.notes || undefined,\n    createdAt: row.createdAt || \'\',',
  '    notes: row.notes || undefined,\n    borrowPhoto: row.borrowPhoto || undefined,\n    returnPhoto: row.returnPhoto || undefined,\n    createdAt: row.createdAt || \'\','
);

// 2. in POST query
code = code.replace(
  '`INSERT INTO loans (id, borrowerId, items, borrowDate, dueDate, returnDate, status, purpose, notes, createdAt, updatedAt)\n       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`',
  '`INSERT INTO loans (id, borrowerId, items, borrowDate, dueDate, returnDate, status, purpose, notes, borrowPhoto, returnPhoto, createdAt, updatedAt)\n       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`'
);

code = code.replace(
  '        newLoan.purpose || null,\n        newLoan.notes || null,\n        newLoan.createdAt,',
  '        newLoan.purpose || null,\n        newLoan.notes || null,\n        newLoan.borrowPhoto || null,\n        newLoan.returnPhoto || null,\n        newLoan.createdAt,'
);

// 3. in PUT query
code = code.replace(
  '`UPDATE loans \n       SET borrowerId = ?, items = ?, borrowDate = ?, dueDate = ?, returnDate = ?, status = ?, purpose = ?, notes = ?, updatedAt = ?\n       WHERE id = ?`',
  '`UPDATE loans \n       SET borrowerId = ?, items = ?, borrowDate = ?, dueDate = ?, returnDate = ?, status = ?, purpose = ?, notes = ?, borrowPhoto = ?, returnPhoto = ?, updatedAt = ?\n       WHERE id = ?`'
);

code = code.replace(
  '        updatedLoan.purpose || null,\n        updatedLoan.notes || null,\n        updatedLoan.updatedAt,\n        updatedLoan.id,',
  '        updatedLoan.purpose || null,\n        updatedLoan.notes || null,\n        updatedLoan.borrowPhoto || null,\n        updatedLoan.returnPhoto || null,\n        updatedLoan.updatedAt,\n        updatedLoan.id,'
);

fs.writeFileSync(file, code, 'utf-8');
console.log('loans/route.ts updated with borrowPhoto and returnPhoto');
