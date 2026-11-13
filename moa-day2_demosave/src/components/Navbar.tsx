import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { resolveSocialLinks } from './SocialIcons';

interface NavbarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  socialLinks?: Array<{ id: string; platform: string; url: string; icon?: string }>;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPath, onNavigate, socialLinks }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const links = resolveSocialLinks(socialLinks);

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'About', path: '/about' },
    { label: 'Departments', path: '/departments' },
    { label: 'Projects', path: '/projects' },
    { label: 'Contact', path: '/contact' }
  ];

  const handleLinkClick = (path: string) => {
    setMobileMenuOpen(false);
    onNavigate(path);
  };

  const isActive = (path: string) => {
    if (path === '/' && currentPath === '/') return true;
    if (path !== '/' && currentPath.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#042423]/95 backdrop-blur-md border-b border-[#EDE9E0]/15 shadow-md transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-8">
        {/* Brand: Drawing1.png cropped to circle */}
        <button
          onClick={() => handleLinkClick('/')}
          className="flex items-center gap-3.5 text-left focus:outline-none group shrink-0 cursor-pointer"
        >
          <div className="w-11 h-11 rounded-full overflow-hidden shadow-lg transition-transform duration-300 group-hover:scale-105">
            <img
              src="/drawing1.png"
              alt="Masters Of All Logo"
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          <span className="text-lg font-bold tracking-tight text-[#EDE9E0] group-hover:text-[#25CDB6] transition-colors whitespace-nowrap">
            Masters Of All
          </span>
        </button>

        {/* Desktop Nav Links with animated active indicator */}
        <nav className="hidden md:flex items-center gap-4 lg:gap-8 text-sm font-medium">
          {navLinks.map(link => {
            const active = isActive(link.path);
            return (
              <button
                key={link.path}
                onClick={() => handleLinkClick(link.path)}
                className={`relative py-1.5 transition-colors whitespace-nowrap shrink-0 text-sm tracking-wide cursor-pointer ${
                  active
                    ? 'text-[#25CDB6] font-semibold'
                    : 'text-[#EDE9E0]/80 hover:text-[#EDE9E0]'
                }`}
              >
                {link.label}
                {active && (
                  <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#25CDB6] rounded-full transition-all duration-300" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Social Brand Icons in Nav */}
        <div className="hidden lg:flex items-center gap-3 shrink-0">
          {links.slice(0, 4).map(item => {
            const Icon = item.icon;
            return (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={item.ariaLabel}
                className="p-1.5 text-[#EDE9E0]/70 hover:text-[#25CDB6] transition-all duration-200 hover:-translate-y-0.5"
              >
                <Icon size={16} />
              </a>
            );
          })}
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex items-center md:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-[#EDE9E0]/80 hover:text-[#EDE9E0] focus:outline-none rounded-lg border border-[#EDE9E0]/15"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#042423]/98 backdrop-blur-xl border-b border-[#EDE9E0]/15 px-4 pt-3 pb-6 space-y-2 shadow-xl">
          {navLinks.map(link => (
            <button
              key={link.path}
              onClick={() => handleLinkClick(link.path)}
              className={`block w-full text-left px-3 py-2.5 rounded-lg text-base font-medium transition-colors ${
                isActive(link.path)
                  ? 'bg-[#17A491]/20 text-[#25CDB6] font-semibold'
                  : 'text-[#EDE9E0]/80 hover:bg-white/5 hover:text-white'
              }`}
            >
              {link.label}
            </button>
          ))}
          {/* Social icons row in mobile menu */}
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
                  className="p-2 text-[#EDE9E0]/70 hover:text-[#25CDB6]"
                >
                  <Icon size={18} />
                </a>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};
