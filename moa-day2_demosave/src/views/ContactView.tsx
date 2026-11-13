import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Copy, Check, ArrowUpRight } from 'lucide-react';
import { resolveSocialLinks } from '../components/SocialIcons';
import { AtmosphericBackground } from '../components/AtmosphericBackground';
import { EditableText } from '../components/EditableText';
import { SiteContent } from '../types';

interface ContactViewProps {
  content: SiteContent;
  isEditMode?: boolean;
  onUpdateContent?: (fieldPath: string, newValue: string) => void;
  socialLinks?: Array<{ id: string; platform: string; url: string; icon?: string }>;
  contactEmail?: string;
}

export const ContactView: React.FC<ContactViewProps> = ({
  content,
  isEditMode = false,
  onUpdateContent = () => {},
  socialLinks,
  contactEmail = 'business@mastersofall.org'
}) => {
  const [copied, setCopied] = useState(false);
  const links = resolveSocialLinks(socialLinks);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(contactEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen">
      <AtmosphericBackground intensity="subtle" className="py-12 sm:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-12">
          {/* 1. Introductory Section (Compact) */}
          <div className="max-w-2xl space-y-3">
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#EDE9E0] tracking-tight"
            >
              <EditableText
                value={content?.contact?.heading || "Let's Connect."}
                fieldPath="contact.heading"
                label="Contact Heading"
                isEditMode={isEditMode}
                onUpdate={onUpdateContent}
                className="block"
              />
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.2, 0.7, 0.2, 1] }}
              className="text-base sm:text-lg text-[#EDE9E0]/80 leading-relaxed"
            >
              <EditableText
                value={
                  content?.contact?.subtext ||
                  'Have questions, collaboration proposals, or inquiries regarding our departments? We welcome your message.'
                }
                fieldPath="contact.subtext"
                label="Contact Subtext"
                multiline
                isEditMode={isEditMode}
                onUpdate={onUpdateContent}
                className="block"
              />
            </motion.div>
          </div>

          {/* 2. Main Contact Section: Balanced Two-Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-stretch">
            {/* Left Column: Get in Touch */}
            <div className="p-6 sm:p-8 lg:p-10 rounded-2xl bg-[#031D1C] border border-[#EDE9E0]/12 shadow-xl shadow-black/20 flex flex-col justify-between space-y-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-[2px] bg-[#17A491]" />
                    <span className="text-xs uppercase tracking-widest text-[#25CDB6] font-bold">
                      Direct Channel
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-[#EDE9E0] tracking-tight">
                    Get in touch
                  </h2>
                  <p className="text-sm sm:text-base text-[#EDE9E0]/70 leading-relaxed pt-1">
                    For business inquiries, research partnerships, press queries, and multidisciplinary collaborations.
                  </p>
                </div>

                {/* Email Display Box */}
                <div className="p-4 sm:p-5 rounded-xl bg-[#06302F]/80 border border-[#EDE9E0]/10 space-y-1.5">
                  <span className="text-[11px] uppercase tracking-wider text-[#EDE9E0]/50 font-semibold block">
                    Official Inquiries Email
                  </span>
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-[#25CDB6] shrink-0" />
                    <a
                      href={`mailto:${contactEmail}`}
                      className="text-base sm:text-lg md:text-xl font-bold text-[#EDE9E0] hover:text-[#25CDB6] transition-colors break-all tracking-tight"
                    >
                      {contactEmail}
                    </a>
                  </div>
                </div>

                {/* Two Action Buttons: Send an email & Copy email */}
                <div className="flex flex-col sm:flex-row gap-3 pt-1">
                  <a
                    href={`mailto:${contactEmail}`}
                    className="flex-1 py-3.5 px-5 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-[#17A491]/20 hover:-translate-y-0.5 cursor-pointer"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Send an email</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleCopyEmail}
                    className="flex-1 py-3.5 px-5 rounded-xl border border-[#EDE9E0]/20 hover:border-[#EDE9E0]/50 hover:bg-white/5 text-[#EDE9E0] font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer hover:-translate-y-0.5"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-[#25CDB6]" />
                        <span className="text-[#25CDB6]">Copied to clipboard</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 opacity-70" />
                        <span>Copy email</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Subtext info */}
              <div className="pt-6 border-t border-[#EDE9E0]/10 text-xs text-[#EDE9E0]/50 space-y-1">
                <p>Inquiries are reviewed by our administration and RDD leadership.</p>
                <p>Average response time: 1–2 business days.</p>
              </div>
            </div>

            {/* Right Column: Find Us Online */}
            <div className="p-6 sm:p-8 lg:p-10 rounded-2xl bg-[#031D1C] border border-[#EDE9E0]/12 shadow-xl shadow-black/20 flex flex-col justify-between space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-[2px] bg-[#CA7952]" />
                  <span className="text-xs uppercase tracking-widest text-[#CA7952] font-bold">
                    Official Channels
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#EDE9E0] tracking-tight">
                  Find us online
                </h2>
                <p className="text-sm sm:text-base text-[#EDE9E0]/70 leading-relaxed pt-1">
                  Connect with our community, explore public updates, and follow ongoing research initiatives.
                </p>
              </div>

              {/* Six Platforms in Clean List with Subtle Separators */}
              <div className="divide-y divide-[#EDE9E0]/10 border-y border-[#EDE9E0]/10">
                {links.map(item => {
                  const Icon = item.icon;
                  return (
                    <a
                      key={item.id}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Visit Masters Of All on ${item.name}`}
                      className="group py-3.5 sm:py-4 flex items-center justify-between transition-colors hover:bg-white/[0.03] px-2 rounded-lg -mx-2"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-9 h-9 rounded-xl bg-[#06302F] border border-[#EDE9E0]/10 flex items-center justify-center transition-transform duration-200 group-hover:scale-110 shrink-0">
                          <Icon size={18} className="text-[#EDE9E0]/80 group-hover:text-[#25CDB6] transition-colors" />
                        </div>
                        <span className="text-sm sm:text-base font-bold text-[#EDE9E0] group-hover:text-[#25CDB6] transition-colors">
                          {item.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-[#EDE9E0]/50 group-hover:text-[#25CDB6] transition-colors">
                        <span className="hidden sm:inline font-medium">Visit</span>
                        <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </div>
                    </a>
                  );
                })}
              </div>

              <div className="pt-2 text-xs text-[#EDE9E0]/50">
                <span>Stay connected through official Masters Of All publications and media.</span>
              </div>
            </div>
          </div>
        </div>
      </AtmosphericBackground>
    </div>
  );
};
