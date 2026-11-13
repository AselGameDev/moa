import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Compass, Hammer, Sparkles, ArrowRight, Mail } from 'lucide-react';
import { HeroOrbitVisual } from '../components/HeroOrbitVisual';
import { AtmosphericBackground } from '../components/AtmosphericBackground';
import { SocialIconStrip } from '../components/SocialIcons';
import { EditableText } from '../components/EditableText';
import { SiteContent, Department } from '../types';

interface HomeViewProps {
  content: SiteContent;
  departments?: Department[];
  onNavigate: (path: string) => void;
  isEditMode?: boolean;
  onUpdateContent?: (fieldPath: string, newValue: string) => void;
  socialLinks?: Array<{ id: string; platform: string; url: string; icon?: string }>;
}

export const HomeView: React.FC<HomeViewProps> = ({
  content,
  departments = [],
  onNavigate,
  isEditMode = false,
  onUpdateContent = () => {},
  socialLinks
}) => {
  const [activePanel, setActivePanel] = useState<number | null>(null);

  const panels = [
    {
      id: 0,
      title: content?.home?.exploreTitle || 'EXPLORE',
      titleField: 'home.exploreTitle',
      description: content?.home?.exploreText || 'Curiosity, research, discovery, questioning and understanding.',
      descField: 'home.exploreText',
      icon: Compass,
      accent: '#06302F',
      subtext: 'The foundation of all knowledge begins with fearless enquiry.'
    },
    {
      id: 1,
      title: content?.home?.createTitle || 'CREATE',
      titleField: 'home.createTitle',
      description: content?.home?.createText || 'Experimentation, innovation, engineering, creativity and implementation.',
      descField: 'home.createText',
      icon: Hammer,
      accent: '#CA7952',
      subtext: 'Turning theoretical discovery into tangible structures and tools.'
    },
    {
      id: 2,
      title: content?.home?.transformTitle || 'TRANSFORM',
      titleField: 'home.transformTitle',
      description: content?.home?.transformText || 'Meaningful impact, progress, practical solutions and empowerment.',
      descField: 'home.transformText',
      icon: Sparkles,
      accent: '#17A491',
      subtext: 'Delivering real change that elevates human capability and society.'
    }
  ];

  return (
    <div className="min-h-screen">
      {/* =========================================================================
          1. HERO SECTION: Exactly Two-Line Headline + Subheadline + CTA + Hero Orbit
          ========================================================================= */}
      <AtmosphericBackground
        intensity="full"
        className="min-h-[calc(100vh-5rem)] min-h-[calc(100dvh-5rem)] flex flex-col justify-center py-8 sm:py-12 lg:py-16"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* On mobile: Orbit Visual placed above headline with balanced footprint */}
            <div className="lg:hidden flex justify-center">
              <HeroOrbitVisual departments={departments} onNavigate={onNavigate} />
            </div>

            {/* Left Content */}
            <div className="lg:col-span-7 space-y-5 sm:space-y-7 z-20 text-center lg:text-left">
              {/* Headline: Exactly two lines (Line 1: Understanding the world, Line 2: Building what comes next) */}
              <h1
                className="font-black text-[#EDE9E0] flex flex-col tracking-tight text-3xl sm:text-4xl md:text-5xl lg:text-[40px] xl:text-[52px] leading-[1.12]"
                style={{
                  letterSpacing: '-0.03em'
                }}
              >
                {/* Line 1: "Understanding the world." */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.65, ease: [0.2, 0.7, 0.2, 1] }}
                >
                  <EditableText
                    value={content?.home?.heroHeadlineLine1 || 'Understanding the world.'}
                    fieldPath="home.heroHeadlineLine1"
                    label="Headline Line 1"
                    isEditMode={isEditMode}
                    onUpdate={onUpdateContent}
                    className="block text-[#EDE9E0] sm:whitespace-nowrap"
                  />
                </motion.div>

                {/* Line 2: "Building what comes next." in mint #25CDB6 */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.65, delay: 0.15, ease: [0.2, 0.7, 0.2, 1] }}
                >
                  <EditableText
                    value={content?.home?.heroHeadlineLine2 || 'Building what comes next.'}
                    fieldPath="home.heroHeadlineLine2"
                    label="Headline Line 2"
                    isEditMode={isEditMode}
                    onUpdate={onUpdateContent}
                    className="block text-[#25CDB6] mt-1 sm:mt-2 sm:whitespace-nowrap"
                  />
                </motion.div>
              </h1>

              {/* Subheadline */}
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.25, ease: [0.2, 0.7, 0.2, 1] }}
                className="text-base sm:text-lg text-[#EDE9E0]/85 max-w-xl mx-auto lg:mx-0 leading-relaxed"
              >
                <EditableText
                  value={
                    content?.home?.heroSubheadline ||
                    'Masters Of All brings together diverse disciplines to understand fundamental truths, engineer practical tools, and create transformative solutions.'
                  }
                  fieldPath="home.heroSubheadline"
                  label="Hero Subheadline"
                  multiline
                  isEditMode={isEditMode}
                  onUpdate={onUpdateContent}
                  className="block"
                />
              </motion.div>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.36, ease: [0.2, 0.7, 0.2, 1] }}
                className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3 sm:gap-4 pt-2"
              >
                <button
                  onClick={() => onNavigate('/departments')}
                  className="px-6 py-3.5 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] font-bold text-sm transition-all duration-200 hover:-translate-y-0.5 shadow-lg shadow-[#17A491]/25 flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <span>Meet the departments</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>

                <button
                  onClick={() => onNavigate('/projects')}
                  className="px-6 py-3.5 rounded-xl border border-[#EDE9E0]/20 hover:border-[#EDE9E0]/50 hover:bg-white/5 text-[#EDE9E0] font-semibold text-sm transition-all duration-200 hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>See our projects</span>
                </button>
              </motion.div>
            </div>

            {/* Right Visual (5 cols on desktop) */}
            <div className="hidden lg:flex lg:col-span-5 justify-center">
              <HeroOrbitVisual departments={departments} onNavigate={onNavigate} />
            </div>
          </div>
        </div>
      </AtmosphericBackground>

      {/* =========================================================================
          2. IVORY BAND: THREE TALL EXPANDING PANELS (~60% VIEWPORT HEIGHT)
          ========================================================================= */}
      <section className="bg-[#EDE9E0] text-[#06302F] py-20 lg:py-24 transition-colors overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-center max-w-3xl mx-auto mb-14 space-y-3"
          >
            <span className="text-xs uppercase tracking-widest text-[#17A491] font-bold">
              THE METHODOLOGY
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#06302F]">
              Three Dimensions of Action
            </h2>
            <p className="text-sm sm:text-base text-[#06302F]/70">
              Hover to expand each pillar of our operating model.
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
            {panels.map((panel) => {
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
                  className={`relative p-8 sm:p-10 rounded-2xl bg-white border border-[#06302F]/10 shadow-sm transition-all duration-500 ease-out flex flex-col justify-between overflow-hidden cursor-pointer ${flexClass} hover:shadow-xl hover:border-[#17A491]/40`}
                >
                  {/* Decorative top color accent bar */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1.5 transition-all duration-300"
                    style={{ backgroundColor: panel.accent }}
                  />

                  {/* Panel Top */}
                  <div className="space-y-6">
                    <div className="w-14 h-14 rounded-xl bg-[#EDE9E0]/80 flex items-center justify-center text-[#06302F] transition-transform duration-300 group-hover:scale-110">
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

                    <div className="text-base text-[#06302F]/80 leading-relaxed font-medium">
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

                  {/* Panel Bottom */}
                  <div className="pt-8 border-t border-[#06302F]/10 mt-8">
                    <p className="text-xs text-[#06302F]/60 leading-relaxed">
                      {panel.subtext}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* =========================================================================
          3. WORD-BY-WORD QUESTION STATEMENT WITH OVERSIZED TERRACOTTA GLYPH
          ========================================================================= */}
      <section className="py-24 sm:py-32 bg-[#06302F] relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="text-[#CA7952] font-serif text-8xl sm:text-9xl leading-none select-none opacity-40 mb-2">
            “
          </div>

          <motion.blockquote
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
            className="text-2xl sm:text-3xl md:text-4xl font-serif italic text-[#EDE9E0] leading-snug tracking-tight"
          >
            <EditableText
              value={content?.home?.questionStatement || 'Every meaningful solution begins with a question.'}
              fieldPath="home.questionStatement"
              label="Philosophy Question Statement"
              multiline
              isEditMode={isEditMode}
              onUpdate={onUpdateContent}
            />
          </motion.blockquote>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-8"
          >
            <button
              onClick={() => onNavigate('/about')}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#25CDB6] hover:text-white transition-colors group cursor-pointer"
            >
              <span className="border-b border-[#25CDB6]/40 group-hover:border-white pb-0.5">
                Read our story
              </span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* =========================================================================
          4. TAGLINE: VERY LARGE ANIMATED TYPOGRAPHIC STATEMENT (Shown Once)
          ========================================================================= */}
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
                Believe.
              </span>
              <span className="inline-block text-[#25CDB6] hover:text-[#17A491] transition-colors">
                Build.
              </span>
              <span className="inline-block text-[#CA7952] hover:text-[#E58F67] transition-colors">
                Become.
              </span>
            </h2>
            <p className="text-base sm:text-lg text-[#EDE9E0]/70 max-w-2xl mx-auto leading-relaxed">
              An ecosystem where questions are taken seriously, tools are engineered with precision, and human potential is unlocked.
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
};
