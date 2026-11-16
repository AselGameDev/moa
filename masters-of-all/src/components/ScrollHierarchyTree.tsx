import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { Department } from '../types';
import { DepartmentIcon } from './DepartmentIcon';
import { ArrowUpRight } from 'lucide-react';
import { SpaLink } from './SpaLink';

interface ScrollHierarchyTreeProps {
  departments: Department[];
  onSelectDepartment: (slug: string) => void;
  moaLogoUrl?: string;
  rddLogoUrl?: string;
  siteName?: string;
}

export const ScrollHierarchyTree: React.FC<ScrollHierarchyTreeProps> = ({
  departments,
  onSelectDepartment,
  moaLogoUrl = '/drawing1.png',
  rddLogoUrl = '/5320.jpg',
  siteName = 'Masters Of All'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const activeDepts = departments.filter(d => d.published && !d.deletedAt && d.showInTree !== false);
  const count = activeDepts.length;
  const wrapLayout = count > 10;

  const SVG_WIDTH = 1000;
  const CENTER_X = 500;
  const SVG_HEIGHT = 112;

  const nodeTargets = activeDepts.map((dept, index) => {
    let targetX: number;
    if (count <= 1) {
      targetX = CENTER_X;
    } else if (count <= 3) {
      const step = 260;
      targetX = CENTER_X + (index - (count - 1) / 2) * step;
    } else {
      const margin = 62.5;
      const step = (SVG_WIDTH - margin * 2) / (count - 1);
      targetX = margin + index * step;
    }
    return { dept, targetX };
  });

  const handleNavigateSlug = (path: string) => {
    const slug = path.replace(/^\/departments\//, '');
    onSelectDepartment(slug);
  };

  return (
    <div ref={containerRef} className="w-full py-8 relative">
      {/* Desktop Canvas */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-50px' }}
        className="hidden md:flex flex-col items-center max-w-6xl mx-auto px-2"
      >
        <motion.div
          variants={{
            hidden: { opacity: 0, scale: 0.85, y: -10 },
            visible: {
              opacity: 1,
              scale: 1,
              y: 0,
              transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] }
            }
          }}
          className="flex flex-col items-center z-20"
        >
          <div className="w-24 h-24 rounded-full overflow-hidden shadow-2xl border-2 border-[#D0A873]/60 bg-[#06302F] p-1 transition-transform hover:scale-105">
            <img
              src={moaLogoUrl || '/drawing1.png'}
              alt={siteName}
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          <span className="mt-2 text-sm font-bold tracking-tight text-[#EDE9E0]">
            {siteName}
          </span>
        </motion.div>

        <div className="w-1 h-14 relative my-1">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 4 56">
            <motion.line
              x1="2"
              y1="0"
              x2="2"
              y2="56"
              stroke="#CA7952"
              strokeWidth="2.4"
              strokeLinecap="round"
              variants={{
                hidden: { pathLength: 0 },
                visible: {
                  pathLength: 1,
                  transition: { duration: 0.45, delay: 0.35, ease: 'easeInOut' }
                }
              }}
            />
          </svg>
        </div>

        <motion.div
          variants={{
            hidden: { opacity: 0, scale: 0.85 },
            visible: {
              opacity: 1,
              scale: 1,
              transition: { duration: 0.6, delay: 0.55, ease: [0.16, 1, 0.3, 1] }
            }
          }}
          className="flex flex-col items-center z-20"
        >
          <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[#25CDB6] shadow-2xl bg-[#06302F] p-1 transition-transform hover:scale-105">
            <img
              src={rddLogoUrl || '/5320.jpg'}
              alt="Research Discover and Development"
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          <span className="mt-2 text-xs font-semibold tracking-wide text-white text-center">
            Research Discover and Development
          </span>
        </motion.div>

        {count > 0 && !wrapLayout && (
          <div className="w-full h-28 relative mt-1">
            <svg
              viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
              preserveAspectRatio="none"
              className="w-full h-full overflow-visible"
            >
              {nodeTargets.map(({ dept, targetX }, i) => (
                <motion.path
                  key={dept.id}
                  d={`M ${CENTER_X},0 C ${CENTER_X},60 ${targetX},50 ${targetX},${SVG_HEIGHT}`}
                  fill="none"
                  stroke="#CA7952"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  variants={{
                    hidden: { pathLength: 0, opacity: 0 },
                    visible: {
                      pathLength: 1,
                      opacity: 1,
                      transition: {
                        duration: 0.6,
                        delay: 0.8 + i * 0.05,
                        ease: [0.22, 1, 0.36, 1]
                      }
                    }
                  }}
                  className="transition-opacity duration-300"
                />
              ))}
            </svg>
          </div>
        )}

        {count > 0 && wrapLayout && <div className="w-px h-8 border-l-2 border-[#CA7952] my-2" />}

        {count > 0 && (
          <div
            className={`w-full pt-0 max-w-6xl mx-auto ${
              wrapLayout
                ? 'flex flex-wrap items-start justify-center gap-4'
                : 'flex items-start justify-between gap-1'
            }`}
          >
            {nodeTargets.map(({ dept }, i) => (
              <motion.div
                key={dept.id}
                variants={{
                  hidden: { opacity: 0, scale: 0.7, y: 15 },
                  visible: {
                    opacity: 1,
                    scale: 1,
                    y: 0,
                    transition: {
                      duration: 0.5,
                      delay: 1.0 + i * 0.05,
                      ease: [0.16, 1, 0.3, 1]
                    }
                  }
                }}
                whileHover={{ y: -6, scale: 1.05 }}
                className={wrapLayout ? 'w-28' : 'flex-1 min-w-0'}
              >
                <SpaLink
                  href={`/departments/${dept.slug}`}
                  onNavigate={handleNavigateSlug}
                  className="flex flex-col items-center text-center p-2 rounded-2xl group transition-all duration-300 focus:outline-none cursor-pointer"
                >
                  <div
                    className="w-20 h-20 sm:w-[84px] sm:h-[84px] rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shadow-2xl border border-black/10 shrink-0"
                    style={{
                      backgroundColor: dept.iconBgHex || '#FFFFFF',
                      color: dept.colorHex || '#06302F'
                    }}
                  >
                    <DepartmentIcon
                      glyph={dept.iconGlyph}
                      iconUrl={dept.iconUrl}
                      size={42}
                      color={dept.colorHex || '#06302F'}
                    />
                  </div>

                  <span className="mt-3 text-xs font-bold text-[#EDE9E0] group-hover:text-[#25CDB6] transition-colors leading-snug line-clamp-2 max-w-[110px]">
                    {dept.name}
                  </span>

                  <span className="text-[11px] text-[#CA7952] opacity-0 group-hover:opacity-100 transition-opacity mt-1 flex items-center gap-0.5 font-serif italic">
                    <span>Explore</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </span>
                </SpaLink>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Mobile View */}
      <div className="md:hidden flex flex-col items-center max-w-sm mx-auto px-4">
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 rounded-full overflow-hidden shadow-xl border-2 border-[#D0A873]/60 bg-[#06302F] p-1">
            <img
              src={moaLogoUrl || '/drawing1.png'}
              alt={siteName}
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          <span className="mt-2 text-sm font-bold text-[#EDE9E0]">
            {siteName}
          </span>
        </div>

        <div className="w-px h-8 border-l-2 border-[#CA7952] my-1" />

        <div className="flex flex-col items-center">
          <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[#25CDB6] shadow-xl bg-[#06302F] p-1">
            <img
              src={rddLogoUrl || '/5320.jpg'}
              alt="RDD"
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          <span className="mt-1 text-xs font-semibold text-white text-center">
            Research Discover and Development
          </span>
        </div>

        {count > 0 && (
          <>
            <div className="w-px h-8 border-l-2 border-[#CA7952] my-1" />

            <div className="w-full space-y-3 relative">
              <div className="absolute left-[34px] top-5 bottom-5 w-px border-l-2 border-dotted border-[#CA7952] pointer-events-none" />
              {activeDepts.map(dept => (
                <SpaLink
                  key={dept.id}
                  href={`/departments/${dept.slug}`}
                  onNavigate={handleNavigateSlug}
                  className="w-full flex items-center gap-3.5 p-2.5 rounded-2xl text-left transition-colors hover:bg-white/5 cursor-pointer relative z-10"
                >
                  <div
                    className="w-13 h-13 rounded-full flex items-center justify-center shrink-0 shadow-lg border border-black/10"
                    style={{
                      backgroundColor: dept.iconBgHex || '#FFFFFF',
                      color: dept.colorHex || '#06302F'
                    }}
                  >
                    <DepartmentIcon
                      glyph={dept.iconGlyph}
                      iconUrl={dept.iconUrl}
                      size={26}
                      color={dept.colorHex || '#06302F'}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-bold text-[#EDE9E0] block truncate">
                      {dept.name}
                    </span>
                    <span className="text-xs text-[#25CDB6] flex items-center gap-1 font-serif italic mt-0.5">
                      <span>View department</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </span>
                  </div>
                </SpaLink>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
