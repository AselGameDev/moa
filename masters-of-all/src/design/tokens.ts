/**
 * Masters Of All — Unified Design Tokens
 * 
 * Strict WCAG AA contrast compliance, tabular figures,
 * and high-appeal deep teal & copper aesthetic.
 */

export const tokens = {
  colors: {
    // Brand Canvas & Accent
    canvas: {
      dark: '#06302F',
      darkSurface: '#0A3D3C',
      darkCard: '#031D1C',
      light: '#F8F9FA',
      lightSurface: '#FFFFFF',
      lightCard: '#F1F5F9',
    },
    brand: {
      primary: '#17A491',
      primaryHover: '#138A7A',
      secondary: '#25CDB6',
      accentCopper: '#CA7952',
      accentGold: '#D0A873',
      textCream: '#EDE9E0',
    },
    // Status colors: Draft grey, In review amber, Published teal, Archived muted
    status: {
      draft: {
        text: '#94A3B8',
        bg: 'rgba(148, 163, 184, 0.12)',
        border: 'rgba(148, 163, 184, 0.25)',
      },
      inReview: {
        text: '#F59E0B',
        bg: 'rgba(245, 158, 11, 0.12)',
        border: 'rgba(245, 158, 11, 0.25)',
      },
      published: {
        text: '#25CDB6',
        bg: 'rgba(37, 205, 182, 0.12)',
        border: 'rgba(37, 205, 182, 0.25)',
      },
      archived: {
        text: '#64748B',
        bg: 'rgba(100, 116, 139, 0.12)',
        border: 'rgba(100, 116, 139, 0.25)',
      },
    },
    semantic: {
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6',
    }
  },
  typography: {
    fontDisplay: '"Cormorant Garamond", Georgia, serif',
    fontBody: '"Manrope", -apple-system, BlinkMacSystemFont, sans-serif',
    fontMono: 'ui-monospace, "JetBrains Mono", monospace',
    minBodySize: '13px',
    minLabelSize: '12px',
  },
  radii: {
    sm: '0.375rem',  // 6px
    md: '0.5rem',    // 8px
    lg: '0.75rem',   // 12px
    xl: '1rem',      // 16px
    '2xl': '1.25rem',// 20px
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    card: '0 4px 20px -2px rgba(3, 29, 28, 0.5)',
    glowTeal: '0 0 25px rgba(37, 205, 182, 0.25)',
    glowCopper: '0 0 25px rgba(202, 121, 82, 0.25)',
  }
} as const;

export type DesignTokens = typeof tokens;
