const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /<AuthScreen \/>/,
  `<AuthScreen images={images} />`
);

fs.writeFileSync('src/App.tsx', code);
