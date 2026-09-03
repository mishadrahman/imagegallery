const fs = require('fs');
let code = fs.readFileSync('src/components/AuthScreen.tsx', 'utf8');

// 1. Add GalleryImage import
code = code.replace(
  /import \{ Mail, Lock, Loader2, ArrowRight, Image as ImageIcon \} from 'lucide-react';/,
  `import { Mail, Lock, Loader2, ArrowRight, Image as ImageIcon } from 'lucide-react';\nimport { GalleryImage } from '../types';\nimport { useMemo } from 'react';`
);

// 2. Change signature
code = code.replace(
  /export const AuthScreen: React\.FC = \(\) => \{/,
  `interface AuthScreenProps {\n  images: GalleryImage[];\n}\n\nexport const AuthScreen: React.FC<AuthScreenProps> = ({ images }) => {`
);

// 3. Add floating images logic
code = code.replace(
  /const handleSubmit = async \(e: React\.FormEvent\) => \{/,
  `const floatingImages = useMemo(() => {
    if (!images || images.length === 0) return [];
    const shuffled = [...images].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 15);
  }, [images]);

  const handleSubmit = async (e: React.FormEvent) => {`
);

// 4. Add floating images render logic inside the background div
code = code.replace(
  /className="absolute -bottom-\[20%\] -right-\[10%\] w-\[60vw\] h-\[60vw\] rounded-full bg-fuchsia-900\/20 blur-\[120px\]"\n\s*\/>/,
  `className="absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-fuchsia-900/20 blur-[120px]"
        />
        
        {/* Floating Image Bubbles */}
        {floatingImages.map((img, i) => {
          const size = 60 + (i * 15) + (Math.random() * 30);
          const startX = 10 + (Math.random() * 80);
          const startY = 10 + (Math.random() * 80);
          
          const duration = 30 + (Math.random() * 20); 
          const moveX = (Math.random() > 0.5 ? 1 : -1) * (50 + Math.random() * 100);
          const moveY = (Math.random() > 0.5 ? 1 : -1) * (50 + Math.random() * 100);

          return (
            <motion.div
              key={img.id + i}
              className="absolute rounded-full border border-white/10 overflow-hidden shadow-[0_0_25px_rgba(255,255,255,0.05)] bg-neutral-900/50 backdrop-blur-sm"
              style={{ 
                width: size, 
                height: size, 
                top: \`\${startY}%\`, 
                left: \`\${startX}%\`, 
                opacity: 0.2 + (Math.random() * 0.2)
              }}
              animate={{
                x: [0, moveX, moveX * 0.5, 0],
                y: [0, moveY, -moveY * 0.5, 0],
                rotate: [0, 90, 180, 360]
              }}
              transition={{
                duration: duration,
                repeat: Infinity,
                ease: "linear"
              }}
            >
              <img 
                src={img.directUrl} 
                alt="" 
                className="w-full h-full object-cover mix-blend-luminosity brightness-150" 
                loading="lazy"
              />
            </motion.div>
          );
        })}`
);

fs.writeFileSync('src/components/AuthScreen.tsx', code);
