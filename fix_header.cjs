const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

// 1. Add LogOut import
code = code.replace(
  /import { Search, X, Images, UploadCloud, Layers, Plus, Cpu } from 'lucide-react';/,
  `import { Search, X, Images, UploadCloud, Layers, Plus, Cpu, LogOut } from 'lucide-react';\nimport { signOut } from 'firebase/auth';\nimport { auth } from '../services/firebase';`
);

// 2. Add logout button near the Upload button on Desktop
code = code.replace(
  /<button\s+onClick=\{\(\) => setActiveTab\('upload'\)\}\s+className="flex items-center gap-1\.5 px-3 py-1\.5 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 text-white text-xs font-semibold shadow-md shadow-indigo-600\/30 hover:opacity-90 transition-opacity"\s+>\s+<Plus className="w-3\.5 h-3\.5" \/>\s+<span className="hidden sm:inline">Upload<\/span>\s+<\/button>/,
  `<button
                onClick={() => setActiveTab('upload')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 hover:opacity-90 transition-opacity"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Upload</span>
              </button>
              <button
                onClick={() => signOut(auth)}
                className="p-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-red-400 hover:text-red-300 hover:bg-neutral-800"
                aria-label="Log Out"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>`
);

// 3. Optional: Add a subtle logout button on mobile nav if needed, but since it's a fixed grid, let's keep it in the top header which is still accessible. Wait, mobile nav hides the header? No, header is top sticky on mobile. So logout is available on top.

fs.writeFileSync('src/components/Header.tsx', code);
