const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

code = code.replace(
  /\} from "lucide-react";/,
  `  LogOut,\n} from "lucide-react";\nimport { signOut } from "firebase/auth";\nimport { auth } from "../services/firebase";`
);

fs.writeFileSync('src/components/Header.tsx', code);
