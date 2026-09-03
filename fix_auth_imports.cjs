const fs = require('fs');
let code = fs.readFileSync('src/components/AuthScreen.tsx', 'utf8');

if (!code.includes("import { GalleryImage }")) {
  code = code.replace(
    /import \{ getAuth/,
    `import { GalleryImage } from '../types';\nimport { getAuth`
  );
}

if (!code.includes("import { useMemo }")) {
  code = code.replace(
    /import React, \{ useState \} from 'react';/,
    `import React, { useState, useMemo } from 'react';`
  );
}

fs.writeFileSync('src/components/AuthScreen.tsx', code);
