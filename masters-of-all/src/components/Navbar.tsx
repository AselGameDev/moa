import React, { useState, useEffect, useMemo } from 'react';
import { Menu, X } from 'lucide-react';
import { NavigationItem } from '../types';
import { resolveSocialLinks } from './SocialIcons';
import { SpaLink } from './SpaLink';

interface NavbarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  socialLinks?: Array<{ id: string; platform: string; url: string; icon?: string }>;
  navigation?: NavigationItem[];
  showProducts?: boolean;
  logoUrl?: string;
  siteName?: string;
}

const DEFAULT_NAV_LINKS: NavigationItem[] = [
  { id: 'nav-home', label: 'Home', path: '/home' },
  { id: 'nav-about', label: 'About', path: '/about' },
  { id: 'nav-dept', label: 'Departments', path: '/departments' },
  { id: 'nav-proj', label: 'Projects', path: '/projects' },
  { id: 'nav-prod', label: 'Products', path: '/products' },
  { id: 'nav-contact', label: 'Contact', path: '/contact' }
];

export const Navbar: React.FC<NavbarProps> = ({
  currentPath,
  onNavigate,
  socialLinks,
  navigation,
  showProducts = false,
  logoUrl = '/drawing1.png',
  siteName = 'Masters Of All'
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const links = resolveSocialLinks(socialLinks);

  const navLinks = useMemo(() => {
    const base = navigation && navigation.length > 0 ? [...navigation] : [...DEFAULT_NAV_LINKS];

    // Rename legacy "Our Work" link label to "Projects" and normalize "/" -> "/home"
    const normalized = base.map(item => {
      if (item.path === '/') return { ...item, path: '/home' };
      if (item.path === '/projects' && item.label === 'Our Work') {
        return { ...item, label: 'Projects' };
      }
      return item;
    });

    // Filter Products link based on visibility toggle
    const filtered = normalized.filter(item => item.path !== '/products' || showProducts);

    // Ensure Products link appears when visible even if custom nav didn't include it
    if (showProducts && !filtered.some(item => item.path === '/products')) {
      const contactIdx = filtered.findIndex(item => item.path === '/contact');
      const prodItem: NavigationItem = { id: 'nav-prod', label: 'Products', path: '/products' };
      if (contactIdx >= 0) {
        filtered.splice(contactIdx, 0, prodItem);
      } else {
        filtered.push(prodItem);
      }
    }

    return filtered;
  }, [navigation, showProducts]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [mobileMenuOpen]);

  const handleLinkClick = (path: string) => {
    setMobileMenuOpen(false);
    onNavigate(path);
  };

  const isActive = (path: string) => {
    if ((path === '/' || path === '/home') && (currentPath === '/home' || currentPath === '/')) {
      return true;
    }
    if (path === '/departments' && currentPath.startsWith('/sectors/')) return true;
    if (path !== '/' && path !== '/home' && currentPath.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#042423]/95 backdrop-blur-md border-b border-[#EDE9E0]/15 shadow-md transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4 lg:gap-6">
        <SpaLink
          href="/home"
          onNavigate={handleLinkClick}
          className="flex items-center gap-3 text-left focus:outline-none group shrink-0 cursor-pointer"
        >
          <div className="w-10 h-10 lg:w-11 lg:h-11 rounded-full overflow-hidden shadow-lg transition-transform duration-300 group-hover:scale-105 shrink-0">
            <img
              src={logoUrl || '/drawing1.png'}
              alt={`${siteName} Logo`}
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          <span className="text-base lg:text-lg font-bold tracking-tight text-[#EDE9E0] group-hover:text-[#25CDB6] transition-colors whitespace-nowrap">
            {siteName}
          </span>
        </SpaLink>

        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-3.5 lg:gap-5 xl:gap-7 text-sm font-medium min-w-0"
        >
          {navLinks.map(link => {
            const active = !link.isExternal && isActive(link.path);
            return (
              <SpaLink
                key={link.id || link.path}
                href={link.path}
                external={link.isExternal}
                onNavigate={handleLinkClick}
                className={`relative py-2 transition-colors whitespace-nowrap shrink-0 text-sm tracking-wide cursor-pointer ${
                  active
                    ? 'text-[#25CDB6] font-semibold'
                    : 'text-[#EDE9E0]/85 hover:text-[#EDE9E0]'
                }`}
              >
                {link.label}
                {active && (
                  <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#25CDB6] rounded-full transition-all duration-300" />
                )}
              </SpaLink>
            );
          })}
        </nav>

        <div className="hidden lg:flex items-center gap-2 shrink-0">
          {links.slice(0, 4).map(item => {
            const Icon = item.icon;
            return (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={item.ariaLabel}
                className="p-2 text-[#EDE9E0]/75 hover:text-[#25CDB6] transition-all duration-200 hover:-translate-y-0.5 rounded-lg"
              >
                <Icon size={16} />
              </a>
            );
          })}
        </div>

        <div className="flex items-center md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[#EDE9E0]/85 hover:text-[#EDE9E0] focus:outline-none rounded-lg border border-[#EDE9E0]/15 cursor-pointer"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden bg-[#042423]/98 backdrop-blur-xl border-b border-[#EDE9E0]/15 px-4 pt-3 pb-6 space-y-1.5 shadow-xl">
          {navLinks.map(link => (
            <SpaLink
              key={link.id || link.path}
              href={link.path}
              external={link.isExternal}
              onNavigate={handleLinkClick}
              onClick={() => setMobileMenuOpen(false)}
              className={`min-h-[48px] flex items-center w-full text-left px-3.5 rounded-xl text-base font-medium transition-colors ${
                !link.isExternal && isActive(link.path)
                  ? 'bg-[#17A491]/20 text-[#25CDB6] font-semibold'
                  : 'text-[#EDE9E0]/85 hover:bg-white/5 hover:text-white'
              }`}
            >
              {link.label}
            </SpaLink>
          ))}
          {links.length > 0 && (
            <div className="pt-4 border-t border-[#EDE9E0]/10 flex items-center justify-around">
              {links.map(item => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.id}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={item.ariaLabel}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[#EDE9E0]/75 hover:text-[#25CDB6]"
                  >
                    <Icon size={18} />
                  </a>
                );
              })}
            </div>
          )}
        </div>
      )}
    </header>
  );
};
