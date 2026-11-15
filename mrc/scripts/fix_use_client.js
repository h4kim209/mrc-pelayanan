const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, '..', 'app', 'analisis', 'AnalisisCharts.tsx'),
  path.join(__dirname, '..', 'app', 'booking', 'page.tsx'),
  path.join(__dirname, '..', 'app', 'whatsapp', 'page.tsx'),
];

for (const fp of files) {
  if (fs.existsSync(fp)) {
    let c = fs.readFileSync(fp, 'utf-8');
    // Remove all "use client"; occurrences
    c = c.replace(/["']use client["'];?\r?\n?/g, '');
    // Put "use client"; at the very top
    c = '"use client";\n\n' + c.trimStart();
    fs.writeFileSync(fp, c, 'utf-8');
    console.log('Fixed "use client" in', path.basename(fp));
  }
}
