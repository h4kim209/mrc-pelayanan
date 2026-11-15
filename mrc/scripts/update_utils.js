const fs = require('fs');
const path = require('path');

const utilsFile = path.join(__dirname, '..', 'lib', 'utils.ts');
let utils = fs.readFileSync(utilsFile, 'utf-8');

const newFormatDate = `export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "-";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";
  try {
    return new Intl.DateTimeFormat("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(d);
  } catch (e) {
    return "-";
  }
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "-";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";
  try {
    return new Intl.DateTimeFormat("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch (e) {
    return "-";
  }
}

export function isOverdue(dueDate: string | null | undefined): boolean {
  if (!dueDate) return false;
  const due = new Date(dueDate);
  if (isNaN(due.getTime())) return false;
  const now = new Date();
  due.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return due < now;
}

export function getDaysUntilDue(dueDate: string | null | undefined): number {
  if (!dueDate) return 0;
  const due = new Date(dueDate);
  if (isNaN(due.getTime())) return 0;
  const now = new Date();
  const diffTime = due.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}`;

// Replace lines from export function formatDate to getDaysUntilDue
const regex = /export function formatDate[\s\S]*?return Math\.ceil\(diffTime \/ \(1000 \* 60 \* 60 \* 24\)\)\s*\}/;
if (regex.test(utils)) {
  utils = utils.replace(regex, newFormatDate);
  fs.writeFileSync(utilsFile, utils, 'utf-8');
  console.log('utils.ts updated successfully with bulletproof date handlers!');
} else {
  console.log('Regex did not match utils.ts');
}
