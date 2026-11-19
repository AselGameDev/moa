import React from 'react';
import { sanitizeSafeUrl } from '../shared/url';

interface SpaLinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  href: string;
  onNavigate: (path: string) => void;
  external?: boolean;
  children: React.ReactNode;
}

export const SpaLink: React.FC<SpaLinkProps> = ({
  href,
  onNavigate,
  external,
  onClick,
  children,
  ...rest
}) => {
  const safeHref = sanitizeSafeUrl(href, true) || '#';
  const isExternalUrl =
    external ||
    safeHref.startsWith('http://') ||
    safeHref.startsWith('https://') ||
    safeHref.startsWith('mailto:');

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onClick) {
      onClick(e);
    }
    if (e.defaultPrevented) return;

    if (isExternalUrl || safeHref === '#') {
      return;
    }

    // Standard SPA routing on plain left-click without modifiers
    if (e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      onNavigate(safeHref);
    }
  };

  return (
    <a
      href={safeHref}
      onClick={handleClick}
      target={isExternalUrl ? '_blank' : rest.target}
      rel={isExternalUrl ? 'noopener noreferrer' : rest.rel}
      {...rest}
    >
      {children}
    </a>
  );
};
