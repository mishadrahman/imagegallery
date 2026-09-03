const fs = require('fs');
let code = fs.readFileSync('src/components/AuthScreen.tsx', 'utf8');

code = `import { GalleryImage } from '../types';\nimport { useMemo } from 'react';\n` + code;

fs.writeFileSync('src/components/AuthScreen.tsx', code);
