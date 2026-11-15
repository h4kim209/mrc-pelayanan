const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'app', 'peminjam', 'page.tsx');
let c = fs.readFileSync(file, 'utf-8');
c = c.replace(
  'import { formatDate } from "@/lib/utils"',
  'import { formatDate, cn } from "@/lib/utils"'
);
fs.writeFileSync(file, c, 'utf-8');
console.log('Import fixed successfully');
