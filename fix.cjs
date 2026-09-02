const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(/<\/footer>\s*<\/div>\s*\);\s*}/g, '</footer></div></div>);}');
fs.writeFileSync('src/App.tsx', code);
