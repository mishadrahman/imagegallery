import React, { useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { GalleryImage } from '../types';

interface LoadingSplashProps {
  images: GalleryImage[];
  onComplete: () => void;
}

export const LoadingSplash: React.FC<LoadingSplashProps> = ({ images, onComplete }) => {
  // Unmount splash screen after 3.5 seconds
  useEffect(() => {
    const timer = setTimeout(onComplete, 3500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  const floatingImages = useMemo(() => {
    if (!images || images.length === 0) return [];
    const shuffled = [...images].sort(() => 0.5 - Math.random());
    // Pick top 15 images
    return shuffled.slice(0, 15);
  }, [images]);

  return (
    <motion.div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-950 overflow-hidden"
      exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
    >
      {/* Floating Images */}
      {floatingImages.map((img, i) => {
        const size = 50 + Math.random() * 70; // 50 to 120 px
        // Random start positions
        const startX = 10 + (Math.random() * 80); // 10% to 90%
        const startY = 10 + (Math.random() * 80);
        
        // Move randomly
        const moveX = (Math.random() - 0.5) * 400; // random drift X
        const moveY = (Math.random() - 0.5) * 400; // random drift Y
        
        return (
          <motion.div
            key={img.id + i}
            className="absolute rounded-full overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.5)] border-2 border-neutral-800"
            style={{ width: size, height: size, top: `${startY}%`, left: `${startX}%` }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ 
              opacity: [0, 1, 1, 0], 
              scale: [0, 1, 1.1, 0.8],
              x: [0, moveX],
              y: [0, moveY],
            }}
            transition={{ 
              duration: 3.2, 
              ease: "easeInOut",
              delay: Math.random() * 0.4 
            }}
          >
            <img src={img.directUrl} alt="" className="w-full h-full object-cover" />
          </motion.div>
        );
      })}

      {/* Logo / Text overlay in center */}
      <motion.div 
        className="relative z-10 flex flex-col items-center bg-neutral-950/60 p-8 rounded-3xl backdrop-blur-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-500/50 flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-4">
          <span className="text-3xl">☁️</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">CloudPic</h1>
        <p className="text-indigo-400 mt-2 text-xs font-semibold tracking-widest uppercase flex items-center gap-2">
           <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
           Loading Studio...
        </p>
      </motion.div>
    </motion.div>
  );
};
