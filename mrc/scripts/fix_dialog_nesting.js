const fs = require('fs');
const path = require('path');

// 1. pengembalian/page.tsx
const pengPath = path.join(__dirname, '..', 'app', 'pengembalian', 'page.tsx');
let pengLines = fs.readFileSync(pengPath, 'utf-8').split(/\r?\n/);

console.log('Line 622 in peng:', pengLines[621]); // 0-indexed: 621 is line 622
console.log('Line 776 in peng:', pengLines[775]); // 0-indexed: 775 is line 776
console.log('Line 780 in peng:', pengLines[779]); // 0-indexed: 779 is line 780

if (pengLines[621].includes(')}') && pengLines[775].includes('</AlertDialog>')) {
  const part1 = pengLines.slice(0, 622);
  const tableClose = [
    '            </TableBody>',
    '          </Table>',
    '        </div>',
    '      </div>',
    ''
  ];
  let dialogLines = pengLines.slice(622, 776).map(line => 
    line.replace('<AlertDialogDescription>', '<AlertDialogDescription asChild>')
  );
  const part2 = pengLines.slice(780); // from empty line 781 to end

  const newPeng = [...part1, ...tableClose, ...dialogLines, ...part2].join('\n');
  fs.writeFileSync(pengPath, newPeng, 'utf-8');
  console.log('Successfully restructured pengembalian/page.tsx');
}

// 2. riwayat/page.tsx
const riwPath = path.join(__dirname, '..', 'app', 'riwayat', 'page.tsx');
let riwLines = fs.readFileSync(riwPath, 'utf-8').split(/\r?\n/);

console.log('Line 750 in riw:', riwLines[749]); // 0-indexed: 749 is line 750
console.log('Line 925 in riw:', riwLines[924]); // 0-indexed: 924 is line 925
console.log('Line 928 in riw:', riwLines[927]); // 0-indexed: 927 is line 928

if (riwLines[749].includes(')}') && riwLines[924].includes('</AlertDialog>')) {
  const part1 = riwLines.slice(0, 750);
  const tableClose = [
    '            </TableBody>',
    '          </Table>',
    '        </div>',
    ''
  ];
  let dialogLines = riwLines.slice(750, 925).map(line =>
    line.replace('<AlertDialogDescription>', '<AlertDialogDescription asChild>')
  );
  const part2 = riwLines.slice(928); // from line 929 to end

  const newRiw = [...part1, ...tableClose, ...dialogLines, ...part2].join('\n');
  fs.writeFileSync(riwPath, newRiw, 'utf-8');
  console.log('Successfully restructured riwayat/page.tsx');
}
