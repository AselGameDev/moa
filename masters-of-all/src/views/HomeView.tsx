import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Compass, Hammer, Sparkles, ArrowRight } from 'lucide-react';
import { HeroOrbitVisual } from '../components/HeroOrbitVisual';
import { AtmosphericBackground } from '../components/AtmosphericBackground';
import { EditableText } from '../components/EditableText';
import { WordByWordText } from '../components/WordByWordText';
import { SpaLink } from '../components/SpaLink';
import { useContent } from '../hooks/useContent';
import { SiteContent, Department } from '../types';

interface HomeViewProps {
  content: SiteContent;
  departments?: Department[];
  onNavigate: (path: string) => void;
  isEditMode?: boolean;
  onUpdateContent?: (fieldPath: string, newValue: string) => void;
  logoUrl?: string;
}

export const HomeView: React.FC<HomeViewProps> = ({
  content: rawContent,
  departments = [],
  onNavigate,
  isEditMode = false,
  onUpdateContent = () => {},
  logoUrl = '/drawing1.png'
}) => {
  const [activePanel, setActivePanel] = useState<number | null>(null);
  const { content } = useContent(rawContent);

  const panels = [
    {
      id: 0,
      title: content.home.exploreTitle,
      titleField: 'home.exploreTitle',
      description: content.home.exploreText,
      descField: 'home.exploreText',
      subtext: content.home.exploreSubtext,
      subField: 'home.exploreSubtext',
      icon: Compass,
      accent: '#06302F'
    },
    {
      id: 1,
      title: content.home.createTitle,
      titleField: 'home.createTitle',
      description: content.home.createText,
      descField: 'home.createText',
      subtext: content.home.createSubtext,
      subField: 'home.createSubtext',
      icon: Hammer,
      accent: '#CA7952'
    },
    {
      id: 2,
      title: content.home.transformTitle,
      titleField: 'home.transformTitle',
      description: content.home.transformText,
      descField: 'home.transformText',
      subtext: content.home.transformSubtext,
      subField: 'home.transformSubtext',
      icon: Sparkles,
      accent: '#17A491'
    }
  ];

  return (
    <div className="min-h-screen">
      {/* 1. HERO SECTION */}
      <AtmosphericBackground
        intensity="full"
        className="min-h-[calc(100vh-5rem)] min-h-[calc(100dvh-5rem)] flex flex-col justify-center py-8 sm:py-12 lg:py-16"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:hidden flex justify-center relative z-30">
              <HeroOrbitVisual departments={departments} onNavigate={onNavigate} logoUrl={logoUrl} />
            </div>

            <div className="lg:col-span-7 space-y-5 sm:space-y-7 z-20 text-center lg:text-left">
              <h1
                className="font-black text-[#EDE9E0] flex flex-col tracking-tight text-3xl sm:text-4xl md:text-5xl lg:text-[40px] xl:text-[52px] leading-[1.12]"
                style={{ letterSpacing: '-0.03em' }}
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.65, ease: [0.2, 0.7, 0.2, 1] }}
                >
                  <EditableText
                    value={content.home.heroHeadlineLine1}
                    fieldPath="home.heroHeadlineLine1"
                    label="Headline Line 1"
                    isEditMode={isEditMode}
                    onUpdate={onUpdateContent}
                    className="block text-[#EDE9E0] sm:whitespace-nowrap"
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.65, delay: 0.15, ease: [0.2, 0.7, 0.2, 1] }}
                >
                  <EditableText
                    value={content.home.heroHeadlineLine2}
                    fieldPath="home.heroHeadlineLine2"
                    label="Headline Line 2"
                    isEditMode={isEditMode}
                    onUpdate={onUpdateContent}
                    className="block text-[#25CDB6] mt-1 sm:mt-2 sm:whitespace-nowrap"
                  />
                </motion.div>
              </h1>

              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.25, ease: [0.2, 0.7, 0.2, 1] }}
                className="text-base sm:text-lg text-[#EDE9E0]/85 max-w-xl mx-auto lg:mx-0 leading-relaxed"
              >
                <EditableText
                  value={content.home.heroSubheadline}
                  fieldPath="home.heroSubheadline"
                  label="Hero Subheadline"
                  multiline
                  isEditMode={isEditMode}
                  onUpdate={onUpdateContent}
                  className="block"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.36, ease: [0.2, 0.7, 0.2, 1] }}
                className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3 sm:gap-4 pt-2"
              >
                <SpaLink
                  href="/departments"
                  onNavigate={onNavigate}
                  className="min-h-[44px] px-6 py-3 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] font-bold text-sm transition-all duration-200 hover:-translate-y-0.5 shadow-lg shadow-[#17A491]/25 flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <EditableText
                    value={content.home.primaryCtaLabel}
                    fieldPath="home.primaryCtaLabel"
                    label="Primary Button Label"
                    isEditMode={isEditMode}
                    onUpdate={onUpdateContent}
                  />
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </SpaLink>

                <SpaLink
                  href="/projects"
                  onNavigate={onNavigate}
                  className="min-h-[44px] px-6 py-3 rounded-xl border border-[#EDE9E0]/25 hover:border-[#EDE9E0]/55 hover:bg-white/5 text-[#EDE9E0] font-semibold text-sm transition-all duration-200 hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <EditableText
                    value={content.home.secondaryCtaLabel}
                    fieldPath="home.secondaryCtaLabel"
                    label="Secondary Button Label"
                    isEditMode={isEditMode}
                    onUpdate={onUpdateContent}
                  />
                </SpaLink>
              </motion.div>
            </div>

            <div className="hidden lg:flex lg:col-span-5 justify-center relative z-30">
              <HeroOrbitVisual departments={departments} onNavigate={onNavigate} logoUrl={logoUrl} />
            </div>
          </div>
        </div>
      </AtmosphericBackground>

      {/* 2. IVORY BAND: THREE TALL EXPANDING PANELS */}
      <section className="bg-[#EDE9E0] text-[#06302F] py-20 lg:py-24 transition-colors overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-center max-w-3xl mx-auto mb-14 space-y-3"
          >
            <EditableText
              value={content.home.methodologyEyebrow}
              fieldPath="home.methodologyEyebrow"
              label="Methodology Eyebrow"
              isEditMode={isEditMode}
              onUpdate={onUpdateContent}
              as="span"
              className="text-xs uppercase tracking-widest text-[#0D6E61] font-bold block"
            />
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#06302F]">
              <EditableText
                value={content.home.methodologyHeading}
                fieldPath="home.methodologyHeading"
                label="Methodology Heading"
                isEditMode={isEditMode}
                onUpdate={onUpdateContent}
              />
            </h2>
            <p className="text-sm sm:text-base text-[#06302F]/85">
              <EditableText
                value={content.home.methodologySubheading}
                fieldPath="home.methodologySubheading"
                label="Methodology Subheading"
                isEditMode={isEditMode}
                onUpdate={onUpdateContent}
              />
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={{
              hidden: {},
              visible: {
                transition: {
                  staggerChildren: 0.12,
                  delayChildren: 0.1
                }
              }
            }}
            className="flex flex-col lg:flex-row gap-6 min-h-[55vh]"
          >
            {panels.map(panel => {
              const Icon = panel.icon;
              const isHovered = activePanel === panel.id;
              const anyHovered = activePanel !== null;

              let flexClass = 'lg:flex-1';
              if (anyHovered) {
                flexClass = isHovered ? 'lg:flex-[1.6]' : 'lg:flex-[0.7]';
              }

              return (
                <motion.div
                  key={panel.id}
                  variants={{
                    hidden: { opacity: 0, y: 30, scale: 0.95 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      scale: 1,
                      transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] }
                    }
                  }}
                  onMouseEnter={() => setActivePanel(panel.id)}
                  onMouseLeave={() => setActivePanel(null)}
                  className={`relative p-8 sm:p-10 rounded-2xl bg-white border border-[#06302F]/10 shadow-sm transition-all duration-500 ease-out flex flex-col justify-between overflow-hidden ${flexClass} hover:shadow-xl hover:border-[#17A491]/40`}
                >
                  <div
                    className="absolute top-0 left-0 right-0 h-1.5 transition-all duration-300"
                    style={{ backgroundColor: panel.accent }}
                  />

                  <div className="space-y-6">
                    <div className="w-14 h-14 rounded-xl bg-[#EDE9E0]/80 flex items-center justify-center text-[#06302F] transition-transform duration-300">
                      <Icon
                        className={`w-7 h-7 transition-transform duration-500 ${
                          panel.id === 0 && isHovered
                            ? 'rotate-45'
                            : panel.id === 1 && isHovered
                              ? '-rotate-12 translate-y-[-2px]'
                              : panel.id === 2 && isHovered
                                ? 'scale-125'
                                : ''
                        }`}
                        style={{ color: panel.accent }}
                      />
                    </div>

                    <h3 className="text-3xl font-extrabold tracking-tight text-[#06302F]">
                      <EditableText
                        value={panel.title}
                        fieldPath={panel.titleField}
                        label={`${panel.title} Title`}
                        isEditMode={isEditMode}
                        onUpdate={onUpdateContent}
                      />
                    </h3>

                    <div className="text-base text-[#06302F]/90 leading-relaxed font-medium">
                      <EditableText
                        value={panel.description}
                        fieldPath={panel.descField}
                        label={`${panel.title} Description`}
                        multiline
                        isEditMode={isEditMode}
                        onUpdate={onUpdateContent}
                      />
                    </div>
                  </div>

                  <div className="pt-8 border-t border-[#06302F]/15 mt-8">
                    <div className="text-xs text-[#06302F]/85 leading-relaxed">
                      <EditableText
                        value={panel.subtext}
                        fieldPath={panel.subField}
                        label={`${panel.title} Subtext`}
                        multiline
                        isEditMode={isEditMode}
                        onUpdate={onUpdateContent}
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* 3. WORD-BY-WORD QUESTION STATEMENT */}
      <section className="py-24 sm:py-32 bg-[#06302F] relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="text-[#CA7952] font-serif text-8xl sm:text-9xl leading-none opacity-40 mb-2" aria-hidden="true">
            “
          </div>

          <blockquote className="text-2xl sm:text-3xl md:text-4xl font-serif italic text-[#EDE9E0] leading-snug tracking-tight">
            {isEditMode ? (
              <EditableText
                value={content.home.questionStatement}
                fieldPath="home.questionStatement"
                label="Philosophy Question Statement"
                multiline
                isEditMode={isEditMode}
                onUpdate={onUpdateContent}
              />
            ) : (
              <WordByWordText
                text={content.home.questionStatement}
                staggerSeconds={0.055}
                durationSeconds={0.5}
                yOffset={14}
              />
            )}
          </blockquote>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-8"
          >
            <SpaLink
              href="/about"
              onNavigate={onNavigate}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#25CDB6] hover:text-white transition-colors group cursor-pointer"
            >
              <span className="border-b border-[#25CDB6]/40 group-hover:border-white pb-0.5">
                <EditableText
                  value={content.home.readStoryLabel}
                  fieldPath="home.readStoryLabel"
                  label="Read Our Story Link"
                  isEditMode={isEditMode}
                  onUpdate={onUpdateContent}
                />
              </span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </SpaLink>
          </motion.div>
        </div>
      </section>

      {/* 4. TAGLINE */}
      <section className="py-24 sm:py-36 overflow-hidden border-t border-[#EDE9E0]/10 bg-[#041D1C]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.2, 0.7, 0.2, 1] }}
            className="space-y-8"
          >
            <h2 className="text-5xl xs:text-6xl sm:text-7xl lg:text-7xl xl:text-8xl font-black tracking-tight text-[#EDE9E0] leading-tight flex flex-col lg:flex-row items-center justify-center gap-2 sm:gap-4 lg:gap-5 xl:gap-7 text-center">
              <span className="inline-block hover:text-white transition-colors">
                <EditableText
                  value={content.home.believeWord}
                  fieldPath="home.believeWord"
                  label="Triad Word 1"
                  isEditMode={isEditMode}
                  onUpdate={onUpdateContent}
                />
                .
              </span>
              <span className="inline-block text-[#25CDB6] hover:text-[#17A491] transition-colors">
                <EditableText
                  value={content.home.buildWord}
                  fieldPath="home.buildWord"
                  label="Triad Word 2"
                  isEditMode={isEditMode}
                  onUpdate={onUpdateContent}
                />
                .
              </span>
              <span className="inline-block text-[#CA7952] hover:text-[#E58F67] transition-colors">
                <EditableText
                  value={content.home.becomeWord}
                  fieldPath="home.becomeWord"
                  label="Triad Word 3"
                  isEditMode={isEditMode}
                  onUpdate={onUpdateContent}
                />
                .
              </span>
            </h2>
            <p className="text-base sm:text-lg text-[#EDE9E0]/80 max-w-2xl mx-auto leading-relaxed">
              <EditableText
                value={content.home.bottomTaglineSubtext}
                fieldPath="home.bottomTaglineSubtext"
                label="Bottom Tagline Subtext"
                multiline
                isEditMode={isEditMode}
                onUpdate={onUpdateContent}
              />
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
};
