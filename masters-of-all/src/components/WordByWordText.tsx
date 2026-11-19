import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface WordByWordTextProps {
  text: string;
  prefix?: string;
  suffix?: string;
  staggerSeconds?: number;
  durationSeconds?: number;
  initialDelaySeconds?: number;
  yOffset?: number;
  className?: string;
}

export const WordByWordText: React.FC<WordByWordTextProps> = ({
  text,
  prefix = '',
  suffix = '',
  staggerSeconds = 0.045,
  durationSeconds = 0.48,
  initialDelaySeconds = 0,
  yOffset = 14,
  className = ''
}) => {
  const prefersReducedMotion = useReducedMotion();
  const normalized = (text || '').trim();
  const words = normalized ? normalized.split(/\s+/) : [];

  if (prefersReducedMotion || words.length === 0) {
    return (
      <span className={className}>
        {prefix}
        {normalized}
        {suffix}
      </span>
    );
  }

  const wordVariant = {
    hidden: { opacity: 0, y: yOffset },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: durationSeconds,
        ease: [0.16, 1, 0.3, 1] as const
      }
    }
  };

  return (
    <motion.span
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={{
        hidden: {},
        visible: {
          transition: {
            delayChildren: initialDelaySeconds,
            staggerChildren: staggerSeconds
          }
        }
      }}
      aria-label={`${prefix}${normalized}${suffix}`}
      className={className}
    >
      {prefix && (
        <motion.span aria-hidden="true" variants={wordVariant} className="inline-block mr-0.5">
          {prefix}
        </motion.span>
      )}
      {words.map((word, index) => (
        <React.Fragment key={`${word}-${index}`}>
          <motion.span aria-hidden="true" variants={wordVariant} className="inline-block">
            {word}
          </motion.span>
          {index < words.length - 1 ? ' ' : ''}
        </React.Fragment>
      ))}
      {suffix && (
        <motion.span aria-hidden="true" variants={wordVariant} className="inline-block ml-0.5">
          {suffix}
        </motion.span>
      )}
    </motion.span>
  );
};
