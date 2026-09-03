const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add auth import
code = code.replace(
  /} from "\.\/services\/firebase";/,
  `  auth,\n} from "./services/firebase";`
);

// 2. Add other imports
code = code.replace(
  /import { deleteTelegramMessage } from "\.\/services\/telegramService";/,
  `import { deleteTelegramMessage } from "./services/telegramService";\nimport { AuthScreen } from "./components/AuthScreen";\nimport { onAuthStateChanged, User, signOut } from "firebase/auth";`
);

// 3. Add states
code = code.replace(
  /export default function App\(\) {/,
  `export default function App() {\n  const [user, setUser] = useState<User | null>(null);\n  const [authLoading, setAuthLoading] = useState(true);`
);

// 4. Add auth listener to useEffect
code = code.replace(
  /useEffect\(\(\) => {/,
  `useEffect(() => {\n    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {\n      setUser(currentUser);\n      setAuthLoading(false);\n    });\n`
);

// 5. Update useEffect cleanup
code = code.replace(
  /return \(\) => {\n\s+unsubscribeImages\(\);\n\s+unsubscribeAlbums\(\);\n\s+};/,
  `return () => {\n      unsubscribeImages();\n      unsubscribeAlbums();\n      unsubscribeAuth();\n    };`
);

// Ensure we return AuthScreen if not authenticated
code = code.replace(
  /const totalSize = images\.reduce\(\(sum, img\) => sum \+ \(img\.fileSize \|\| 0\), 0\);/,
  `const totalSize = images.reduce((sum, img) => sum + (img.fileSize || 0), 0);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }
`
);

fs.writeFileSync('src/App.tsx', code);
