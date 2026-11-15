const fs = require('fs');
const path = require('path');

const bookingPath = path.join(__dirname, '..', 'app', 'booking', 'page.tsx');
let c = fs.readFileSync(bookingPath, 'utf-8');

c = c.replace(
  /const totalPending = bookings\.filter\(\(b: any\) => b\.status === 'pending'\)\.length;/,
  `const safeBookings = Array.isArray(bookings) ? bookings : [];\n    const totalPending = safeBookings.filter((b: any) => b.status === 'pending').length;`
);

c = c.replace(
  /const totalAccepted = bookings\.filter\(\(b: any\) => b\.status === 'accepted'\)\.length;/,
  `const totalAccepted = safeBookings.filter((b: any) => b.status === 'accepted').length;`
);

c = c.replace(
  /const totalRejected = bookings\.filter\(\(b: any\) => b\.status === 'rejected'\)\.length;/,
  `const totalRejected = safeBookings.filter((b: any) => b.status === 'rejected').length;`
);

c = c.replace(
  /let filtered = bookings;/,
  `let filtered = safeBookings;`
);

c = c.replace(
  /items\.find\(\(itm: any\) => itm\.id === it\.itemId\)/g,
  `(Array.isArray(items) ? items : []).find((itm: any) => itm.id === it.itemId)`
);

const oldUseEffect = /useEffect\(\(\) => \{\s*setIsLoading\(true\);\s*Promise\.all\(\[\s*fetch\("\/api\/booking"\)\.then\(\(res\) => res\.json\(\)\),\s*fetch\("\/api\/items"\)\.then\(\(res\) => res\.json\(\)\),\s*fetch\("\/api\/borrowers"\)\.then\(\(res\) => res\.json\(\)\),\s*\]\)[\s\S]*?\.finally\(\(\) => setIsLoading\(false\)\);\s*\}, \[refresh\]\);/m;

const newUseEffect = `useEffect(() => {
        if (!auth.isAuthenticated()) {
            router.push("/login");
            return;
        }
        if (!auth.canAccess("/booking")) {
            toast.error("Akses Ditolak: Role Operator hanya dapat mengakses Dashboard, Peminjaman, dan Pengembalian.");
            router.push("/");
            return;
        }
    }, [router]);

    useEffect(() => {
        setIsLoading(true);
        Promise.all([
            fetch("/api/booking").then((res) => res.json()).catch(() => []),
            fetch("/api/items").then((res) => res.json()).catch(() => []),
            fetch("/api/borrowers").then((res) => res.json()).catch(() => []),
        ])
            .then(([booking, items, borrowers]) => {
                setBookings(Array.isArray(booking) ? booking : []);
                setItems(Array.isArray(items) ? items : []);
                setBorrowers(Array.isArray(borrowers) ? borrowers : []);
            })
            .catch(() => {
                setBookings([]);
                setItems([]);
                setBorrowers([]);
            })
            .finally(() => setIsLoading(false));
    }, [refresh]);`;

c = c.replace(oldUseEffect, newUseEffect);

fs.writeFileSync(bookingPath, c, 'utf-8');
console.log('Successfully updated booking/page.tsx with array guards and auth checks.');
