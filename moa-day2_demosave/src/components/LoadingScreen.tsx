import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface LoadingScreenProps {
  onComplete: () => void;
  logoUrl?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  onComplete,
  logoUrl = '/drawing1.png'
}) => {
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [visible, setVisible] = useState(true);

  const onCompleteRef = React.useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    // Smooth progress sweep from 0% to 100% over 2.4 seconds
    // Mandatory to show on every startup and refresh per master brief
    const startTime = performance.now();
    const duration = 2400;
    let animationFrameId: number;

    const animateProgress = (now: number) => {
      const elapsed = now - startTime;
      const rawProgress = Math.min(elapsed / duration, 1);
      // Smooth cubic-bezier ease curve
      const easedProgress = 1 - Math.pow(1 - rawProgress, 2.5);
      const currentPct = Math.min(100, Math.round(easedProgress * 100));
      setProgress(currentPct);

      if (rawProgress < 1) {
        animationFrameId = requestAnimationFrame(animateProgress);
      } else {
        // Hold briefly at 100% then smoothly fade out
        setTimeout(() => {
          setIsExiting(true);
          setTimeout(() => {
            setVisible(false);
            onCompleteRef.current?.();
          }, 450);
        }, 180);
      }
    };

    animationFrameId = requestAnimationFrame(animateProgress);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  if (!visible) return null;

  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div
          key="moa-splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#06302F] select-none cursor-default"
          style={{ willChange: 'opacity' }}
        >
          <div className="flex flex-col items-center text-center px-4">
            {/* Circular MoA Logo Badge with subtle border */}
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-full p-[3px] border border-white/20 shadow-2xl bg-[#06302F] overflow-hidden flex items-center justify-center mb-6"
            >
              <img
                src={logoUrl}
                alt="Masters of All"
                className="w-full h-full object-cover rounded-full"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.onerror = null;
                  target.src = '/drawing1.png';
                }}
              />
            </motion.div>

            {/* "Masters of All" with internal fill animation from left to right */}
            <div className="relative inline-block">
              {/* Dimmed Base Layer */}
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#EDE9E0]/20 block select-none">
                Masters of All
              </span>
              {/* Solid White Fill Layer clipped by progress percentage */}
              <span
                className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white absolute inset-0 block select-none pointer-events-none transition-all duration-75"
                style={{
                  clipPath: `inset(0 ${100 - progress}% 0 0)`,
                  WebkitClipPath: `inset(0 ${100 - progress}% 0 0)`
                }}
                aria-hidden="true"
              >
                Masters of All
              </span>
            </div>

            {/* Subtle Tagline / Subtitle */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: progress > 30 ? 0.65 : 0 }}
              transition={{ duration: 0.4 }}
              className="mt-3 text-xs sm:text-sm font-medium tracking-widest uppercase text-[#CA7952]"
            >
              Believe · Build · Become
            </motion.div>

            {/* Percentage Indicator */}
            <div className="mt-5 text-[11px] font-mono tracking-wider text-[#EDE9E0]/40">
              {progress}%
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
