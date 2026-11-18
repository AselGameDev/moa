import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface LoadingScreenProps {
  onComplete: () => void;
  logoUrl?: string;
}

const INTRO_SEEN_KEY = 'moa_intro_seen';

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  onComplete,
  logoUrl = '/drawing1.png'
}) => {
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [visible, setVisible] = useState(true);

  const onCompleteRef = React.useRef(onComplete);
  onCompleteRef.current = onComplete;

  const finishIntro = React.useCallback(() => {
    try {
      sessionStorage.setItem(INTRO_SEEN_KEY, '1');
    } catch {
      // ignore storage errors
    }
    setIsExiting(true);
    setTimeout(() => {
      setVisible(false);
      onCompleteRef.current?.();
    }, 320);
  }, []);

  useEffect(() => {
    try {
      const seen = sessionStorage.getItem(INTRO_SEEN_KEY) === '1';
      const prefersReduced =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (seen || prefersReduced) {
        sessionStorage.setItem(INTRO_SEEN_KEY, '1');
        setVisible(false);
        onCompleteRef.current?.();
        return;
      }
    } catch {
      // continue animation
    }

    const startTime = performance.now();
    const duration = 2000;
    let animationFrameId: number;
    let exitTimer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const animateProgress = (now: number) => {
      if (cancelled) return;
      const elapsed = now - startTime;
      const rawProgress = Math.min(elapsed / duration, 1);
      const easedProgress = 1 - Math.pow(1 - rawProgress, 2.5);
      const currentPct = Math.min(100, Math.round(easedProgress * 100));
      setProgress(currentPct);

      if (rawProgress < 1) {
        animationFrameId = requestAnimationFrame(animateProgress);
      } else {
        exitTimer = setTimeout(() => {
          if (!cancelled) finishIntro();
        }, 160);
      }
    };

    animationFrameId = requestAnimationFrame(animateProgress);

    return () => {
      cancelled = true;
      cancelAnimationFrame(animationFrameId);
      if (exitTimer) clearTimeout(exitTimer);
    };
  }, [finishIntro]);

  if (!visible) return null;

  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div
          key="moa-splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#06302F]"
          style={{ willChange: 'opacity' }}
        >
          <button
            type="button"
            onClick={finishIntro}
            className="absolute top-6 right-6 px-3.5 py-1.5 rounded-full border border-white/20 text-xs font-medium text-[#EDE9E0]/75 hover:text-white hover:border-[#25CDB6]/60 transition-colors cursor-pointer"
          >
            Skip
          </button>

          <div className="flex flex-col items-center text-center px-4">
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-full p-[3px] border border-white/20 shadow-2xl bg-[#06302F] overflow-hidden flex items-center justify-center mb-6"
            >
              <img
                src={logoUrl || '/drawing1.png'}
                alt="Masters of All"
                width={1024}
                height={1024}
                loading="eager"
                decoding="async"
                className="w-full h-full object-cover rounded-full"
              />
            </motion.div>

            <div className="relative inline-block">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#EDE9E0]/20 block">
                Masters of All
              </span>
              <span
                className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white absolute inset-0 block pointer-events-none transition-all duration-75"
                style={{
                  clipPath: `inset(0 ${100 - progress}% 0 0)`,
                  WebkitClipPath: `inset(0 ${100 - progress}% 0 0)`
                }}
                aria-hidden="true"
              >
                Masters of All
              </span>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: progress > 30 ? 0.65 : 0 }}
              transition={{ duration: 0.35 }}
              className="mt-3 text-xs sm:text-sm font-medium tracking-widest uppercase text-[#CA7952]"
            >
              Believe · Build · Become
            </motion.div>

            <div className="mt-5 text-[11px] font-mono tracking-wider text-[#EDE9E0]/40">
              {progress}%
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
