const fs = require('fs');
let code = fs.readFileSync('src/components/AuthScreen.tsx', 'utf8');

// 1. Update useMemo to return precalculated animation properties
code = code.replace(
  /const floatingImages = useMemo\(\(\) => \{\n\s*if \(\!images \|\| images\.length === 0\) return \[\];\n\s*const shuffled = \[\.\.\.images\]\.sort\(\(\) => 0\.5 - Math\.random\(\)\);\n\s*return shuffled\.slice\(0, 15\);\n\s*\}, \[images\]\);/,
  `const floatingImages = useMemo(() => {
    if (!images || images.length === 0) return [];
    const shuffled = [...images].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 15);
    
    // Pre-calculate random values so they don't change on every render (typing)
    return selected.map((img, i) => {
      return {
        img,
        id: img.id + i,
        size: 30 + i * 5 + Math.random() * 20,
        startX: 10 + Math.random() * 80,
        startY: 10 + Math.random() * 80,
        duration: 30 + Math.random() * 20,
        moveX: (Math.random() > 0.5 ? 1 : -1) * (50 + Math.random() * 100),
        moveY: (Math.random() > 0.5 ? 1 : -1) * (50 + Math.random() * 100),
        opacity: 0.2 + Math.random() * 0.2,
      };
    });
  }, [images]);`
);

// 2. Update rendering map to use the pre-calculated properties
code = code.replace(
  /\{floatingImages\.map\(\(img, i\) => \{\n\s*const size = 30 \+ i \* 5 \+ Math\.random\(\) \* 20;\n\s*const startX = 10 \+ Math\.random\(\) \* 80;\n\s*const startY = 10 \+ Math\.random\(\) \* 80;\n\n\s*const duration = 30 \+ Math\.random\(\) \* 20;\n\s*const moveX =\n\s*\(Math\.random\(\) > 0\.5 \? 1 : -1\) \* \(50 \+ Math\.random\(\) \* 100\);\n\s*const moveY =\n\s*\(Math\.random\(\) > 0\.5 \? 1 : -1\) \* \(50 \+ Math\.random\(\) \* 100\);\n\n\s*return \(\n\s*<motion\.div\n\s*key=\{img\.id \+ i\}\n\s*className="absolute rounded-full border border-white\/10 overflow-hidden shadow-\[0_0_25px_rgba\(255,255,255,0\.05\)\] bg-neutral-900\/50 backdrop-blur-sm"\n\s*style=\{\{\n\s*width: size,\n\s*height: size,\n\s*top: \`\$\{startY\}%\`,\n\s*left: \`\$\{startX\}%\`,\n\s*opacity: 0\.2 \+ Math\.random\(\) \* 0\.2,\n\s*\}\}\n\s*animate=\{\{\n\s*x: \[0, moveX, moveX \* 0\.5, 0\],\n\s*y: \[0, moveY, -moveY \* 0\.5, 0\],\n\s*rotate: \[0, 90, 180, 360\],\n\s*\}\}\n\s*transition=\{\{\n\s*duration: duration,\n\s*repeat: Infinity,\n\s*ease: "linear",\n\s*\}\}\n\s*>\n\s*<img\n\s*src=\{img\.directUrl\}\n\s*alt=""\n\s*className="w-full h-full object-cover mix-blend-luminosity brightness-150"\n\s*loading="lazy"\n\s*\/>\n\s*<\/motion\.div>\n\s*\);\n\s*\}\)\}/m,
  `{floatingImages.map((bubble) => (
            <motion.div
              key={bubble.id}
              className="absolute rounded-full border border-white/10 overflow-hidden shadow-[0_0_25px_rgba(255,255,255,0.05)] bg-neutral-900/50 backdrop-blur-sm"
              style={{
                width: bubble.size,
                height: bubble.size,
                top: \`\${bubble.startY}%\`,
                left: \`\${bubble.startX}%\`,
                opacity: bubble.opacity,
              }}
              animate={{
                x: [0, bubble.moveX, bubble.moveX * 0.5, 0],
                y: [0, bubble.moveY, -bubble.moveY * 0.5, 0],
                rotate: [0, 90, 180, 360],
              }}
              transition={{
                duration: bubble.duration,
                repeat: Infinity,
                ease: "linear",
              }}
            >
              <img
                src={bubble.img.directUrl}
                alt=""
                className="w-full h-full object-cover mix-blend-luminosity brightness-150"
                loading="lazy"
              />
            </motion.div>
          ))}`
);

fs.writeFileSync('src/components/AuthScreen.tsx', code);
