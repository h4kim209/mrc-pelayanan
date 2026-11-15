const fs = require('fs');
const path = require('path');

const routeFile = path.join(__dirname, '..', 'app', 'api', 'settings', 'route.ts');
let code = fs.readFileSync(routeFile, 'utf-8');

code = code.replace(
  `  admin: {
    username: "admin",
    password: "admin123"
  },`,
  `  admin: {
    username: "admin",
    password: "admin123"
  },
  operator: {
    username: "operator",
    password: "operator123"
  },`
);

code = code.replace(
  `    admin: {
      ...defaultSettings.admin,
      ...(input?.admin || {})
    },`,
  `    admin: {
      ...defaultSettings.admin,
      ...(input?.admin || {})
    },
    operator: {
      ...defaultSettings.operator,
      ...(input?.operator || {})
    },`
);

fs.writeFileSync(routeFile, code, 'utf-8');
console.log('route.ts updated with operator support');
