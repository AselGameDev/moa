import React, { useState } from 'react';
import { motion } from 'motion/react';
import { EditableText } from '../components/EditableText';
import { Department } from '../types';
import { DepartmentIcon } from '../components/DepartmentIcon';
import { ScrollHierarchyTree } from '../components/ScrollHierarchyTree';
import { AtmosphericBackground } from '../components/AtmosphericBackground';
import { ArrowRight } from 'lucide-react';
import { numberToWords } from '../utils/numberToWords';

interface DepartmentsViewProps {
  departments: Department[];
  onNavigate: (path: string) => void;
  rddIntro?: string;
  isEditMode?: boolean;
  onUpdateContent?: (fieldPath: string, newValue: string) => void;
}

export const DepartmentsView: React.FC<DepartmentsViewProps> = ({
  departments,
  onNavigate,
  rddIntro,
  isEditMode = false,
  onUpdateContent = () => {}
}) => {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const publishedDepts = departments.filter(d => d.published);
  const count = publishedDepts.length;
  const countWord = numberToWords(count);

  const introText = rddIntro
    ? rddIntro.replace(/{departmentCount}/gi, countWord.toLowerCase())
    : `RDD, Research, Discovery and Development, is a sub-organization of Masters Of All. It oversees the ${countWord.toLowerCase()} departments below.`;

  return (
    <div className="min-h-screen">
      {/* Header and Tree with Atmospheric Background */}
      <AtmosphericBackground intensity="subtle" fadeToColor="transparent" className="pt-16 pb-12 lg:pt-20 lg:pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          {/* Short RDD Intro */}
          <div className="max-w-3xl mx-auto space-y-4 text-center">
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.2, 0.7, 0.2, 1] }}
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#EDE9E0] tracking-tight text-center"
            >
              Departments & RDD
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.2, 0.7, 0.2, 1] }}
              className="text-base sm:text-lg text-[#EDE9E0]/80 leading-relaxed max-w-2xl mx-auto text-center"
            >
              <EditableText
                value={rddIntro || introText}
                fieldPath="departments.rddIntro"
                label="RDD Overview Introduction"
                isEditMode={isEditMode}
                onUpdate={onUpdateContent}
                multiline
                as="p"
              >
                {introText}
              </EditableText>
            </motion.div>
          </div>

          {/* The Animated Dotted Hierarchy Tree */}
          <div>
            <ScrollHierarchyTree
              departments={publishedDepts}
              onSelectDepartment={slug => onNavigate(`/departments/${slug}`)}
            />
          </div>
        </div>
      </AtmosphericBackground>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        {/* EDITORIAL DIRECTORY OF DEPARTMENTS */}
        <div className="border-t border-[#EDE9E0]/10 pt-20 space-y-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-xs uppercase tracking-widest text-[#25CDB6] font-bold">
                Directory
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#EDE9E0] tracking-tight mt-1">
                The {countWord} Disciplines
              </h2>
            </div>
            <p className="text-sm text-[#EDE9E0]/60 max-w-sm">
              Explore mandates, theoretical questions, and active programs within each department.
            </p>
          </div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={{
              hidden: {},
              visible: {
                transition: {
                  staggerChildren: 0.06
                }
              }
            }}
            className="divide-y divide-[#EDE9E0]/10 border-y border-[#EDE9E0]/10"
          >
            {publishedDepts.map(dept => {
              const isHovered = hoveredRow === dept.id;

              return (
                <motion.div
                  key={dept.id}
                  variants={{
                    hidden: { opacity: 0, y: 16 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } }
                  }}
                  onClick={() => onNavigate(`/departments/${dept.slug}`)}
                  onMouseEnter={() => setHoveredRow(dept.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  className="group relative py-7 sm:py-9 px-4 sm:px-8 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                  {/* Subtle color flood background on hover */}
                  <div
                    className={`absolute inset-0 transition-opacity duration-300 pointer-events-none ${
                      isHovered ? 'opacity-100' : 'opacity-0'
                    }`}
                    style={{
                      backgroundColor: `${dept.colorHex || '#17A491'}12`,
                      borderLeft: `4px solid ${dept.colorHex || '#25CDB6'}`
                    }}
                  />

                  {/* Left: Icon + Big Typographic Name */}
                  <div className="relative z-10 flex items-center gap-5">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg border border-white/10 shrink-0 transition-transform group-hover:scale-110"
                      style={{
                        backgroundColor: dept.iconBgHex || '#EDE9E0',
                        color: dept.colorHex || '#06302F'
                      }}
                    >
                      <DepartmentIcon
                        glyph={dept.iconGlyph}
                        iconUrl={dept.iconUrl}
                        size={24}
                        color={dept.colorHex || '#06302F'}
                      />
                    </div>
                    <div>
                      <h3 className="text-xl sm:text-2xl font-bold text-[#EDE9E0] group-hover:text-white transition-colors">
                        {dept.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-[#EDE9E0]/60 line-clamp-1 mt-0.5">
                        {dept.introduction || dept.purpose || 'Explore research areas and initiatives'}
                      </p>
                    </div>
                  </div>

                  {/* Right: Areas of focus count or link arrow */}
                  <div className="relative z-10 flex items-center gap-4 text-xs font-semibold text-[#EDE9E0]/70 group-hover:text-[#25CDB6] transition-colors self-end md:self-auto">
                    {dept.areasOfFocus && dept.areasOfFocus.length > 0 && (
                      <span className="hidden sm:inline-block px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px]">
                        {dept.areasOfFocus.length} Focus Areas
                      </span>
                    )}
                    <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      <span>Explore</span>
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </div>
  );
};
