import React from 'react';
import { Mail, ArrowUpRight } from 'lucide-react';
import { Department } from '../types';
import { resolveSocialLinks } from './SocialIcons';

interface FooterProps {
  departments: Department[];
  onNavigate: (path: string) => void;
  socialLinks?: Array<{ id: string; platform: string; url: string; icon?: string }>;
  footerText?: string;
}

export const Footer: React.FC<FooterProps> = ({ departments, onNavigate, socialLinks, footerText }) => {
  const links = resolveSocialLinks(socialLinks);
  return (
    <footer className="bg-[#031D1C] border-t border-[#EDE9E0]/10 text-[#EDE9E0] pt-16 pb-12 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 sm:gap-10 lg:gap-12 mb-12 sm:mb-16">
          {/* Brand Column (2 cols on lg) */}
          <div className="sm:col-span-2 space-y-5">
            <button
              onClick={() => onNavigate('/')}
              className="flex items-center gap-3.5 text-left focus:outline-none group cursor-pointer"
            >
              <div className="w-12 h-12 rounded-full overflow-hidden shadow-lg transition-transform duration-300 group-hover:scale-105">
                <img
                  src="/drawing1.png"
                  alt="Masters Of All Logo"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <span className="text-xl font-bold tracking-tight text-[#EDE9E0] group-hover:text-[#25CDB6] transition-colors">
                Masters Of All
              </span>
            </button>

            <p className="text-sm text-[#EDE9E0]/70 max-w-sm leading-relaxed">
              An ecosystem for explorers, creators, innovators and problem-solvers.
            </p>

            {/* Tagline */}
            <p className="text-sm font-serif italic text-[#CA7952]">
              Believe. Build. Become.
            </p>

            {/* Direct Email */}
            <div className="pt-2">
              <a
                href="mailto:business@mastersofall.org"
                className="inline-flex items-center gap-2 text-sm text-[#25CDB6] hover:underline"
              >
                <Mail className="w-4 h-4 shrink-0" />
                <span className="break-all">business@mastersofall.org</span>
              </a>
            </div>
          </div>

          {/* Site Navigation */}
          <div>
            <h4 className="text-xs uppercase tracking-wider text-[#EDE9E0]/50 mb-4 font-semibold">
              Explore
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button
                  onClick={() => onNavigate('/')}
                  className="text-[#EDE9E0]/70 hover:text-[#EDE9E0] transition-colors cursor-pointer"
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/about')}
                  className="text-[#EDE9E0]/70 hover:text-[#EDE9E0] transition-colors cursor-pointer"
                >
                  About
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/departments')}
                  className="text-[#EDE9E0]/70 hover:text-[#EDE9E0] transition-colors cursor-pointer"
                >
                  Departments
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/projects')}
                  className="text-[#EDE9E0]/70 hover:text-[#EDE9E0] transition-colors cursor-pointer"
                >
                  Projects
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/contact')}
                  className="text-[#EDE9E0]/70 hover:text-[#EDE9E0] transition-colors cursor-pointer"
                >
                  Contact
                </button>
              </li>
            </ul>
          </div>

          {/* RDD Departments Navigation */}
          <div>
            <h4 className="text-xs uppercase tracking-wider text-[#EDE9E0]/50 mb-4 font-semibold">
              Departments
            </h4>
            <ul className="space-y-2 text-xs">
              {departments.filter(d => d.published).map(dept => (
                <li key={dept.id}>
                  <button
                    onClick={() => onNavigate(`/departments/${dept.slug}`)}
                    className="text-[#EDE9E0]/70 hover:text-[#25CDB6] transition-colors truncate max-w-full block text-left cursor-pointer"
                  >
                    {dept.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Official Social Channels with Real Brand Icons */}
          <div>
            <h4 className="text-xs uppercase tracking-wider text-[#EDE9E0]/50 mb-4 font-semibold">
              Community
            </h4>
            <ul className="space-y-2.5 text-sm">
              {links.map(item => {
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={item.ariaLabel}
                      className="text-[#EDE9E0]/70 hover:text-[#25CDB6] transition-colors flex items-center gap-2.5 group"
                    >
                      <Icon size={16} className="text-[#EDE9E0]/60 group-hover:text-[#25CDB6] transition-colors" />
                      <span>{item.name}</span>
                      <ArrowUpRight className="w-3 h-3 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-[#EDE9E0]/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#EDE9E0]/50">
          <p>© {new Date().getFullYear()} Masters Of All. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="text-[#CA7952]">Believe. Build. Become.</span>
            <span className="text-white/20">·</span>
            <button
              onClick={() => onNavigate('/signin')}
              className="text-[#EDE9E0]/30 hover:text-[#EDE9E0]/80 transition-colors cursor-pointer"
            >
              Sign in
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
