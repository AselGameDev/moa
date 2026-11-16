import React from 'react';
import { sanitizeSafeUrl } from '../shared/url';

// Crisp, lightweight official vector brand icons
export const LinkedinIcon: React.FC<{ size?: number; className?: string }> = ({ size = 18, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3m1.4 9.74v-8.37H5.06v8.37z" />
  </svg>
);

export const YoutubeIcon: React.FC<{ size?: number; className?: string }> = ({ size = 18, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M21.58 7.19a2.5 2.5 0 0 0-1.76-1.77C18.26 5 12 5 12 5s-6.26 0-7.82.42A2.5 2.5 0 0 0 2.42 7.2C2 8.76 2 12 2 12s0 3.24.42 4.81a2.5 2.5 0 0 0 1.76 1.77C5.74 19 12 19 12 19s6.26 0 7.82-.42a2.5 2.5 0 0 0 1.76-1.77C22 15.24 22 12 22 12s0-3.24-.42-4.81zM10 15V9l5.2 3z" />
  </svg>
);

export const InstagramIcon: React.FC<{ size?: number; className?: string }> = ({ size = 18, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

export const FacebookIcon: React.FC<{ size?: number; className?: string }> = ({ size = 18, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95C18.05 21.45 22 17.19 22 12z" />
  </svg>
);

export const PatreonIcon: React.FC<{ size?: number; className?: string }> = ({ size = 18, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M15.38 3a6.62 6.62 0 1 0 0 13.24 6.62 6.62 0 0 0 0-13.24zM3 21h3.75V3H3z" />
  </svg>
);

export const WhatsappIcon: React.FC<{ size?: number; className?: string }> = ({ size = 18, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.41a8.19 8.19 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.45 0-2.87-.38-4.12-1.1l-.3-.18-3.12.82.83-3.04-.19-.31a8.17 8.17 0 0 1-1.25-4.26c0-4.54 3.7-8.24 8.24-8.24m4.52 11.58c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.24-.74-.66-1.24-1.48-1.39-1.73-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.17.04-.32-.02-.45-.06-.13-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.78 2.72 4.31 3.81.6.26 1.07.42 1.44.54.61.19 1.16.17 1.6.1.49-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.12-.22-.19-.47-.32" />
  </svg>
);

export const TwitterIcon: React.FC<{ size?: number; className?: string }> = ({ size = 18, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

export const GithubIcon: React.FC<{ size?: number; className?: string }> = ({ size = 18, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.1-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z" />
  </svg>
);

export const GlobeIcon: React.FC<{ size?: number; className?: string }> = ({ size = 18, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <line x1="2" x2="22" y1="12" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

export interface SocialLinkItem {
  id: string;
  name: string;
  url: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  hoverColor: string;
  ariaLabel: string;
}

export const OFFICIAL_SOCIAL_LINKS: SocialLinkItem[] = [
  {
    id: 'linkedin',
    name: 'LinkedIn',
    url: 'https://www.linkedin.com/company/mastersofall/',
    icon: LinkedinIcon,
    hoverColor: '#0A66C2',
    ariaLabel: 'Follow Masters Of All on LinkedIn'
  },
  {
    id: 'youtube',
    name: 'YouTube',
    url: 'https://www.youtube.com/@Masters_Of_All',
    icon: YoutubeIcon,
    hoverColor: '#FF0000',
    ariaLabel: 'Subscribe to Masters Of All on YouTube'
  },
  {
    id: 'instagram',
    name: 'Instagram',
    url: 'https://www.instagram.com/mastersofall_official/',
    icon: InstagramIcon,
    hoverColor: '#E4405F',
    ariaLabel: 'Follow Masters Of All on Instagram'
  },
  {
    id: 'facebook',
    name: 'Facebook',
    url: 'https://www.facebook.com/mastersofallofficial',
    icon: FacebookIcon,
    hoverColor: '#1877F2',
    ariaLabel: 'Visit Masters Of All on Facebook'
  },
  {
    id: 'patreon',
    name: 'Patreon',
    url: 'https://www.patreon.com/cw/MastersOfAll',
    icon: PatreonIcon,
    hoverColor: '#FF424D',
    ariaLabel: 'Support Masters Of All on Patreon'
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    url: 'https://whatsapp.com/channel/0029Vb8gxyN8fewhOqTsK60e',
    icon: WhatsappIcon,
    hoverColor: '#25D366',
    ariaLabel: 'Join the Masters Of All WhatsApp Channel'
  }
];

export function getPlatformIcon(platformName: string): React.ComponentType<{ size?: number; className?: string }> {
  const p = (platformName || '').toLowerCase();
  if (p.includes('linkedin')) return LinkedinIcon;
  if (p.includes('youtube')) return YoutubeIcon;
  if (p.includes('instagram')) return InstagramIcon;
  if (p.includes('facebook')) return FacebookIcon;
  if (p.includes('patreon')) return PatreonIcon;
  if (p.includes('whatsapp')) return WhatsappIcon;
  if (p.includes('twitter') || p.includes(' x') || p === 'x') return TwitterIcon;
  if (p.includes('github')) return GithubIcon;
  return GlobeIcon;
}

export function resolveSocialLinks(customLinks?: Array<{ id: string; platform: string; url: string; icon?: string }>): SocialLinkItem[] {
  if (!customLinks) {
    return OFFICIAL_SOCIAL_LINKS;
  }

  return customLinks
    .map(link => {
      const safeUrl = sanitizeSafeUrl(link.url, false);
      if (!safeUrl) return null;
      const icon = getPlatformIcon(link.icon || link.platform);
      return {
        id: link.id || link.platform.toLowerCase(),
        name: link.platform,
        url: safeUrl,
        icon,
        hoverColor: '#25CDB6',
        ariaLabel: `Follow Masters Of All on ${link.platform}`
      };
    })
    .filter((item): item is SocialLinkItem => item !== null);
}

interface SocialIconStripProps {
  className?: string;
  iconSize?: number;
  showLabels?: boolean;
  socialLinks?: Array<{ id: string; platform: string; url: string; icon?: string }>;
}

export const SocialIconStrip: React.FC<SocialIconStripProps> = ({
  className = '',
  iconSize = 20,
  showLabels = false,
  socialLinks
}) => {
  const links = resolveSocialLinks(socialLinks);

  return (
    <div className={`flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3.5 ${className}`}>
      {links.map(item => {
        const IconComponent = item.icon;
        return (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={item.ariaLabel}
            className="group relative p-2 rounded-xl text-[#EDE9E0] transition-all duration-200 hover:-translate-y-1 hover:text-[#25CDB6]"
          >
            <IconComponent size={iconSize} className="transition-transform group-hover:scale-110" />
            {showLabels && (
              <span className="text-xs font-medium ml-2 text-[#EDE9E0] group-hover:text-[#25CDB6] transition-colors">
                {item.name}
              </span>
            )}
          </a>
        );
      })}
    </div>
  );
};
