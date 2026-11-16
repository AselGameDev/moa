import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { EditableText } from '../components/EditableText';
import { DepartmentIcon } from '../components/DepartmentIcon';
import { ScrollHierarchyTree } from '../components/ScrollHierarchyTree';
import { AtmosphericBackground } from '../components/AtmosphericBackground';
import { SpaLink } from '../components/SpaLink';
import { useContent } from '../hooks/useContent';
import { Department, SiteContent } from '../types';
import { formatDepartmentCountText } from '../utils/numberToWords';

interface DepartmentsViewProps {
  departments: Department[];
  content: SiteContent;
  onNavigate: (path: string) => void;
  isEditMode?: boolean;
  onUpdateContent?: (fieldPath: string, newValue: string) => void;
  moaLogoUrl?: string;
  rddLogoUrl?: string;
  siteName?: string;
}

export const DepartmentsView: React.FC<DepartmentsViewProps> = ({
  departments,
  content: rawContent,
  onNavigate,
  isEditMode = false,
  onUpdateContent = () => {},
  moaLogoUrl = '/drawing1.png',
  rddLogoUrl = '/5320.jpg',
  siteName = 'Masters Of All'
}) => {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const { content } = useContent(rawContent);

  const publishedDepts = departments.filter(d => d.published && !d.deletedAt);
  const count = publishedDepts.length;

  const introTemplate = content.departments.rddIntro;
  const introText = formatDepartmentCountText(introTemplate, count);
  const directoryTitle = formatDepartmentCountText(
    content.departments.directoryTitleTemplate,
    count
  );

  return (
    <div className="min-h-screen">
      <AtmosphericBackground
        intensity="subtle"
        fadeToColor="transparent"
        className="pt-16 pb-12 lg:pt-20 lg:pb-16"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="max-w-3xl mx-auto space-y-4 text-center">
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.2, 0.7, 0.2, 1] }}
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#EDE9E0] tracking-tight text-center"
            >
              <EditableText
                value={content.departments.heading}
                fieldPath="departments.heading"
                label="Departments Page Heading"
                isEditMode={isEditMode}
                onUpdate={onUpdateContent}
              />
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.2, 0.7, 0.2, 1] }}
              className="text-base sm:text-lg text-[#EDE9E0]/80 leading-relaxed max-w-2xl mx-auto text-center"
            >
              <EditableText
                value={introTemplate}
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

          <div>
            <ScrollHierarchyTree
              departments={publishedDepts}
              onSelectDepartment={slug => onNavigate(`/departments/${slug}`)}
              moaLogoUrl={moaLogoUrl}
              rddLogoUrl={rddLogoUrl}
              siteName={siteName}
            />
          </div>
        </div>
      </AtmosphericBackground>

      {count > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
          <div className="border-t border-[#EDE9E0]/10 pt-20 space-y-12">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <EditableText
                  value={content.departments.directoryEyebrow}
                  fieldPath="departments.directoryEyebrow"
                  label="Directory Eyebrow"
                  isEditMode={isEditMode}
                  onUpdate={onUpdateContent}
                  as="span"
                  className="text-xs uppercase tracking-widest text-[#25CDB6] font-bold block"
                />
                <h2 className="text-3xl sm:text-4xl font-extrabold text-[#EDE9E0] tracking-tight mt-1">
                  <EditableText
                    value={content.departments.directoryTitleTemplate}
                    fieldPath="departments.directoryTitleTemplate"
                    label="Directory Title Template"
                    isEditMode={isEditMode}
                    onUpdate={onUpdateContent}
                  >
                    {directoryTitle}
                  </EditableText>
                </h2>
              </div>
              <p className="text-sm text-[#EDE9E0]/60 max-w-sm">
                <EditableText
                  value={content.departments.directorySubtitle}
                  fieldPath="departments.directorySubtitle"
                  label="Directory Subtitle"
                  multiline
                  isEditMode={isEditMode}
                  onUpdate={onUpdateContent}
                />
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
                    onMouseEnter={() => setHoveredRow(dept.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    <SpaLink
                      href={`/departments/${dept.slug}`}
                      onNavigate={onNavigate}
                      className="group relative py-7 sm:py-9 px-4 sm:px-8 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6"
                    >
                      <div
                        className={`absolute inset-0 transition-opacity duration-300 pointer-events-none ${
                          isHovered ? 'opacity-100' : 'opacity-0'
                        }`}
                        style={{
                          backgroundColor: `${dept.colorHex || '#17A491'}12`,
                          borderLeft: `4px solid ${dept.colorHex || '#25CDB6'}`
                        }}
                      />

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
                            {dept.introduction || dept.purpose || ''}
                          </p>
                        </div>
                      </div>

                      <div className="relative z-10 flex items-center gap-4 text-xs font-semibold text-[#EDE9E0]/70 group-hover:text-[#25CDB6] transition-colors self-end md:self-auto">
                        {dept.areasOfFocus && dept.areasOfFocus.length > 0 && (
                          <span className="hidden sm:inline-block px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px]">
                            {dept.areasOfFocus.length} Focus Areas
                          </span>
                        )}
                        <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                          <span>{content.departments.exploreButtonLabel}</span>
                          <ArrowRight className="w-4 h-4" />
                        </span>
                      </div>
                    </SpaLink>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
};
