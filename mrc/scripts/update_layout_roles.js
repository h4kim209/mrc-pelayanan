const fs = require('fs');
const path = require('path');

// 1. Update sidebar.tsx
const sidebarPath = path.join(__dirname, '..', 'components', 'layout', 'sidebar.tsx');
let sidebar = fs.readFileSync(sidebarPath, 'utf-8');

sidebar = sidebar.replace(
  '{navigation.map((item, idx) => {',
  `{navigation.filter((item) => {
            if (user?.role === "operator") {
              return ["/", "/peminjaman", "/pengembalian"].includes(item.href);
            }
            return true;
          }).map((item, idx) => {`
);

sidebar = sidebar.replace(
  `<div className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">MRC Admin</div>`,
  `<div className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.name || "Pengguna"}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={\`inline-block text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded \${
                  user?.role === 'operator'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
                }\`}>
                  {user?.role === 'operator' ? 'Operator' : 'Admin'}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 truncate">@{user?.username}</span>
              </div>`
);

fs.writeFileSync(sidebarPath, sidebar, 'utf-8');
console.log('sidebar.tsx updated');

// 2. Update navbar.tsx
const navbarPath = path.join(__dirname, '..', 'components', 'layout', 'navbar.tsx');
let navbar = fs.readFileSync(navbarPath, 'utf-8');

navbar = navbar.replace(
  '{navigation.map((item) => {',
  `{navigation.filter((item) => {
                if (user?.role === "operator") {
                  return ["/", "/peminjaman", "/pengembalian"].includes(item.href);
                }
                return true;
              }).map((item) => {`
);

// also for mobile dropdown in navbar
navbar = navbar.replace(
  '{navigation.map((item) => {',
  `{navigation.filter((item) => {
                if (user?.role === "operator") {
                  return ["/", "/peminjaman", "/pengembalian"].includes(item.href);
                }
                return true;
              }).map((item) => {`
);

fs.writeFileSync(navbarPath, navbar, 'utf-8');
console.log('navbar.tsx updated');

// 3. Update mobile-nav.tsx
const mobileNavPath = path.join(__dirname, '..', 'components', 'layout', 'mobile-nav.tsx');
let mobileNav = fs.readFileSync(mobileNavPath, 'utf-8');

mobileNav = mobileNav.replace(
  '{navigation.map((item, idx) => {',
  `{navigation.filter((item) => {
            if (user?.role === "operator") {
              return ["/", "/peminjaman", "/pengembalian"].includes(item.href);
            }
            return true;
          }).map((item, idx) => {`
);

mobileNav = mobileNav.replace(
  `<div className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">MRC Admin</div>`,
  `<div className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.name || "Pengguna"}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={\`inline-block text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded \${
                  user?.role === 'operator'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
                }\`}>
                  {user?.role === 'operator' ? 'Operator' : 'Admin'}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 truncate">@{user?.username}</span>
              </div>`
);

fs.writeFileSync(mobileNavPath, mobileNav, 'utf-8');
console.log('mobile-nav.tsx updated');
