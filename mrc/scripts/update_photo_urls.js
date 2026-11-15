const fs = require('fs');
const path = require('path');

function replaceUploadsUrl(filePath) {
  if (!fs.existsSync(filePath)) return;
  let c = fs.readFileSync(filePath, 'utf-8');
  c = c.replace(/src=\{(detailLoan\.(borrowPhoto|returnPhoto))\}/g, 'src={$1?.replace("/uploads/captures/", "/api/captures/")}');
  c = c.replace(/href=\{(detailLoan\.(borrowPhoto|returnPhoto))\}/g, 'href={$1?.replace("/uploads/captures/", "/api/captures/")}');
  c = c.replace(/src=\{(loan\.(borrowPhoto|returnPhoto))\}/g, 'src={$1?.replace("/uploads/captures/", "/api/captures/")}');
  fs.writeFileSync(filePath, c, 'utf-8');
  console.log('Updated URL replacement in', path.basename(filePath));
}

replaceUploadsUrl(path.join(__dirname, '..', 'app', 'pengembalian', 'page.tsx'));
replaceUploadsUrl(path.join(__dirname, '..', 'app', 'riwayat', 'page.tsx'));
replaceUploadsUrl(path.join(__dirname, '..', 'app', 'print', 'bast', 'page.tsx'));
