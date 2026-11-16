import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  HelpCircle,
  Compass,
  Brain,
  Search,
  Lightbulb,
  Wrench,
  BookOpen,
  Cpu,
  Target
} from 'lucide-react';
import { AtmosphericBackground } from '../components/AtmosphericBackground';
import { EditableText } from '../components/EditableText';
import { EditableList } from '../components/EditableList';
import { useContent } from '../hooks/useContent';
import { formatDepartmentCountText } from '../utils/numberToWords';
import {
  SiteContent,
  Department,
  WhatWeDoCardContent,
  ThinkingStepContent,
  PhilosophyPillarContent
} from '../types';

interface AboutViewProps {
  content: SiteContent;
  departments?: Department[];
  isEditMode?: boolean;
  onUpdateContent?: (fieldPath: string, newValue: unknown) => void;
}

const WHAT_WE_DO_ICONS = [Search, Cpu, BookOpen, Target];
const THINKING_STEP_ICONS = [HelpCircle, Compass, Brain, Search, Lightbulb, Wrench];

export const AboutView: React.FC<AboutViewProps> = ({
  content: rawContent,
  departments = [],
  isEditMode = false,
  onUpdateContent = () => {}
}) => {
  const { content } = useContent(rawContent);
  const publishedDepts = departments.filter(d => d.published && !d.deletedAt);

  const whatWeDoCards = content.about.whatWeDoCards || [];
  const thinkingSteps = content.about.thinkingSteps || [];
  const philosophyPillars = content.about.philosophyPillars || [];

  const [selectedStep, setSelectedStep] = useState<number>(thinkingSteps[0]?.step || 1);
  const currentStep = thinkingSteps.find(s => s.step === selectedStep) || thinkingSteps[0];
  const currentStepIndex = Math.max(0, thinkingSteps.findIndex(s => s.step === currentStep?.step));
  const StepIcon = THINKING_STEP_ICONS[currentStepIndex % THINKING_STEP_ICONS.length] || HelpCircle;

  const updateText = (fieldPath: string, newValue: string) => {
    onUpdateContent(fieldPath, newValue);
  };

  return (
    <div className="min-h-screen">
      {/* Editorial Hero */}
      <AtmosphericBackground intensity="subtle" fadeToColor="transparent" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl space-y-6">
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.2, 0.7, 0.2, 1] }}
              className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-[#EDE9E0] tracking-tight leading-[1.12]"
            >
              <EditableText
                value={content.about.heroTitle}
                fieldPath="about.heroTitle"
                label="About Hero Title"
                isEditMode={isEditMode}
                onUpdate={updateText}
                className="block"
              />
            </motion.h1>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.2, 0.7, 0.2, 1] }}
              className="text-xl sm:text-2xl font-serif italic text-[#25CDB6] leading-relaxed"
            >
              <EditableText
                value={content.about.heroSub}
                fieldPath="about.heroSub"
                label="About Hero Subtitle"
                multiline
                isEditMode={isEditMode}
                onUpdate={updateText}
                className="block"
              />
            </motion.div>
          </div>
        </div>
      </AtmosphericBackground>

      {/* Main Narrative */}
      <section className="border-t border-[#EDE9E0]/10 py-20 lg:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-32 sm:space-y-40">
          {/* 1. WHO WE ARE (Balanced single editorial column) */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-4xl mx-auto space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#17A491]/15 border border-[#17A491]/30 text-xs font-mono font-bold tracking-wider uppercase text-[#25CDB6]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#25CDB6] animate-pulse" />
              <EditableText
                value={content.about.whoWeAreBadge}
                fieldPath="about.whoWeAreBadge"
                label="Origin Badge"
                isEditMode={isEditMode}
                onUpdate={updateText}
              />
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#EDE9E0] tracking-tight leading-tight">
              <EditableText
                value={content.about.whoWeAreHeading}
                fieldPath="about.whoWeAreHeading"
                label="Who We Are Heading"
                isEditMode={isEditMode}
                onUpdate={updateText}
              />
            </h2>

            <div className="space-y-5 text-base sm:text-lg text-[#EDE9E0]/85 leading-relaxed">
              <div>
                <EditableText
                  value={content.about.whoWeAre}
                  fieldPath="about.whoWeAre"
                  label="Who We Are Narrative"
                  multiline
                  isEditMode={isEditMode}
                  onUpdate={updateText}
                  className="block leading-relaxed"
                />
              </div>
              <div className="text-sm sm:text-base text-[#EDE9E0]/70 leading-relaxed">
                <EditableText
                  value={content.about.whoWeAreSecondary}
                  fieldPath="about.whoWeAreSecondary"
                  label="Who We Are Secondary Paragraph"
                  multiline
                  isEditMode={isEditMode}
                  onUpdate={updateText}
                  className="block"
                />
              </div>
            </div>
          </motion.div>

          {/* 2. WHAT WE DO */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="border-t border-[#EDE9E0]/10 pt-20 sm:pt-28 space-y-16"
          >
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#17A491]/15 border border-[#17A491]/30 text-xs font-mono font-bold tracking-wider uppercase text-[#17A491]">
                <EditableText
                  value={content.about.whatWeDoBadge}
                  fieldPath="about.whatWeDoBadge"
                  label="What We Do Badge"
                  isEditMode={isEditMode}
                  onUpdate={updateText}
                />
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#EDE9E0] tracking-tight">
                <EditableText
                  value={content.about.whatWeDoHeading}
                  fieldPath="about.whatWeDoHeading"
                  label="What We Do Heading"
                  isEditMode={isEditMode}
                  onUpdate={updateText}
                />
              </h2>
              <div className="text-base sm:text-lg text-[#EDE9E0]/80 leading-relaxed">
                <EditableText
                  value={content.about.whatWeDo}
                  fieldPath="about.whatWeDo"
                  label="What We Do Narrative"
                  multiline
                  isEditMode={isEditMode}
                  onUpdate={updateText}
                  className="block"
                />
              </div>
            </div>

            <EditableList<WhatWeDoCardContent>
              items={whatWeDoCards}
              label="What We Do Cards"
              isEditMode={isEditMode}
              onUpdateItems={next => onUpdateContent('about.whatWeDoCards', next)}
              createEmptyItem={idx => ({
                id: `wwd-${Date.now()}`,
                index: String(idx + 1).padStart(2, '0'),
                title: 'New Focus Pillar',
                tagline: 'Subtitle',
                desc: 'Describe this focus area.',
                color: '#17A491',
                deliverables: ['Deliverable']
              })}
              fields={[
                { key: 'index', label: 'Index (e.g. 01)' },
                { key: 'title', label: 'Title' },
                { key: 'tagline', label: 'Tagline' },
                { key: 'color', label: 'Accent Color Hex' },
                { key: 'desc', label: 'Description', multiline: true },
                { key: 'deliverables', label: 'Deliverables', isStringArray: true }
              ]}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-7 max-w-6xl mx-auto">
                {whatWeDoCards.map((card, idx) => {
                  const CardIcon = WHAT_WE_DO_ICONS[idx % WHAT_WE_DO_ICONS.length];
                  return (
                    <motion.div
                      key={card.id || card.index}
                      initial={{ opacity: 0, y: 24 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.55, delay: idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
                      whileHover={{ y: -4 }}
                      className="group relative rounded-3xl p-7 sm:p-9 bg-[#042423] border border-white/10 hover:border-[#17A491]/60 transition-all duration-300 shadow-xl shadow-black/30 flex flex-col justify-between overflow-hidden"
                    >
                      <div
                        className="absolute -top-16 -right-16 w-44 h-44 rounded-full blur-3xl opacity-10 group-hover:opacity-25 transition-opacity pointer-events-none"
                        style={{ backgroundColor: card.color }}
                      />

                      <div className="space-y-5">
                        <div className="flex items-center justify-between">
                          <div
                            className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110"
                            style={{
                              backgroundColor: `${card.color}20`,
                              color: card.color,
                              border: `1px solid ${card.color}40`
                            }}
                          >
                            <CardIcon className="w-6 h-6" />
                          </div>
                          <span className="text-2xl font-serif italic text-white/20 font-bold">
                            {card.index}
                          </span>
                        </div>

                        <div>
                          <span className="text-[11px] font-mono uppercase tracking-wider text-[#D0A873] block mb-1">
                            {card.tagline}
                          </span>
                          <h3 className="text-xl sm:text-2xl font-bold text-[#EDE9E0] group-hover:text-white transition-colors">
                            {card.title}
                          </h3>
                        </div>

                        <p className="text-sm sm:text-base text-[#EDE9E0]/75 leading-relaxed">
                          {card.desc}
                        </p>
                      </div>

                      {card.deliverables && card.deliverables.length > 0 && (
                        <div className="pt-6 mt-6 border-t border-white/10">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-[#EDE9E0]/50 block mb-2 font-semibold">
                            <EditableText
                              value={content.about.deliverablesHeading}
                              fieldPath="about.deliverablesHeading"
                              label="Deliverables Heading"
                              isEditMode={isEditMode}
                              onUpdate={updateText}
                            />
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {card.deliverables.map((item, dIdx) => (
                              <span
                                key={dIdx}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-[#EDE9E0]/80 font-medium"
                              >
                                <span className="w-1 h-1 rounded-full" style={{ backgroundColor: card.color }} />
                                <span>{item}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </EditableList>
          </motion.div>

          {/* 3. HOW WE THINK */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="border-t border-[#EDE9E0]/10 pt-20 sm:pt-28 space-y-16"
          >
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#CA7952]/15 border border-[#CA7952]/30 text-xs font-mono font-bold tracking-wider uppercase text-[#CA7952]">
                <EditableText
                  value={content.about.howWeThinkBadge}
                  fieldPath="about.howWeThinkBadge"
                  label="How We Think Badge"
                  isEditMode={isEditMode}
                  onUpdate={updateText}
                />
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#EDE9E0] tracking-tight">
                <EditableText
                  value={content.about.howWeThinkHeading}
                  fieldPath="about.howWeThinkHeading"
                  label="How We Think Heading"
                  isEditMode={isEditMode}
                  onUpdate={updateText}
                />
              </h2>
              <div className="text-base sm:text-lg text-[#EDE9E0]/80 leading-relaxed">
                <EditableText
                  value={content.about.howWeThink}
                  fieldPath="about.howWeThink"
                  label="How We Think Overview"
                  multiline
                  isEditMode={isEditMode}
                  onUpdate={updateText}
                  className="block"
                />
              </div>
            </div>

            {thinkingSteps.length > 0 && currentStep && (
              <EditableList<ThinkingStepContent>
                items={thinkingSteps}
                label="Inquiry Continuum Steps"
                isEditMode={isEditMode}
                onUpdateItems={next => onUpdateContent('about.thinkingSteps', next)}
                createEmptyItem={idx => ({
                  step: idx + 1,
                  label: 'New Stage',
                  subtitle: 'Stage Subtitle',
                  desc: 'Stage overview',
                  deepDive: 'Stage deep-dive detail',
                  color: '#25CDB6'
                })}
                fields={[
                  { key: 'step', label: 'Step Number' },
                  { key: 'label', label: 'Stage Label' },
                  { key: 'subtitle', label: 'Subtitle' },
                  { key: 'color', label: 'Accent Color Hex' },
                  { key: 'desc', label: 'Short Summary', multiline: true },
                  { key: 'deepDive', label: 'Deep Dive Text', multiline: true }
                ]}
              >
                <div className="max-w-6xl mx-auto space-y-8">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                    {thinkingSteps.map((step, sIdx) => {
                      const IconComponent =
                        THINKING_STEP_ICONS[sIdx % THINKING_STEP_ICONS.length] || HelpCircle;
                      const isSelected = currentStep.step === step.step;

                      return (
                        <button
                          key={step.step}
                          type="button"
                          onClick={() => setSelectedStep(step.step)}
                          className={`relative p-4 rounded-2xl text-left transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[140px] border ${
                            isSelected
                              ? 'bg-[#093534] border-[#25CDB6] shadow-xl shadow-[#17A491]/20 scale-102 ring-1 ring-[#25CDB6]/50'
                              : 'bg-[#042423] border-white/10 hover:border-white/25 hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-[11px] font-mono font-bold text-[#EDE9E0]/50">
                              0{step.step}
                            </span>
                            <div
                              className="w-8 h-8 rounded-xl flex items-center justify-center transition-transform duration-200"
                              style={{
                                backgroundColor: `${step.color}20`,
                                color: step.color
                              }}
                            >
                              <IconComponent className="w-4 h-4" />
                            </div>
                          </div>

                          <div className="mt-4">
                            <span className="text-sm font-bold text-[#EDE9E0] block leading-tight">
                              {step.label}
                            </span>
                            <span className="text-[11px] text-[#EDE9E0]/60 block mt-0.5 truncate">
                              {step.subtitle}
                            </span>
                          </div>

                          {isSelected && (
                            <div
                              className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full"
                              style={{ backgroundColor: step.color }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentStep.step}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.25 }}
                      className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#031D1C] to-[#06302F] border border-[#25CDB6]/30 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
                    >
                      <div className="flex items-start gap-4 sm:gap-6">
                        <div
                          className="w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center shadow-lg"
                          style={{
                            backgroundColor: `${currentStep.color}25`,
                            color: currentStep.color,
                            border: `1px solid ${currentStep.color}50`
                          }}
                        >
                          <StepIcon className="w-7 h-7" />
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#D0A873]">
                              Stage 0{currentStep.step}
                            </span>
                            <span className="text-white/20">·</span>
                            <span className="text-xs font-semibold text-[#EDE9E0]/70">
                              {currentStep.subtitle}
                            </span>
                          </div>
                          <h4 className="text-xl sm:text-2xl font-extrabold text-[#EDE9E0]">
                            {currentStep.label}
                          </h4>
                          <p className="text-sm sm:text-base text-[#EDE9E0]/85 max-w-3xl leading-relaxed">
                            {currentStep.deepDive}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </EditableList>
            )}
          </motion.div>

          {/* 4. OUR PHILOSOPHY */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="border-t border-[#EDE9E0]/10 pt-20 sm:pt-28 space-y-12 max-w-5xl mx-auto"
          >
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#25CDB6]/15 border border-[#25CDB6]/30 text-xs font-mono font-bold tracking-wider uppercase text-[#25CDB6]">
                <EditableText
                  value={content.about.ourPhilosophyBadge}
                  fieldPath="about.ourPhilosophyBadge"
                  label="Philosophy Badge"
                  isEditMode={isEditMode}
                  onUpdate={updateText}
                />
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#EDE9E0] tracking-tight">
                <EditableText
                  value={content.about.ourPhilosophyHeading}
                  fieldPath="about.ourPhilosophyHeading"
                  label="Philosophy Heading"
                  isEditMode={isEditMode}
                  onUpdate={updateText}
                />
              </h2>
            </div>

            <div className="relative rounded-3xl p-8 sm:p-14 bg-gradient-to-b from-[#052625] via-[#031D1C] to-[#041F1E] border-2 border-[#D0A873]/40 shadow-2xl shadow-black/60 overflow-hidden text-center space-y-10">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#17A491]/15 via-transparent to-transparent pointer-events-none" />

              <div className="relative z-10">
                <EditableList<PhilosophyPillarContent>
                  items={philosophyPillars}
                  label="Philosophy Pillars"
                  isEditMode={isEditMode}
                  onUpdateItems={next => onUpdateContent('about.philosophyPillars', next)}
                  createEmptyItem={() => ({
                    id: `phil-${Date.now()}`,
                    romanLabel: 'IV. Pillar',
                    word: 'Pillar',
                    text: 'Describe pillar conviction.',
                    accentColor: '#25CDB6'
                  })}
                  fields={[
                    { key: 'romanLabel', label: 'Roman Label' },
                    { key: 'word', label: 'Main Word' },
                    { key: 'accentColor', label: 'Accent Color Hex' },
                    { key: 'text', label: 'Description', multiline: true }
                  ]}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
                    {philosophyPillars.map(pillar => (
                      <div
                        key={pillar.id || pillar.word}
                        className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-[#17A491]/40 transition-colors"
                      >
                        <span
                          className="text-xs font-mono uppercase tracking-widest font-bold block mb-1"
                          style={{ color: pillar.accentColor || '#25CDB6' }}
                        >
                          {pillar.romanLabel}
                        </span>
                        <span className="text-2xl sm:text-3xl font-extrabold text-[#EDE9E0] tracking-tight block">
                          {pillar.word}
                        </span>
                        <p className="text-xs text-[#EDE9E0]/70 mt-2 leading-relaxed">
                          {pillar.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </EditableList>
              </div>

              <div className="relative z-10 max-w-3xl mx-auto pt-4 border-t border-white/10">
                <blockquote className="text-base sm:text-xl lg:text-2xl font-serif italic text-[#EDE9E0]/90 leading-relaxed">
                  &ldquo;
                  <EditableText
                    value={content.about.ourPhilosophy}
                    fieldPath="about.ourPhilosophy"
                    label="Our Philosophy Manifesto"
                    multiline
                    isEditMode={isEditMode}
                    onUpdate={updateText}
                  />
                  &rdquo;
                </blockquote>
              </div>

              <div className="relative z-10 inline-flex items-center gap-3 text-xs font-mono tracking-widest uppercase text-[#CA7952] font-bold">
                <span className="w-6 h-px bg-[#CA7952]/50" />
                <EditableText
                  value={content.about.philosophyEthosTag}
                  fieldPath="about.philosophyEthosTag"
                  label="Philosophy Ethos Tag"
                  isEditMode={isEditMode}
                  onUpdate={updateText}
                />
                <span className="w-6 h-px bg-[#CA7952]/50" />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FOUNDER STATEMENT */}
      <section className="w-full bg-[#EFECE6] text-[#06302F] py-28 sm:py-36 mt-16 transition-colors relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-10 relative z-10">
          <motion.blockquote
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
            className="text-3xl sm:text-5xl md:text-6xl lg:text-[62px] font-serif italic text-[#06302F] leading-[1.24] tracking-tight font-normal"
          >
            <span className="inline-block mr-1">&ldquo;</span>
            <EditableText
              value={content.about.founderStatement}
              fieldPath="about.founderStatement"
              label="Founder Statement"
              multiline
              isEditMode={isEditMode}
              onUpdate={updateText}
            />
            <span className="inline-block ml-1">&rdquo;</span>
          </motion.blockquote>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.2, 0.7, 0.2, 1] }}
            className="pt-2 flex flex-col items-center gap-2"
          >
            <div className="w-8 h-0.5 bg-[#CA7952]/40 rounded-full" />
            <div className="text-xs sm:text-sm font-bold tracking-widest uppercase text-[#CA7952]">
              <EditableText
                value={content.about.founderAttribution}
                fieldPath="about.founderAttribution"
                label="Founder Attribution Title"
                isEditMode={isEditMode}
                onUpdate={updateText}
              />
            </div>
            {(content.about.endingLineTemplate || isEditMode) && (
              <p className="text-xs text-[#06302F]/60 pt-2">
                <EditableText
                  value={content.about.endingLineTemplate}
                  fieldPath="about.endingLineTemplate"
                  label="Ending Line Template"
                  isEditMode={isEditMode}
                  onUpdate={updateText}
                >
                  {formatDepartmentCountText(content.about.endingLineTemplate, publishedDepts.length)}
                </EditableText>
              </p>
            )}
          </motion.div>
        </div>
      </section>
    </div>
  );
};
