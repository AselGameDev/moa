import React, { useMemo } from 'react';
import { Mail, ArrowUpRight, MapPin } from 'lucide-react';
import { Department, FooterColumn, SiteContent } from '../types';
import { resolveSocialLinks } from './SocialIcons';
import { SpaLink } from './SpaLink';
import { getUnitHref, splitOrgUnits } from '../utils/orgHelpers';

interface FooterProps {
  departments: Department[];
  onNavigate: (path: string) => void;
  socialLinks?: Array<{ id: string; platform: string; url: string; icon?: string }>;
  footerText?: string;
  footerColumns?: FooterColumn[];
  showProducts?: boolean;
  contactEmail?: string;
  organizationAddress?: string;
  logoUrl?: string;
  siteName?: string;
  tagline?: string;
  content?: SiteContent['footer'];
}

const DEFAULT_EXPLORE_LINKS = [
  { label: 'Home', url: '/home', isExternal: false },
  { label: 'About', url: '/about', isExternal: false },
  { label: 'Departments', url: '/departments', isExternal: false },
  { label: 'Projects', url: '/projects', isExternal: false },
  { label: 'Products', url: '/products', isExternal: false },
  { label: 'Contact', url: '/contact', isExternal: false }
];

export const Footer: React.FC<FooterProps> = ({
  departments,
  onNavigate,
  socialLinks,
  footerText,
  footerColumns,
  showProducts = false,
  contactEmail = 'business@mastersofall.org',
  organizationAddress,
  logoUrl = '/drawing1.png',
  siteName = 'Masters Of All',
  tagline = 'Believe. Build. Become.',
  content
}) => {
  const links = resolveSocialLinks(socialLinks);
  const customExploreCol = footerColumns && footerColumns.length > 0 ? footerColumns[0] : null;
  const exploreHeading = customExploreCol?.title || content?.exploreHeading || 'Explore';

  const exploreLinks = useMemo(() => {
    const raw =
      customExploreCol && customExploreCol.links.length > 0
        ? [...customExploreCol.links]
        : [...DEFAULT_EXPLORE_LINKS];

    const normalized = raw.map(item => {
      if (item.url === '/') return { ...item, url: '/home' };
      if (item.url === '/projects' && item.label === 'Our Work') {
        return { ...item, label: 'Projects' };
      }
      return item;
    });

    const filtered = normalized.filter(item => item.url !== '/products' || showProducts);

    if (showProducts && !filtered.some(item => item.url === '/products')) {
      const contactIdx = filtered.findIndex(item => item.url === '/contact');
      const prodLink = { label: 'Products', url: '/products', isExternal: false };
      if (contactIdx >= 0) filtered.splice(contactIdx, 0, prodLink);
      else filtered.push(prodLink);
    }

    return filtered;
  }, [customExploreCol, showProducts]);

  const blurb =
    content?.blurb ||
    footerText ||
    'An ecosystem for explorers, creators, innovators and problem-solvers.';
  const departmentsHeading = content?.departmentsHeading || 'Departments';
  const sectorsHeading = content?.sectorsHeading || 'Sectors';
  const communityHeading = content?.communityHeading || 'Community';
  const copyrightSuffix = content?.copyrightSuffix || 'All rights reserved.';

  const publishedUnits = useMemo(
    () => departments.filter(d => d.published && !d.deletedAt),
    [departments]
  );
  const { departments: publishedDepartments, sectors: publishedSectors } = useMemo(
    () => splitOrgUnits(publishedUnits),
    [publishedUnits]
  );

  return (
    <footer className="bg-[#031D1C] border-t border-[#EDE9E0]/10 text-[#EDE9E0] pt-16 pb-12 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-row lg:items-start lg:justify-between gap-10 lg:gap-8 mb-12 sm:mb-16">
          {/* Brand Column */}
          <div className="sm:col-span-2 lg:w-[270px] lg:shrink-0 space-y-5">
            <SpaLink
              href="/home"
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

            <p className="text-sm text-[#EDE9E0]/80 max-w-sm leading-relaxed">
              {blurb}
            </p>

            <p className="text-sm font-serif italic text-[#CA7952]">
              {tagline}
            </p>

            <div className="pt-2 space-y-2">
              <a
                href={`mailto:${contactEmail}`}
                className="inline-flex items-center gap-2 text-sm text-[#25CDB6] hover:underline min-h-[44px] sm:min-h-0"
              >
                <Mail className="w-4 h-4 shrink-0" />
                <span className="break-all">{contactEmail}</span>
              </a>
              {organizationAddress && organizationAddress.trim() && (
                <div className="flex items-start gap-2 text-[13px] text-[#EDE9E0]/75">
                  <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#D0A873]" />
                  <span>{organizationAddress}</span>
                </div>
              )}
            </div>
          </div>

          {/* Col 1: Explore */}
          <div className="min-w-0 lg:flex-initial">
            <h4 className="text-[13px] uppercase tracking-wider text-[#EDE9E0]/70 mb-4 font-semibold">
              {exploreHeading}
            </h4>
            <ul className="space-y-1 sm:space-y-2.5 text-[13px]">
              {exploreLinks.map((item, idx) => (
                <li key={`${item.url}-${idx}`}>
                  <SpaLink
                    href={item.url}
                    external={item.isExternal}
                    onNavigate={onNavigate}
                    className="min-h-[44px] sm:min-h-0 inline-flex items-center text-[#EDE9E0]/80 hover:text-[#EDE9E0] transition-colors cursor-pointer"
                  >
                    {item.label}
                  </SpaLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 2: Departments (Published non-sector departments only) */}
          <div className="min-w-0 lg:flex-initial lg:max-w-[230px]">
            <h4 className="text-[13px] uppercase tracking-wider text-[#EDE9E0]/70 mb-4 font-semibold">
              {departmentsHeading}
            </h4>
            <ul className="space-y-1 sm:space-y-2 text-[13px]">
              {publishedDepartments.map(dept => (
                <li key={dept.id}>
                  <SpaLink
                    href={getUnitHref(dept)}
                    onNavigate={onNavigate}
                    className="min-h-[44px] sm:min-h-0 flex items-center text-[13px] text-[#EDE9E0]/80 hover:text-[#25CDB6] transition-colors text-left cursor-pointer leading-snug whitespace-normal break-words"
                  >
                    {dept.name}
                  </SpaLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Sectors (Published RDD sectors) */}
          <div className="min-w-0 lg:flex-initial lg:max-w-[230px]">
            <h4 className="text-[13px] uppercase tracking-wider text-[#EDE9E0]/70 mb-4 font-semibold">
              {sectorsHeading}
            </h4>
            <ul className="space-y-1 sm:space-y-2 text-[13px]">
              {publishedSectors.map(sector => (
                <li key={sector.id}>
                  <SpaLink
                    href={getUnitHref(sector)}
                    onNavigate={onNavigate}
                    className="min-h-[44px] sm:min-h-0 flex items-center text-[13px] text-[#EDE9E0]/80 hover:text-[#25CDB6] transition-colors text-left cursor-pointer leading-snug whitespace-normal break-words"
                  >
                    {sector.name}
                  </SpaLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Community */}
          <div className="min-w-0 lg:flex-initial">
            <h4 className="text-[13px] uppercase tracking-wider text-[#EDE9E0]/70 mb-4 font-semibold">
              {communityHeading}
            </h4>
            <ul className="space-y-1 sm:space-y-2.5 text-[13px]">
              {links.map(item => {
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={item.ariaLabel}
                      className="min-h-[44px] sm:min-h-0 text-[#EDE9E0]/80 hover:text-[#25CDB6] transition-colors inline-flex items-center gap-2.5 group"
                    >
                      <Icon
                        size={16}
                        className="text-[#EDE9E0]/70 group-hover:text-[#25CDB6] transition-colors shrink-0"
                      />
                      <span>{item.name}</span>
                      <ArrowUpRight className="w-3 h-3 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-[#EDE9E0]/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-[13px] text-[#EDE9E0]/70">
          <p>
            © {new Date().getFullYear()} {siteName}. {copyrightSuffix}
          </p>
          <div className="flex items-center gap-4">
            <span className="text-[#CA7952]">{tagline}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
