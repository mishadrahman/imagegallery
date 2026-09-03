const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

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
