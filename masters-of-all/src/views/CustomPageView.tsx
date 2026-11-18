import React, { useState } from 'react';
import { AtmosphericBackground } from '../components/AtmosphericBackground';
import { SpaLink } from '../components/SpaLink';
import { ScrollHierarchyTree } from '../components/ScrollHierarchyTree';
import { DepartmentIcon } from '../components/DepartmentIcon';
import { parseVideoEmbed, sanitizeSafeUrl } from '../shared/url';
import { getUnitHref } from '../utils/orgHelpers';
import { api } from '../services/api';
import { PageRecord, PageBlock, Department } from '../types';
import { ArrowRight, Check, Send, Loader2, ChevronDown } from 'lucide-react';

interface CustomPageViewProps {
  page: PageRecord;
  departments: Department[];
  onNavigate: (path: string) => void;
  moaLogoUrl?: string;
  rddLogoUrl?: string;
  siteName?: string;
}

const BlockContactForm: React.FC<{ heading?: string }> = ({ heading }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    try {
      await api.submitContactForm({ name, email, message, formType: 'contact' });
      setDone(true);
      setName('');
      setEmail('');
      setMessage('');
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 sm:p-8 rounded-2xl bg-[#031D1C] border border-white/10 max-w-2xl mx-auto space-y-4">
      {heading && <h3 className="text-xl font-bold text-[#EDE9E0]">{heading}</h3>}
      {done ? (
        <div className="p-4 rounded-xl bg-[#17A491]/15 border border-[#25CDB6]/40 text-sm text-[#EDE9E0] flex items-center gap-2">
          <Check className="w-4 h-4 text-[#25CDB6]" />
          <span>Thank you. Your message has been received.</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              required
              placeholder="Your name"
              value={name}
              onChange={e => setName(e.target.value)}
              className="bg-[#06302F] border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-[#EDE9E0]"
            />
            <input
              type="email"
              required
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="bg-[#06302F] border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-[#EDE9E0]"
            />
          </div>
          <textarea
            rows={4}
            required
            placeholder="Your message"
            value={message}
            onChange={e => setMessage(e.target.value)}
            className="w-full bg-[#06302F] border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-[#EDE9E0]"
          />
          {err && <p className="text-xs text-[#CA7952]">{err}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#031D1C] font-bold text-sm flex items-center gap-2 cursor-pointer"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>{submitting ? 'Sending...' : 'Send Message'}</span>
          </button>
        </form>
      )}
    </div>
  );
};

export const CustomPageView: React.FC<CustomPageViewProps> = ({
  page,
  departments,
  onNavigate,
  moaLogoUrl = '/drawing1.png',
  rddLogoUrl = '',
  siteName = 'Masters Of All'
}) => {
  const [openAcc, setOpenAcc] = useState<string | null>(null);

  const renderBlock = (block: PageBlock) => {
    const cfg = block.config || {};
    const str = (key: string, fallback = '') => (typeof cfg[key] === 'string' ? (cfg[key] as string) : fallback);

    switch (block.type) {
      case 'hero':
        return (
          <div className="max-w-4xl space-y-4">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#EDE9E0] tracking-tight">
              {str('heading', str('title', page.title))}
            </h1>
            {str('subtitle') && (
              <p className="text-lg text-[#EDE9E0]/80 leading-relaxed">{str('subtitle')}</p>
            )}
            {str('ctaLabel') && str('ctaUrl') && (
              <SpaLink
                href={str('ctaUrl')}
                onNavigate={onNavigate}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#031D1C] font-bold text-sm"
              >
                <span>{str('ctaLabel')}</span>
                <ArrowRight className="w-4 h-4" />
              </SpaLink>
            )}
          </div>
        );

      case 'text':
        return (
          <div className="max-w-4xl space-y-3">
            {str('heading') && <h2 className="text-2xl sm:text-3xl font-bold text-[#EDE9E0]">{str('heading')}</h2>}
            <div className="text-base text-[#EDE9E0]/85 leading-relaxed whitespace-pre-line">
              {str('body', str('text', ''))}
            </div>
          </div>
        );

      case 'image-text': {
        const imgSrc = sanitizeSafeUrl(str('imageUrl'));
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {imgSrc && (
              <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#031D1C]">
                <img src={imgSrc} alt={str('alt', str('heading', page.title))} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="space-y-3">
              {str('heading') && <h2 className="text-2xl font-bold text-[#EDE9E0]">{str('heading')}</h2>}
              <p className="text-sm sm:text-base text-[#EDE9E0]/80 leading-relaxed whitespace-pre-line">
                {str('body', str('text', ''))}
              </p>
            </div>
          </div>
        );
      }

      case 'quote':
        return (
          <blockquote className="max-w-3xl mx-auto text-center space-y-3 py-4">
            <p className="text-2xl sm:text-3xl font-serif italic text-[#EDE9E0]">
              &ldquo;{str('quote', str('text', ''))}&rdquo;
            </p>
            {str('attribution') && (
              <footer className="text-xs uppercase tracking-widest font-bold text-[#CA7952]">
                {str('attribution')}
              </footer>
            )}
          </blockquote>
        );

      case 'cta-band':
        return (
          <div className="p-8 sm:p-10 rounded-3xl bg-[#031D1C] border border-[#25CDB6]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <h3 className="text-2xl font-bold text-[#EDE9E0]">{str('heading', 'Get involved')}</h3>
              {str('text') && <p className="text-sm text-[#EDE9E0]/75">{str('text')}</p>}
            </div>
            {str('ctaLabel') && str('ctaUrl') && (
              <SpaLink
                href={str('ctaUrl')}
                onNavigate={onNavigate}
                className="px-6 py-3 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#031D1C] font-bold text-sm inline-flex items-center gap-2 shrink-0"
              >
                <span>{str('ctaLabel')}</span>
                <ArrowRight className="w-4 h-4" />
              </SpaLink>
            )}
          </div>
        );

      case 'video': {
        const embed = parseVideoEmbed(str('url'));
        if (!embed) return null;
        return embed.kind === 'iframe' ? (
          <div className="aspect-video w-full rounded-2xl overflow-hidden border border-white/10">
            <iframe
              src={embed.src}
              title={str('title', 'Embedded video')}
              className="w-full h-full"
              sandbox="allow-scripts allow-same-origin allow-presentation"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
        ) : (
          <video src={embed.src} controls className="w-full max-h-[520px] rounded-2xl bg-black" />
        );
      }

      case 'gallery': {
        const urls = Array.isArray(cfg.images)
          ? (cfg.images as unknown[]).map(u => sanitizeSafeUrl(u)).filter(Boolean)
          : [];
        if (urls.length === 0) return null;
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {urls.map((url, idx) => (
              <div key={idx} className="aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 bg-[#031D1C]">
                <img src={url} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        );
      }

      case 'cards-grid': {
        const cards = Array.isArray(cfg.items) ? (cfg.items as Array<Record<string, unknown>>) : [];
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {cards.map((c, idx) => (
              <div key={idx} className="p-6 rounded-2xl bg-[#031D1C] border border-white/10 space-y-2">
                <h3 className="font-bold text-lg text-[#EDE9E0]">{String(c.title || '')}</h3>
                <p className="text-sm text-[#EDE9E0]/75 leading-relaxed">{String(c.description || c.body || '')}</p>
              </div>
            ))}
          </div>
        );
      }

      case 'stats': {
        const stats = Array.isArray(cfg.items) ? (cfg.items as Array<Record<string, unknown>>) : [];
        return (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {stats.map((s, idx) => (
              <div key={idx} className="p-5 rounded-2xl bg-[#031D1C] border border-white/10 text-center">
                <span className="text-2xl sm:text-3xl font-black text-[#25CDB6] block">
                  {String(s.value || '')}
                </span>
                <span className="text-xs text-[#EDE9E0]/65 mt-1 block">{String(s.label || '')}</span>
              </div>
            ))}
          </div>
        );
      }

      case 'accordion': {
        const items = Array.isArray(cfg.items) ? (cfg.items as Array<Record<string, unknown>>) : [];
        return (
          <div className="space-y-2 max-w-3xl mx-auto">
            {items.map((item, idx) => {
              const key = `${block.id}-${idx}`;
              const isOpen = openAcc === key;
              return (
                <div key={key} className="rounded-xl bg-[#031D1C] border border-white/10 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenAcc(isOpen ? null : key)}
                    className="w-full px-5 py-4 flex items-center justify-between text-left font-semibold text-sm text-[#EDE9E0] cursor-pointer"
                  >
                    <span>{String(item.question || item.title || '')}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 text-sm text-[#EDE9E0]/75 leading-relaxed">
                      {String(item.answer || item.body || '')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      }

      case 'department-grid':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {departments
              .filter(d => d.published && !d.deletedAt)
              .map(dept => (
                <SpaLink
                  key={dept.id}
                  href={getUnitHref(dept)}
                  onNavigate={onNavigate}
                  className="p-5 rounded-2xl bg-[#031D1C] border border-white/10 hover:border-[#25CDB6] transition-colors flex items-center gap-3"
                >
                  <DepartmentIcon
                    glyph={dept.iconGlyph}
                    iconUrl={dept.iconUrl}
                    bgColor={dept.iconBgHex}
                    color={dept.colorHex}
                    showBg
                    size={40}
                  />
                  <span className="font-bold text-sm text-[#EDE9E0]">{dept.name}</span>
                </SpaLink>
              ))}
          </div>
        );

      case 'hierarchy-diagram':
        return (
          <ScrollHierarchyTree
            departments={departments}
            onSelectUnit={unit => onNavigate(getUnitHref(unit))}
            moaLogoUrl={moaLogoUrl}
            rddLogoUrl={rddLogoUrl}
            siteName={siteName}
          />
        );

      case 'contact-form':
        return <BlockContactForm heading={str('heading')} />;

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen">
      <AtmosphericBackground intensity="subtle" fadeToColor="transparent" className="py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {(!page.blocks || page.blocks.length === 0) && (
            <h1 className="text-4xl font-extrabold text-[#EDE9E0]">{page.title}</h1>
          )}
          {page.blocks?.map(block => (
            <section key={block.id} id={block.sectionSettings?.anchorId || undefined}>
              {renderBlock(block)}
            </section>
          ))}
        </div>
      </AtmosphericBackground>
    </div>
  );
};
