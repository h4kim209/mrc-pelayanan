const fs = require('fs');
const path = require('path');

const bookingFile = path.join(__dirname, '..', 'app', 'booking', 'page.tsx');
let booking = fs.readFileSync(bookingFile, 'utf-8');
booking = booking.replace(
  '<TableCell>{formatDate(b.startDate)}</TableCell>',
  '<TableCell className="whitespace-nowrap text-sm">{formatDate(b.startDate || b.borrowDate || b.createdAt)}</TableCell>'
);
fs.writeFileSync(bookingFile, booking, 'utf-8');
console.log('booking/page.tsx updated successfully!');
