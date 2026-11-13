import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight,
  HelpCircle,
  Compass,
  Brain,
  Search,
  Lightbulb,
  Wrench,
  Sparkles,
  Layers,
  Atom,
  Target,
  BookOpen,
  Cpu,
  Globe2,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { AtmosphericBackground } from '../components/AtmosphericBackground';
import { DepartmentIcon } from '../components/DepartmentIcon';
import { EditableText } from '../components/EditableText';
import { SiteContent, Department } from '../types';

interface AboutViewProps {
  content: SiteContent;
  departments?: Department[];
  onNavigate: (path: string) => void;
  isEditMode?: boolean;
  onUpdateContent?: (fieldPath: string, newValue: string) => void;
}

export const AboutView: React.FC<AboutViewProps> = ({
  content,
  departments = [],
  onNavigate,
  isEditMode = false,
  onUpdateContent = () => {}
}) => {
  const publishedDepts = departments.filter(d => d.published && !d.deletedAt);
  const [selectedStep, setSelectedStep] = useState<number>(1);

  const whatWeDoCards = [
    {
      index: '01',
      title: 'Multidisciplinary Research',
      tagline: 'Foundational Truth & Inquiry',
      desc: 'Investigating core questions across disciplines to uncover foundational truths. We connect human history, scientific law, algorithmic reasoning, and social systems.',
      icon: Search,
      color: '#17A491',
      deliverables: ['Cross-Domain Inquiries', 'Empirical Syntheses', 'Open Whitepapers']
    },
    {
      index: '02',
      title: 'Applied Development',
      tagline: 'Engineering Concepts into Reality',
      desc: 'Translating rigorous conceptual discoveries into engineered prototypes, resilient software models, scientific instruments, and real-world tools.',
      icon: Cpu,
      color: '#25CDB6',
      deliverables: ['Functional Prototypes', 'Algorithmic Systems', 'Technical Frameworks']
    },
    {
      index: '03',
      title: 'Open Knowledge & Education',
      tagline: 'Cultivating Critical Capability',
      desc: 'Democratizing insights and providing frameworks that cultivate critical thinking, intellectual independence, and self-governing capability for everyone.',
      icon: BookOpen,
      color: '#D0A873',
      deliverables: ['Interactive Frameworks', 'Critical Thinking Curricula', 'Media Publications']
    },
    {
      index: '04',
      title: 'Impact Initiatives',
      tagline: 'Accountable Real-World Solutions',
      desc: 'Building sustainable, ethical ventures that address societal challenges with accountability, technological rigor, and long-term community empowerment.',
      icon: Target,
      color: '#CA7952',
      deliverables: ['Community Toolkits', 'Youth Empowerment Labs', 'Venture Incubation']
    }
  ];

  const thinkingSteps = [
    {
      step: 1,
      label: 'Question',
      subtitle: 'Fearless Inquiry',
      desc: 'Every breakthrough begins with fearless inquiry. We isolate root assumptions and reframe challenges to ask what others take for granted.',
      deepDive: 'We refuse superficial symptoms. By questioning first principles, we define the exact problem boundary before writing a single line of code or drafting a plan.',
      icon: HelpCircle,
      color: '#CA7952'
    },
    {
      step: 2,
      label: 'Exploration',
      subtitle: 'Cross-Domain Breadth',
      desc: 'Diving deep across multidisciplinary frontiers to map perspectives that conventional silos miss.',
      deepDive: 'True innovation lives at intersections. We connect historical precedent, legal architecture, physical dynamics, and engineering paradigms.',
      icon: Compass,
      color: '#17A491'
    },
    {
      step: 3,
      label: 'Critical Thinking',
      subtitle: 'Rigorous Logic',
      desc: 'Challenging assumptions, testing causal logic, and dismantling cognitive bias.',
      deepDive: 'Ideas are stress-tested through adversarial critique. We test edge conditions and eliminate weak hypotheses before committing resources.',
      icon: Brain,
      color: '#25CDB6'
    },
    {
      step: 4,
      label: 'Evidence Research',
      subtitle: 'Empirical Verification',
      desc: 'Empirical verification, rigorous scientific methods, and real-world field data.',
      deepDive: 'Subjective intuition must bow to verifiable proof. We gather rigorous data, conduct controlled experiments, and validate foundational premises.',
      icon: Search,
      color: '#6B8AFF'
    },
    {
      step: 5,
      label: 'Insight Synthesis',
      subtitle: 'Distilling Clarity',
      desc: 'Distilling complex, noisy findings into clean architectural models and definitive clarity.',
      deepDive: 'The breakthrough moment: distilling thousands of data points into an actionable thesis that reveals how to solve the underlying problem.',
      icon: Lightbulb,
      color: '#D0A873'
    },
    {
      step: 6,
      label: 'Practical Solutions',
      subtitle: 'Engineered Tools',
      desc: 'Engineering physical tools, software mechanisms, and institutions that empower society.',
      deepDive: 'Insight without execution is hollow. We build deployable mechanisms, verify impact in the field, and iterate for permanence.',
      icon: Wrench,
      color: '#25CDB6'
    }
  ];

  const currentStep = thinkingSteps.find(s => s.step === selectedStep) || thinkingSteps[0];
  const StepIcon = currentStep.icon;

  return (
    <div className="min-h-screen">
      {/* Editorial Hero with Atmospheric Background */}
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
                value={content?.about?.heroTitle || 'We explore questions to build solutions that matter.'}
                fieldPath="about.heroTitle"
                label="About Hero Title"
                isEditMode={isEditMode}
                onUpdate={onUpdateContent}
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
                value={content?.about?.heroSub || 'At Masters Of All, every initiative begins with curiosity and ends with practical, lasting impact.'}
                fieldPath="about.heroSub"
                label="About Hero Subtitle"
                multiline
                isEditMode={isEditMode}
                onUpdate={onUpdateContent}
                className="block"
              />
            </motion.div>
          </div>
        </div>
      </AtmosphericBackground>

      {/* Main Narrative with Sections */}
      <section className="border-t border-[#EDE9E0]/10 py-20 lg:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-32 sm:space-y-40">
          
          {/* =========================================================================
              1. WHO WE ARE: Editorial Asymmetrical Split Layout with Interactive Fabric
              ========================================================================= */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center"
          >
            {/* Left Narrative Column */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#17A491]/15 border border-[#17A491]/30 text-xs font-mono font-bold tracking-wider uppercase text-[#25CDB6]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#25CDB6] animate-pulse" />
                <span>01 · Origin & Identity</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#EDE9E0] tracking-tight leading-tight">
                An ecosystem built for universal curiosity and applied rigor.
              </h2>

              <div className="space-y-5 text-base sm:text-lg text-[#EDE9E0]/85 leading-relaxed">
                <div>
                  <EditableText
                    value={
                      content?.about?.whoWeAre ||
                      'Masters Of All (MoA) is a multidisciplinary innovation organization dedicated to understanding the world, solving real-world problems, and transforming ideas into meaningful impact.'
                    }
                    fieldPath="about.whoWeAre"
                    label="Who We Are Narrative"
                    multiline
                    isEditMode={isEditMode}
                    onUpdate={onUpdateContent}
                    className="block leading-relaxed"
                  />
                </div>
                <p className="text-sm sm:text-base text-[#EDE9E0]/70">
                  Rather than isolating sciences from humanities or theory from machinery, we serve as an ecosystem where researchers, technologists, creators, and scholars converge under one roof to pioneer transformative ideas across multiple disciplines.
                </p>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-6 text-xs text-[#EDE9E0]/60 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#25CDB6]" />
                  <span className="font-semibold text-[#EDE9E0]">8 Integrated Departments</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#D0A873]" />
                  <span className="font-semibold text-[#EDE9E0]">First-Principles Driven</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#CA7952]" />
                  <span className="font-semibold text-[#EDE9E0]">Public & Social Impact</span>
                </div>
              </div>
            </div>

            {/* Right Architectural Card: The MoA Matrix */}
            <div className="lg:col-span-5">
              <div className="relative rounded-3xl p-7 sm:p-9 bg-gradient-to-b from-[#093534] to-[#041F1E] border border-[#25CDB6]/25 shadow-2xl shadow-black/50 overflow-hidden space-y-6">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#17A491]/15 rounded-full blur-3xl pointer-events-none" />

                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#17A491]/20 border border-[#17A491]/40 flex items-center justify-center text-[#25CDB6]">
                      <Atom className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-mono tracking-wider uppercase text-[#EDE9E0]/70 font-bold">
                      The MoA Fabric
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-[#D0A873]">EST. 2026</span>
                </div>

                <div className="space-y-4">
                  {/* Pillar 1 */}
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:border-[#17A491]/40 transition-colors">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#25CDB6] uppercase tracking-wider mb-1">
                      <Layers className="w-3.5 h-3.5" />
                      <span>Universal Convergence</span>
                    </div>
                    <p className="text-xs text-[#EDE9E0]/75 leading-relaxed">
                      Silos constrain insight. We unite law, technology, physics, history, and media to examine problems through multiple lenses simultaneously.
                    </p>
                  </div>

                  {/* Pillar 2 */}
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:border-[#D0A873]/40 transition-colors">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#D0A873] uppercase tracking-wider mb-1">
                      <Brain className="w-3.5 h-3.5" />
                      <span>First-Principles Inquiry</span>
                    </div>
                    <p className="text-xs text-[#EDE9E0]/75 leading-relaxed">
                      We dismantle assumed assumptions down to fundamental physical, mathematical, and ethical realities before architecting solutions.
                    </p>
                  </div>

                  {/* Pillar 3 */}
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:border-[#CA7952]/40 transition-colors">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#CA7952] uppercase tracking-wider mb-1">
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Applied Construction</span>
                    </div>
                    <p className="text-xs text-[#EDE9E0]/75 leading-relaxed">
                      Knowledge that remains theoretical fails its purpose. We build physical devices, open software, public tools, and community initiatives.
                    </p>
                  </div>
                </div>

                <div className="pt-2 text-center">
                  <span className="text-[11px] font-serif italic text-[#EDE9E0]/50 tracking-wider">
                    Believe · Build · Become
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* =========================================================================
              2. WHAT WE DO: Four Architectural Pillars with Concrete Deliverables
              ========================================================================= */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="border-t border-[#EDE9E0]/10 pt-20 sm:pt-28 space-y-16"
          >
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#17A491]/15 border border-[#17A491]/30 text-xs font-mono font-bold tracking-wider uppercase text-[#17A491]">
                <span>02 · Four Pillars of Action</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#EDE9E0] tracking-tight">
                What we do
              </h2>
              <div className="text-base sm:text-lg text-[#EDE9E0]/80 leading-relaxed">
                <EditableText
                  value={
                    content?.about?.whatWeDo ||
                    'Our work spans research and development, engineering, technology, education, media, storytelling, entrepreneurship, community development, and youth empowerment. Every initiative is driven by a single purpose: to empower people and improve the world around us.'
                  }
                  fieldPath="about.whatWeDo"
                  label="What We Do Narrative"
                  multiline
                  isEditMode={isEditMode}
                  onUpdate={onUpdateContent}
                  className="block"
                />
              </div>
            </div>

            {/* 4 Rich Archetype Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-7 max-w-6xl mx-auto">
              {whatWeDoCards.map((card, idx) => {
                const CardIcon = card.icon;
                return (
                  <motion.div
                    key={card.index}
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

                    <div className="pt-6 mt-6 border-t border-white/10">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#EDE9E0]/50 block mb-2 font-semibold">
                        Core Outputs & Deliverables
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
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* =========================================================================
              3. HOW WE THINK: Interactive 6-Stage Inquiry Continuum
              ========================================================================= */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="border-t border-[#EDE9E0]/10 pt-20 sm:pt-28 space-y-16"
          >
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#CA7952]/15 border border-[#CA7952]/30 text-xs font-mono font-bold tracking-wider uppercase text-[#CA7952]">
                <span>03 · The Inquiry Continuum</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#EDE9E0] tracking-tight">
                How we think
              </h2>
              <div className="text-base sm:text-lg text-[#EDE9E0]/80 leading-relaxed">
                <EditableText
                  value={
                    content?.about?.howWeThink ||
                    'We believe that every meaningful solution begins with a question. Through exploration, critical thinking, and evidence-based research, we uncover the truth behind ideas, systems, and challenges, transforming insight into practical solutions that create lasting value.'
                  }
                  fieldPath="about.howWeThink"
                  label="How We Think Overview"
                  multiline
                  isEditMode={isEditMode}
                  onUpdate={onUpdateContent}
                  className="block"
                />
              </div>
            </div>

            {/* 6-Stage Interactive Roadmap Strip */}
            <div className="max-w-6xl mx-auto space-y-8">
              {/* Desktop connected rail */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                {thinkingSteps.map((step) => {
                  const IconComponent = step.icon;
                  const isSelected = selectedStep === step.step;

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

              {/* Interactive Deep-Dive Callout Box */}
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

                  <div className="shrink-0 flex items-center gap-2 text-xs font-mono text-[#25CDB6] bg-white/5 px-3 py-2 rounded-xl border border-white/10">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verified Step</span>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>

          {/* =========================================================================
              4. OUR PHILOSOPHY: Flagship Tripartite Manifesto Centerpiece
              ========================================================================= */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="border-t border-[#EDE9E0]/10 pt-20 sm:pt-28 space-y-12 max-w-5xl mx-auto"
          >
            {/* Header */}
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#25CDB6]/15 border border-[#25CDB6]/30 text-xs font-mono font-bold tracking-wider uppercase text-[#25CDB6]">
                <span>04 · Guiding Ethos</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#EDE9E0] tracking-tight">
                Our philosophy
              </h2>
            </div>

            {/* Credo Centerpiece Box */}
            <div className="relative rounded-3xl p-8 sm:p-14 bg-gradient-to-b from-[#052625] via-[#031D1C] to-[#041F1E] border-2 border-[#D0A873]/40 shadow-2xl shadow-black/60 overflow-hidden text-center space-y-10">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#17A491]/15 via-transparent to-transparent pointer-events-none" />

              {/* The Sacred Triad: Believe · Build · Become */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2 relative z-10">
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-[#17A491]/40 transition-colors">
                  <span className="text-xs font-mono uppercase tracking-widest text-[#25CDB6] font-bold block mb-1">
                    I. Conviction
                  </span>
                  <span className="text-2xl sm:text-3xl font-extrabold text-[#EDE9E0] tracking-tight block">
                    Believe
                  </span>
                  <p className="text-xs text-[#EDE9E0]/70 mt-2 leading-relaxed">
                    Fearless curiosity. The courage to question fundamental realities and trust human potential.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-[#D0A873]/40 transition-colors">
                  <span className="text-xs font-mono uppercase tracking-widest text-[#D0A873] font-bold block mb-1">
                    II. Discipline
                  </span>
                  <span className="text-2xl sm:text-3xl font-extrabold text-[#EDE9E0] tracking-tight block">
                    Build
                  </span>
                  <p className="text-xs text-[#EDE9E0]/70 mt-2 leading-relaxed">
                    Execution without compromise. Engineering thoughts into mechanisms, systems, and tools.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-[#CA7952]/40 transition-colors">
                  <span className="text-xs font-mono uppercase tracking-widest text-[#CA7952] font-bold block mb-1">
                    III. Transformation
                  </span>
                  <span className="text-2xl sm:text-3xl font-extrabold text-[#EDE9E0] tracking-tight block">
                    Become
                  </span>
                  <p className="text-xs text-[#EDE9E0]/70 mt-2 leading-relaxed">
                    Evolving individuals and societies through verified insight and durable ethical impact.
                  </p>
                </div>
              </div>

              {/* Core Philosophical Manifesto */}
              <div className="relative z-10 max-w-3xl mx-auto pt-4 border-t border-white/10">
                <blockquote className="text-base sm:text-xl lg:text-2xl font-serif italic text-[#EDE9E0]/90 leading-relaxed">
                  &ldquo;
                  <EditableText
                    value={
                      content?.about?.ourPhilosophy ||
                      'More than an organization, Masters Of All is an ecosystem for explorers, creators, innovators, and problem-solvers. We strive to unlock human potential, foster meaningful progress, and build a future where knowledge inspires action, innovation creates opportunity, and every challenge becomes the beginning of a solution.'
                    }
                    fieldPath="about.ourPhilosophy"
                    label="Our Philosophy Manifesto"
                    multiline
                    isEditMode={isEditMode}
                    onUpdate={onUpdateContent}
                  />
                  &rdquo;
                </blockquote>
              </div>

              {/* Subtle visual signature badge */}
              <div className="relative z-10 inline-flex items-center gap-3 text-xs font-mono tracking-widest uppercase text-[#CA7952] font-bold">
                <span className="w-6 h-px bg-[#CA7952]/50" />
                <span>Masters Of All · Organization Ethos</span>
                <span className="w-6 h-px bg-[#CA7952]/50" />
              </div>
            </div>
          </motion.div>

        </div>
      </section>

      {/* =========================================================================
          FOUNDER STATEMENT (Screenshot: Founder Quote with smooth entry animation)
          Full-bleed ivory background with animated editorial typography
          ========================================================================= */}
      <section className="w-full bg-[#EFECE6] text-[#06302F] py-28 sm:py-36 mt-16 transition-colors relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-10 relative z-10">
          {/* Animated Quote with word-level typographic presence & entry animation */}
          <motion.blockquote
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
            className="text-3xl sm:text-5xl md:text-6xl lg:text-[62px] font-serif italic text-[#06302F] leading-[1.24] tracking-tight font-normal select-none"
          >
            <span className="inline-block mr-1">&ldquo;</span>
            <EditableText
              value={content?.about?.founderStatement || 'If people are given the right tools, knowledge, and support early enough, most problems don’t need to exist.'}
              fieldPath="about.founderStatement"
              label="Founder Statement"
              multiline
              isEditMode={isEditMode}
              onUpdate={onUpdateContent}
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
                value={content?.about?.founderAttribution || 'FOUNDER, MASTERS OF ALL'}
                fieldPath="about.founderAttribution"
                label="Founder Attribution Title"
                isEditMode={isEditMode}
                onUpdate={onUpdateContent}
              />
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

