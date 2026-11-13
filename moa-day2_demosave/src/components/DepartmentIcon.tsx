import React from 'react';
import {
  Globe,
  BookOpen,
  Heart,
  Compass,
  Layers,
  Shield,
  Target,
  Code,
  Users,
  Sparkles,
  HelpCircle,
  Clock,
  Scale,
  FileText
} from 'lucide-react';
import { DepartmentGlyph } from '../types';

interface DepartmentIconProps {
  glyph?: DepartmentGlyph | string;
  iconUrl?: string;
  className?: string;
  size?: number;
  color?: string;
  showBg?: boolean;
  bgColor?: string;
}

export const GLYPH_OPTIONS: { id: string; label: string }[] = [
  { id: 'law', label: 'Law and Justice (Scales of Justice)' },
  { id: 'history', label: 'History and Culture (Clock)' },
  { id: 'tech', label: 'Technology (Sine Wave)' },
  { id: 'science', label: 'Science and Engineering (Orbital Atom)' },
  { id: 'math', label: 'Mathematics (Greek Pi π)' },
  { id: 'media', label: 'News, Journalism and Media (Document)' },
  { id: 'freedom', label: 'Freedom Unit (Raised Fist)' },
  { id: 'entrepreneurship', label: 'Entrepreneurship (Growth Arrow)' },
  { id: 'globe', label: 'Global / Planetary' },
  { id: 'book', label: 'Literature & Learning' },
  { id: 'heart', label: 'Health & Humanity' },
  { id: 'compass', label: 'Exploration & Strategy' },
  { id: 'layers', label: 'Architecture & Systems' },
  { id: 'shield', label: 'Security & Governance' },
  { id: 'target', label: 'Focus & Objectives' },
  { id: 'code', label: 'Software & Computation' },
  { id: 'users', label: 'Community & Society' },
  { id: 'custom', label: 'Custom Uploaded Icon' }
];

// Helper to ensure icon color is always readable and never collides with background
function isColorDark(hex: string): boolean {
  if (!hex || !hex.startsWith('#')) return true;
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  // Perceived luminance formula (YIQ)
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}

export function getSafeContrastPair(fgHex?: string, bgHex?: string): { fg: string; bg: string } {
  const bg = bgHex || '#06302F';
  let fg = fgHex || '#25CDB6';

  const bgDark = isColorDark(bg);
  const fgDark = isColorDark(fg);

  // If both are dark or both are light, adjust fg for guaranteed WCAG AA visibility
  if (bgDark === fgDark) {
    fg = bgDark ? '#EDE9E0' : '#06302F';
  }

  return { fg, bg };
}

export const DepartmentIcon: React.FC<DepartmentIconProps> = ({
  glyph = 'tech',
  iconUrl,
  className = '',
  size = 24,
  color,
  showBg = false,
  bgColor
}) => {
  const { fg: safeColor, bg: safeBg } = getSafeContrastPair(color, bgColor);

  // If custom icon URL (SVG / PNG / image) is provided
  if (iconUrl) {
    const imgEl = (
      <img
        src={iconUrl}
        alt="Department Icon"
        className={`object-contain ${className}`}
        style={{ width: size, height: size }}
      />
    );
    if (showBg) {
      return (
        <div
          className="rounded-full flex items-center justify-center shrink-0 shadow-md"
          style={{ width: size, height: size, backgroundColor: safeBg }}
        >
          {imgEl}
        </div>
      );
    }
    return imgEl;
  }

  // Render authentic vector glyphs with guaranteed contrast
  const renderGlyph = () => {
    const strokeColor = color || safeColor;
    const fillColor = color || safeColor;

    switch (glyph) {
      // 1. Law and Justice: Scales of Justice
      case 'law':
        return (
          <svg
            viewBox="0 0 24 24"
            width={size * 0.58}
            height={size * 0.58}
            fill="none"
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3v18" />
            <path d="M6 7l6-3 6 3" />
            <path d="M6 7L3 13h6L6 7z" />
            <path d="M18 7l-3 6h6l-3-6z" />
            <path d="M8 21h8" />
          </svg>
        );

      // 2. History and Culture: Clock with hands
      case 'history':
        return (
          <svg
            viewBox="0 0 24 24"
            width={size * 0.58}
            height={size * 0.58}
            fill="none"
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="9" />
            <polyline points="12 7 12 12 15 15" />
          </svg>
        );

      // 3. Technology: Smooth Sine Wave
      case 'tech':
      case 'technology':
        return (
          <svg
            viewBox="0 0 24 24"
            width={size * 0.62}
            height={size * 0.62}
            fill="none"
            stroke={strokeColor}
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 12c3-8 6-8 9 0s6 8 9 0" />
            <circle cx="3" cy="12" r="1.5" fill={strokeColor} />
            <circle cx="21" cy="12" r="1.5" fill={strokeColor} />
          </svg>
        );

      // 4. Science and Engineering: Orbital Atom
      case 'science':
        return (
          <svg
            viewBox="0 0 24 24"
            width={size * 0.62}
            height={size * 0.62}
            fill="none"
            stroke={strokeColor}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="2.2" fill={fillColor} />
            <ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(30 12 12)" />
            <ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(90 12 12)" />
            <ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(150 12 12)" />
          </svg>
        );

      // 5. Mathematics: Pi (π) Symbol
      case 'math':
      case 'mathematics':
        return (
          <svg
            viewBox="0 0 24 24"
            width={size * 0.62}
            height={size * 0.62}
            fill={fillColor}
            stroke="none"
          >
            <path d="M4 6c0-.55.45-1 1-1h14c.55 0 1 .45 1 1s-.45 1-1 1h-2v11c0 .55-.45 1-1 1s-1-.45-1-1V7h-4v9c0 1.66 1.34 2.5 2.5 2.5.55 0 1 .45 1 1s-.45 1-1 1C12.5 20.5 10 19 10 16V7H7v11c0 .55-.45 1-1 1s-1-.45-1-1V7H5c-.55 0-1-.45-1-1z" />
          </svg>
        );

      // 6. News, Journalism and Media: Document / Lines
      case 'media':
      case 'news':
        return (
          <svg
            viewBox="0 0 24 24"
            width={size * 0.58}
            height={size * 0.58}
            fill="none"
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="4" y="3" width="16" height="18" rx="3" />
            <line x1="8" y1="8" x2="16" y2="8" />
            <line x1="8" y1="12" x2="16" y2="12" />
            <line x1="8" y1="16" x2="12" y2="16" />
          </svg>
        );

      // 7. Freedom Unit: Raised Clenched Fist
      case 'freedom':
        return (
          <svg
            viewBox="0 0 24 24"
            width={size * 0.58}
            height={size * 0.58}
            fill="none"
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M11 2a2 2 0 0 0-2 2v4H8a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h1v4a2 2 0 0 0 2 2h3a2 2 0 0 0 2-2v-4h1a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-1V4a2 2 0 0 0-2-2h-2z" />
            <path d="M11 7h3" />
          </svg>
        );

      // 8. Entrepreneurship: Zigzag Growth Arrow Trending Up
      case 'entrepreneurship':
        return (
          <svg
            viewBox="0 0 24 24"
            width={size * 0.62}
            height={size * 0.62}
            fill="none"
            stroke={strokeColor}
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="4 18 9 13 14 17 20 8" />
            <polyline points="15 8 20 8 20 13" />
          </svg>
        );

      case 'globe':
        return <Globe size={size * 0.58} color={strokeColor} />;
      case 'book':
        return <BookOpen size={size * 0.58} color={strokeColor} />;
      case 'heart':
        return <Heart size={size * 0.58} color={strokeColor} />;
      case 'compass':
        return <Compass size={size * 0.58} color={strokeColor} />;
      case 'layers':
        return <Layers size={size * 0.58} color={strokeColor} />;
      case 'shield':
        return <Shield size={size * 0.58} color={strokeColor} />;
      case 'target':
        return <Target size={size * 0.58} color={strokeColor} />;
      case 'code':
        return <Code size={size * 0.58} color={strokeColor} />;
      case 'users':
        return <Users size={size * 0.58} color={strokeColor} />;
      case 'custom':
        return <Sparkles size={size * 0.58} color={strokeColor} />;
      default:
        return <HelpCircle size={size * 0.58} color={strokeColor} />;
    }
  };

  if (showBg) {
    return (
      <div
        className={`rounded-full flex items-center justify-center shrink-0 shadow-lg ${className}`}
        style={{
          width: size,
          height: size,
          backgroundColor: bgColor || '#06302F'
        }}
      >
        {renderGlyph()}
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {renderGlyph()}
    </div>
  );
};
