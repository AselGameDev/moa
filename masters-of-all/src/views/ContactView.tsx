import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Copy, Check, ArrowUpRight, Send, MapPin, Loader2 } from 'lucide-react';
import { resolveSocialLinks } from '../components/SocialIcons';
import { AtmosphericBackground } from '../components/AtmosphericBackground';
import { EditableText } from '../components/EditableText';
import { useContent } from '../hooks/useContent';
import { api } from '../services/api';
import { SiteContent } from '../types';

interface ContactViewProps {
  content: SiteContent;
  isEditMode?: boolean;
  onUpdateContent?: (fieldPath: string, newValue: string) => void;
  socialLinks?: Array<{ id: string; platform: string; url: string; icon?: string }>;
  contactEmail?: string;
  organizationAddress?: string;
}

export const ContactView: React.FC<ContactViewProps> = ({
  content: rawContent,
  isEditMode = false,
  onUpdateContent = () => {},
  socialLinks,
  contactEmail = 'business@mastersofall.org',
  organizationAddress = ''
}) => {
  const { content } = useContent(rawContent);
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState(''); // Honeypot
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const links = resolveSocialLinks(socialLinks);

  const handleCopyEmail = () => {
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(contactEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      setSubmitError('Please fill in your name, email address, and message.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      await api.submitContactForm({
        formType: 'contact',
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
        website
      });
      setSubmitted(true);
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unable to send your message right now.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <AtmosphericBackground intensity="subtle" className="py-12 sm:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-12">
          <div className="max-w-3xl space-y-3">
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#EDE9E0] tracking-tight leading-[1.1]"
            >
              <EditableText
                value={content.contact.heading}
                fieldPath="contact.heading"
                label="Contact Heading"
                isEditMode={isEditMode}
                onUpdate={onUpdateContent}
                className="block whitespace-pre-line"
              >
                {(() => {
                  const headingText = content.contact.heading || '';
                  if (headingText.includes('\n')) {
                    return headingText;
                  }
                  const qIdx = headingText.indexOf('?');
                  if (qIdx !== -1 && qIdx < headingText.length - 1) {
                    const firstLine = headingText.slice(0, qIdx + 1).trim();
                    const secondLine = headingText.slice(qIdx + 1).trim();
                    if (secondLine) {
                      return (
                        <>
                          <span className="block">{firstLine}</span>
                          <span className="block">{secondLine}</span>
                        </>
                      );
                    }
                  }
                  return headingText;
                })()}
              </EditableText>
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.2, 0.7, 0.2, 1] }}
              className="max-w-2xl text-base sm:text-lg text-[#EDE9E0]/80 leading-relaxed"
            >
              <EditableText
                value={content.contact.subtext}
                fieldPath="contact.subtext"
                label="Contact Subtext"
                multiline
                isEditMode={isEditMode}
                onUpdate={onUpdateContent}
                className="block"
              />
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-stretch">
            {/* Left Column: Direct Channel + Contact Form */}
            <div className="p-6 sm:p-8 lg:p-10 rounded-2xl bg-[#031D1C] border border-[#EDE9E0]/12 shadow-xl shadow-black/20 flex flex-col justify-between space-y-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-[2px] bg-[#17A491]" />
                    <EditableText
                      value={content.contact.directEyebrow}
                      fieldPath="contact.directEyebrow"
                      label="Direct Channel Eyebrow"
                      isEditMode={isEditMode}
                      onUpdate={onUpdateContent}
                      as="span"
                      className="text-xs uppercase tracking-widest text-[#25CDB6] font-bold"
                    />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-[#EDE9E0] tracking-tight">
                    <EditableText
                      value={content.contact.directHeading}
                      fieldPath="contact.directHeading"
                      label="Direct Channel Heading"
                      isEditMode={isEditMode}
                      onUpdate={onUpdateContent}
                    />
                  </h2>
                  <div className="text-sm sm:text-base text-[#EDE9E0]/70 leading-relaxed pt-1">
                    <EditableText
                      value={content.contact.directDescription}
                      fieldPath="contact.directDescription"
                      label="Direct Channel Description"
                      multiline
                      isEditMode={isEditMode}
                      onUpdate={onUpdateContent}
                    />
                  </div>
                </div>

                <div className="p-4 sm:p-5 rounded-xl bg-[#06302F]/80 border border-[#EDE9E0]/10 space-y-1.5">
                  <EditableText
                    value={content.contact.emailBoxLabel}
                    fieldPath="contact.emailBoxLabel"
                    label="Email Box Label"
                    isEditMode={isEditMode}
                    onUpdate={onUpdateContent}
                    as="span"
                    className="text-[11px] uppercase tracking-wider text-[#EDE9E0]/50 font-semibold block"
                  />
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-[#25CDB6] shrink-0" />
                    <a
                      href={`mailto:${contactEmail}`}
                      className="text-base sm:text-lg md:text-xl font-bold text-[#EDE9E0] hover:text-[#25CDB6] transition-colors break-all tracking-tight"
                    >
                      {contactEmail}
                    </a>
                  </div>
                  {organizationAddress && organizationAddress.trim() && (
                    <div className="flex items-start gap-2 pt-2 text-xs text-[#EDE9E0]/65">
                      <MapPin className="w-3.5 h-3.5 text-[#D0A873] shrink-0 mt-0.5" />
                      <span>{organizationAddress}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-1">
                  <a
                    href={`mailto:${contactEmail}`}
                    className="flex-1 py-3.5 px-5 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-[#17A491]/20 hover:-translate-y-0.5 cursor-pointer"
                  >
                    <Mail className="w-4 h-4" />
                    <span>{content.contact.sendEmailLabel}</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleCopyEmail}
                    className="flex-1 py-3.5 px-5 rounded-xl border border-[#EDE9E0]/20 hover:border-[#EDE9E0]/50 hover:bg-white/5 text-[#EDE9E0] font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer hover:-translate-y-0.5"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-[#25CDB6]" />
                        <span className="text-[#25CDB6]">{content.contact.copiedEmailLabel}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 opacity-70" />
                        <span>{content.contact.copyEmailLabel}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Contact Form */}
                <div className="pt-6 border-t border-[#EDE9E0]/10 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#25CDB6]">
                    <EditableText
                      value={content.contact.formHeading}
                      fieldPath="contact.formHeading"
                      label="Contact Form Heading"
                      isEditMode={isEditMode}
                      onUpdate={onUpdateContent}
                    />
                  </h3>

                  {submitted ? (
                    <div className="p-4 rounded-xl bg-[#17A491]/15 border border-[#25CDB6]/40 text-sm text-[#EDE9E0] flex items-start gap-3">
                      <Check className="w-4 h-4 text-[#25CDB6] shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-semibold">{content.contact.formSuccessMessage}</p>
                        <button
                          type="button"
                          onClick={() => setSubmitted(false)}
                          className="text-xs text-[#25CDB6] hover:underline cursor-pointer"
                        >
                          Send another message
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmitForm} className="space-y-3">
                      {/* Honeypot field hidden from human users */}
                      <div className="hidden" aria-hidden="true">
                        <label>
                          Website
                          <input
                            type="text"
                            tabIndex={-1}
                            autoComplete="off"
                            value={website}
                            onChange={e => setWebsite(e.target.value)}
                          />
                        </label>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={e => setName(e.target.value)}
                          placeholder={content.contact.formNamePlaceholder}
                          aria-label="Your name"
                          className="w-full bg-[#06302F] border border-[#EDE9E0]/15 rounded-xl px-3.5 py-2.5 text-sm text-[#EDE9E0] placeholder:text-[#EDE9E0]/40 focus:outline-none focus:border-[#25CDB6]"
                        />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          placeholder={content.contact.formEmailPlaceholder}
                          aria-label="Your email"
                          className="w-full bg-[#06302F] border border-[#EDE9E0]/15 rounded-xl px-3.5 py-2.5 text-sm text-[#EDE9E0] placeholder:text-[#EDE9E0]/40 focus:outline-none focus:border-[#25CDB6]"
                        />
                      </div>

                      <input
                        type="text"
                        value={subject}
                        onChange={e => setSubject(e.target.value)}
                        placeholder={content.contact.formSubjectPlaceholder}
                        aria-label="Subject"
                        className="w-full bg-[#06302F] border border-[#EDE9E0]/15 rounded-xl px-3.5 py-2.5 text-sm text-[#EDE9E0] placeholder:text-[#EDE9E0]/40 focus:outline-none focus:border-[#25CDB6]"
                      />

                      <textarea
                        rows={4}
                        required
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        placeholder={content.contact.formMessagePlaceholder}
                        aria-label="Message"
                        className="w-full bg-[#06302F] border border-[#EDE9E0]/15 rounded-xl px-3.5 py-2.5 text-sm text-[#EDE9E0] placeholder:text-[#EDE9E0]/40 focus:outline-none focus:border-[#25CDB6]"
                      />

                      {submitError && (
                        <p className="text-xs text-[#CA7952]">{submitError}</p>
                      )}

                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-3 px-5 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                      >
                        {submitting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        <span>{submitting ? 'Sending...' : content.contact.formSubmitLabel}</span>
                      </button>
                    </form>
                  )}
                </div>
              </div>

              {(content.contact.responseNote?.trim() || isEditMode) && (
                <div className="pt-4 border-t border-[#EDE9E0]/10 text-xs text-[#EDE9E0]/55">
                  <EditableText
                    value={content.contact.responseNote || (isEditMode ? 'Add optional response note...' : '')}
                    fieldPath="contact.responseNote"
                    label="Optional Response Note"
                    isEditMode={isEditMode}
                    onUpdate={onUpdateContent}
                  />
                </div>
              )}
            </div>

            {/* Right Column: Find Us Online */}
            <div className="p-6 sm:p-8 lg:p-10 rounded-2xl bg-[#031D1C] border border-[#EDE9E0]/12 shadow-xl shadow-black/20 flex flex-col justify-between space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-[2px] bg-[#CA7952]" />
                  <EditableText
                    value={content.contact.channelsEyebrow}
                    fieldPath="contact.channelsEyebrow"
                    label="Channels Eyebrow"
                    isEditMode={isEditMode}
                    onUpdate={onUpdateContent}
                    as="span"
                    className="text-xs uppercase tracking-widest text-[#CA7952] font-bold"
                  />
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#EDE9E0] tracking-tight">
                  <EditableText
                    value={content.contact.channelsHeading}
                    fieldPath="contact.channelsHeading"
                    label="Channels Heading"
                    isEditMode={isEditMode}
                    onUpdate={onUpdateContent}
                  />
                </h2>
                <div className="text-sm sm:text-base text-[#EDE9E0]/70 leading-relaxed pt-1">
                  <EditableText
                    value={content.contact.channelsDescription}
                    fieldPath="contact.channelsDescription"
                    label="Channels Description"
                    multiline
                    isEditMode={isEditMode}
                    onUpdate={onUpdateContent}
                  />
                </div>
              </div>

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
                        <span className="hidden sm:inline font-medium">{content.contact.channelsVisitLabel}</span>
                        <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </div>
                    </a>
                  );
                })}
              </div>

              <div className="pt-2 text-xs text-[#EDE9E0]/50">
                <EditableText
                  value={content.contact.channelsFooterNote}
                  fieldPath="contact.channelsFooterNote"
                  label="Channels Footer Note"
                  isEditMode={isEditMode}
                  onUpdate={onUpdateContent}
                />
              </div>
            </div>
          </div>
        </div>
      </AtmosphericBackground>
    </div>
  );
};
