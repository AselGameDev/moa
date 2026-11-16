import React from 'react';
import { Mail, ArrowUpRight, MapPin } from 'lucide-react';
import { Department, FooterColumn, SiteContent } from '../types';
import { resolveSocialLinks } from './SocialIcons';
import { SpaLink } from './SpaLink';

interface FooterProps {
  departments: Department[];
  onNavigate: (path: string) => void;
  socialLinks?: Array<{ id: string; platform: string; url: string; icon?: string }>;
  footerText?: string;
  footerColumns?: FooterColumn[];
  contactEmail?: string;
  organizationAddress?: string;
  logoUrl?: string;
  siteName?: string;
  tagline?: string;
  content?: SiteContent['footer'];
}

const DEFAULT_EXPLORE_LINKS = [
  { label: 'Home', url: '/', isExternal: false },
  { label: 'About', url: '/about', isExternal: false },
  { label: 'Departments', url: '/departments', isExternal: false },
  { label: 'Our Work', url: '/projects', isExternal: false },
  { label: 'Contact', url: '/contact', isExternal: false }
];

export const Footer: React.FC<FooterProps> = ({
  departments,
  onNavigate,
  socialLinks,
  footerText,
  footerColumns,
  contactEmail = 'business@mastersofall.org',
  organizationAddress,
  logoUrl = '/drawing1.png',
  siteName = 'Masters Of All',
  tagline = 'Believe. Build. Become.',
  content
}) => {
  const links = resolveSocialLinks(socialLinks);
  const customExploreCol = footerColumns && footerColumns.length > 0 ? footerColumns[0] : null;
  const exploreHeading = customExploreCol?.title || 'Explore';
  const exploreLinks =
    customExploreCol && customExploreCol.links.length > 0
      ? customExploreCol.links
      : DEFAULT_EXPLORE_LINKS;
  const blurb = content?.blurb || footerText || 'An ecosystem for explorers, creators, innovators and problem-solvers.';
  const departmentsHeading = content?.departmentsHeading || 'Departments';
  const communityHeading = content?.communityHeading || 'Community';
  const copyrightSuffix = content?.copyrightSuffix || 'All rights reserved.';
  const publishedDepartments = departments.filter(d => d.published && !d.deletedAt);

  return (
    <footer className="bg-[#031D1C] border-t border-[#EDE9E0]/10 text-[#EDE9E0] pt-16 pb-12 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 sm:gap-10 lg:gap-12 mb-12 sm:mb-16">
          <div className="sm:col-span-2 space-y-5">
            <SpaLink
              href="/"
              onNavigate={onNavigate}
              className="flex items-center gap-3.5 text-left focus:outline-none group cursor-pointer w-fit"
            >
              <div className="w-12 h-12 rounded-full overflow-hidden shadow-lg transition-transform duration-300 group-hover:scale-105">
                <img
                  src={logoUrl || '/drawing1.png'}
                  alt={`${siteName} Logo`}
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <span className="text-xl font-bold tracking-tight text-[#EDE9E0] group-hover:text-[#25CDB6] transition-colors">
                {siteName}
              </span>
            </SpaLink>

            <p className="text-sm text-[#EDE9E0]/70 max-w-sm leading-relaxed">
              {blurb}
            </p>

            <p className="text-sm font-serif italic text-[#CA7952]">
              {tagline}
            </p>

            <div className="pt-2 space-y-2">
              <a
                href={`mailto:${contactEmail}`}
                className="inline-flex items-center gap-2 text-sm text-[#25CDB6] hover:underline"
              >
                <Mail className="w-4 h-4 shrink-0" />
                <span className="break-all">{contactEmail}</span>
              </a>
              {organizationAddress && organizationAddress.trim() && (
                <div className="flex items-start gap-2 text-xs text-[#EDE9E0]/60">
                  <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#D0A873]" />
                  <span>{organizationAddress}</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <h4 className="text-xs uppercase tracking-wider text-[#EDE9E0]/50 mb-4 font-semibold">
              {exploreHeading}
            </h4>
            <ul className="space-y-2.5 text-sm">
              {exploreLinks.map((item, idx) => (
                <li key={`${item.url}-${idx}`}>
                  <SpaLink
                    href={item.url}
                    external={item.isExternal}
                    onNavigate={onNavigate}
                    className="text-[#EDE9E0]/70 hover:text-[#EDE9E0] transition-colors cursor-pointer"
                  >
                    {item.label}
                  </SpaLink>
                </li>
              ))}
            </ul>
          </div>

          {publishedDepartments.length > 0 && (
            <div>
              <h4 className="text-xs uppercase tracking-wider text-[#EDE9E0]/50 mb-4 font-semibold">
                {departmentsHeading}
              </h4>
              <ul className="space-y-2 text-xs">
                {publishedDepartments.map(dept => (
                  <li key={dept.id}>
                    <SpaLink
                      href={`/departments/${dept.slug}`}
                      onNavigate={onNavigate}
                      className="text-[#EDE9E0]/70 hover:text-[#25CDB6] transition-colors truncate max-w-full block text-left cursor-pointer"
                    >
                      {dept.name}
                    </SpaLink>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h4 className="text-xs uppercase tracking-wider text-[#EDE9E0]/50 mb-4 font-semibold">
              {communityHeading}
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

        <div className="pt-8 border-t border-[#EDE9E0]/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#EDE9E0]/50">
          <p>© {new Date().getFullYear()} {siteName}. {copyrightSuffix}</p>
          <div className="flex items-center gap-4">
            <span className="text-[#CA7952]">{tagline}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
