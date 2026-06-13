const fs = require('fs');
const ts = Date.now();

let sw = fs.readFileSync('sw.js', 'utf8');
sw = sw.replace(/const CACHE = 'kimanzi-v\d+';/, `const CACHE = 'kimanzi-${ts}';`);
fs.writeFileSync('sw.js', sw);

console.log(`SW cache bumped to kimanzi-${ts}`);
