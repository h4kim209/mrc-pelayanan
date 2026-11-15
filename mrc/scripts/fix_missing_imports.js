const fs = require('fs');
const path = require('path');

// 1. pengembalian/page.tsx
const pengPath = path.join(__dirname, '..', 'app', 'pengembalian', 'page.tsx');
let peng = fs.readFileSync(pengPath, 'utf-8');
if (!peng.includes('import WebcamCapture')) {
  peng = peng.replace(
    'import Loading from "@/components/ui/loading"',
    'import Loading from "@/components/ui/loading"\nimport WebcamCapture from "@/components/ui/webcam-capture"'
  );
  fs.writeFileSync(pengPath, peng, 'utf-8');
  console.log('Added WebcamCapture import to pengembalian/page.tsx');
}

// 2. riwayat/page.tsx
const riwPath = path.join(__dirname, '..', 'app', 'riwayat', 'page.tsx');
let riw = fs.readFileSync(riwPath, 'utf-8');
if (!riw.includes('import { toast }')) {
  riw = riw.replace(
    'import { useRouter } from "next/navigation";',
    'import { useRouter } from "next/navigation";\nimport { toast } from "sonner";'
  );
  fs.writeFileSync(riwPath, riw, 'utf-8');
  console.log('Added toast import to riwayat/page.tsx');
}

// 3. analisis/AnalisisCharts.tsx
const analPath = path.join(__dirname, '..', 'app', 'analisis', 'AnalisisCharts.tsx');
let anal = fs.readFileSync(analPath, 'utf-8');
if (!anal.includes('from "react"')) {
  anal = anal.replace(
    '"use client";',
    '"use client";\n\nimport { useEffect, useState } from "react";'
  );
  fs.writeFileSync(analPath, anal, 'utf-8');
  console.log('Added React imports to AnalisisCharts.tsx');
}
