import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { Department } from '../types';
import { DepartmentIcon } from './DepartmentIcon';
import { ArrowUpRight } from 'lucide-react';

interface ScrollHierarchyTreeProps {
  departments: Department[];
  onSelectDepartment: (slug: string) => void;
}

export const ScrollHierarchyTree: React.FC<ScrollHierarchyTreeProps> = ({
  departments,
  onSelectDepartment
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter published departments configured to show in tree
  const activeDepts = departments.filter(d => d.published && d.showInTree !== false);
  const count = activeDepts.length || 1;

  // Scroll-driven animation tracking within viewport
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start 85%', 'end 70%']
  });

  // Step 1: MoA enters
  const moaOpacity = useTransform(scrollYProgress, [0, 0.18], [0.3, 1]);
  const moaScale = useTransform(scrollYProgress, [0, 0.18], [0.92, 1]);

  // Step 2: Vertical terracotta connector draws down to RDD
  const verticalLineProgress = useTransform(scrollYProgress, [0.12, 0.35], [0, 1]);

  // Step 3: RDD logo appears
  const rddOpacity = useTransform(scrollYProgress, [0.25, 0.45], [0.3, 1]);
  const rddScale = useTransform(scrollYProgress, [0.25, 0.45], [0.92, 1]);

  // Step 4: Curved terracotta strings fan out from RDD to department nodes
  const stringsProgress = useTransform(scrollYProgress, [0.35, 0.72], [0, 1]);

  // Step 5: Department nodes pop in smoothly as strings reach them
  const deptsOpacity = useTransform(scrollYProgress, [0.55, 0.8], [0, 1]);
  const deptsY = useTransform(scrollYProgress, [0.55, 0.8], [18, 0]);

  // Dynamic layout calculations for any count N
  const SVG_WIDTH = 1000;
  const CENTER_X = 500;
  const SVG_HEIGHT = 112;

  // Compute targetX for each department node
  const nodeTargets = activeDepts.map((dept, index) => {
    let targetX: number;
    if (count === 1) {
      targetX = CENTER_X;
    } else if (count <= 3) {
      const step = 260;
      targetX = CENTER_X + (index - (count - 1) / 2) * step;
    } else {
      // Even distribution across 1000px canvas
      const margin = 62.5;
      const step = (SVG_WIDTH - margin * 2) / (count - 1);
      targetX = margin + index * step;
    }
    return { dept, targetX };
  });

  return (
    <div ref={containerRef} className="w-full py-8 relative select-none">
      {/* =========================================================================
          DESKTOP CANVAS (Hidden on sm screens, visible on md+)
          ========================================================================= */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-50px' }}
        className="hidden md:flex flex-col items-center max-w-6xl mx-auto px-2"
      >
        {/* 1. Parent Node: Masters Of All */}
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
              src="/drawing1.png"
              alt="Masters Of All"
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          <span className="mt-2 text-sm font-bold tracking-tight text-[#EDE9E0]">
            Masters Of All
          </span>
        </motion.div>

        {/* 2. Vertical Solid/Dotted Terracotta Line to RDD */}
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

        {/* 3. Sub-Organization: RDD with official collage badge */}
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
              src="/5320.jpg"
              alt="Research Discover and Development"
              className="w-full h-full object-cover rounded-full"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/rdd-logo.jpg';
              }}
            />
          </div>
          <span className="mt-2 text-xs font-semibold tracking-wide text-white text-center">
            Research Discover and Development
          </span>
        </motion.div>

        {/* 4. Smooth Curved Terracotta Bezier Strings radiating to the exact top of each department circle */}
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

        {/* 5. Department Nodes Row: Large 84px circles with authentic icons */}
        <div className="w-full flex items-start justify-between gap-1 pt-0 max-w-6xl mx-auto">
          {nodeTargets.map(({ dept }, i) => (
            <motion.button
              key={dept.id}
              onClick={() => onSelectDepartment(dept.slug)}
              variants={{
                hidden: { opacity: 0, scale: 0.7, y: 15 },
                visible: {
                  opacity: 1,
                  scale: 1,
                  y: 0,
                  transition: {
                    duration: 0.5,
                    delay: 1.1 + i * 0.06,
                    ease: [0.16, 1, 0.3, 1]
                  }
                }
              }}
              whileHover={{ y: -6, scale: 1.05 }}
              className="flex flex-col items-center text-center p-2 rounded-2xl group transition-all duration-300 focus:outline-none cursor-pointer flex-1 min-w-0"
            >
              {/* Department circle: 84px, clear authentic glyph with shadow */}
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

              {/* Department label */}
              <span className="mt-3 text-xs font-bold text-[#EDE9E0] group-hover:text-[#25CDB6] transition-colors leading-snug line-clamp-2 max-w-[110px]">
                {dept.name}
              </span>

              <span className="text-[11px] text-[#CA7952] opacity-0 group-hover:opacity-100 transition-opacity mt-1 flex items-center gap-0.5 font-serif italic">
                <span>Explore</span>
                <ArrowUpRight className="w-3 h-3" />
              </span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* =========================================================================
          MOBILE VIEW (Vertical Stack with animated dotted line)
          ========================================================================= */}
      <div className="md:hidden flex flex-col items-center max-w-sm mx-auto px-4">
        {/* Parent Node: MoA */}
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 rounded-full overflow-hidden shadow-xl border-2 border-[#D0A873]/60 bg-[#06302F] p-1">
            <img
              src="/drawing1.png"
              alt="Masters Of All"
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          <span className="mt-2 text-sm font-bold text-[#EDE9E0]">
            Masters Of All
          </span>
        </div>

        {/* Vertical Line */}
        <div className="w-px h-8 border-l-2 border-[#CA7952] my-1" />

        {/* RDD Node */}
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[#25CDB6] shadow-xl bg-[#06302F] p-1">
            <img
              src="/5320.jpg"
              alt="RDD"
              className="w-full h-full object-cover rounded-full"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/rdd-logo.jpg';
              }}
            />
          </div>
          <span className="mt-1 text-xs font-semibold text-white text-center">
            Research Discover and Development
          </span>
        </div>

        {/* Vertical Line */}
        <div className="w-px h-8 border-l-2 border-[#CA7952] my-1" />

        {/* Department Nodes list */}
        <div className="w-full space-y-3 relative">
          <div className="absolute left-[34px] top-5 bottom-5 w-px border-l-2 border-dotted border-[#CA7952] pointer-events-none" />
          {activeDepts.map(dept => (
            <button
              key={dept.id}
              onClick={() => onSelectDepartment(dept.slug)}
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
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
