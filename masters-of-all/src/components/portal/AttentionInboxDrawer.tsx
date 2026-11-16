import React, { useEffect } from 'react';
import {
  X,
  Bell,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { Project, Publication, Product, FormSubmission, SiteHealthItem } from '../../types';

export interface AttentionReviewItem {
  kind: 'projects' | 'publications' | 'products';
  id: string;
  title: string;
  authorName: string;
}

interface AttentionInboxDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  pendingReviews: AttentionReviewItem[];
  staleDrafts: Array<{ kind: 'projects' | 'publications' | 'products'; id: string; title: string; updatedAt: string }>;
  newSubmissions: FormSubmission[];
  healthWarnings: SiteHealthItem[];
  onActionClick: (targetTab: string, subTab?: string, entityId?: string) => void;
}

export function buildPendingReviews(
  projects: Project[],
  publications: Publication[],
  products: Product[]
): AttentionReviewItem[] {
  const out: AttentionReviewItem[] = [];
  projects
    .filter(p => !p.deletedAt && p.publicationStatus === 'Pending Review')
    .forEach(p =>
      out.push({ kind: 'projects', id: p.id, title: p.title, authorName: p.authorName || 'Contributor' })
    );
  publications
    .filter(p => !p.deletedAt && p.publicationStatus === 'Pending Review')
    .forEach(p =>
      out.push({ kind: 'publications', id: p.id, title: p.title, authorName: p.authorName || 'Contributor' })
    );
  products
    .filter(p => !p.deletedAt && p.publicationStatus === 'Pending Review')
    .forEach(p =>
      out.push({ kind: 'products', id: p.id, title: p.name, authorName: p.authorName || 'Contributor' })
    );
  return out;
}

export const AttentionInboxDrawer: React.FC<AttentionInboxDrawerProps> = ({
  isOpen,
  onClose,
  pendingReviews,
  staleDrafts,
  newSubmissions,
  healthWarnings,
  onActionClick
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totalCount =
    pendingReviews.length + staleDrafts.length + newSubmissions.length + healthWarnings.length;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Needs Your Attention"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md h-full bg-[#031D1C] border-l border-white/10 shadow-2xl flex flex-col justify-between text-[#EDE9E0]"
        onClick={e => e.stopPropagation()}
      >
        <div className="h-16 px-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Bell className="w-4 h-4 text-[#25CDB6]" />
            <h2 className="text-sm font-bold text-[#EDE9E0]">Needs Your Attention</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {totalCount} item{totalCount === 1 ? '' : 's'}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close notifications drawer"
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {totalCount === 0 ? (
            <div className="py-24 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#17A491]/20 text-[#25CDB6] flex items-center justify-center mx-auto">
                <ShieldCheck className="w-6 h-6 stroke-[2.5]" />
              </div>
              <h3 className="text-sm font-bold text-[#EDE9E0]">Inbox Clear</h3>
              <p className="text-xs text-[#EDE9E0]/50 max-w-xs mx-auto">
                No pending reviews, stale drafts, or health warnings requiring attention.
              </p>
            </div>
          ) : (
            <>
              {pendingReviews.length > 0 && (
                <div className="space-y-2.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 block font-mono">
                    Pending Reviews ({pendingReviews.length})
                  </span>
                  <div className="space-y-2">
                    {pendingReviews.map(item => (
                      <div
                        key={`${item.kind}-${item.id}`}
                        className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3 hover:border-amber-400/40 transition-colors"
                      >
                        <div className="truncate">
                          <h4 className="text-xs font-bold text-[#EDE9E0] truncate">{item.title}</h4>
                          <span className="text-[11px] text-[#EDE9E0]/50 truncate block">
                            {item.kind.slice(0, -1)} · Submitted by {item.authorName}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onActionClick('content', item.kind, item.id);
                          }}
                          className="px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-[11px] font-bold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                        >
                          <span>Review</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {newSubmissions.length > 0 && (
                <div className="space-y-2.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#25CDB6] block font-mono">
                    New Inquiries ({newSubmissions.length})
                  </span>
                  <div className="space-y-2">
                    {newSubmissions.map(sub => (
                      <div
                        key={sub.id}
                        className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3 hover:border-[#25CDB6]/40 transition-colors"
                      >
                        <div className="truncate">
                          <h4 className="text-xs font-bold text-[#EDE9E0] truncate">{sub.name}</h4>
                          <span className="text-[11px] text-[#EDE9E0]/50 truncate block">
                            {sub.subject || sub.email}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onActionClick('settings', 'inbox');
                          }}
                          className="px-2.5 py-1 rounded-xl bg-[#17A491]/20 text-[#25CDB6] hover:bg-[#17A491]/30 text-[11px] font-bold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                        >
                          <span>View</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {healthWarnings.length > 0 && (
                <div className="space-y-2.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-red-400 block font-mono">
                    Site Health Warnings ({healthWarnings.length})
                  </span>
                  <div className="space-y-2">
                    {healthWarnings.map((warn, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-2xl bg-red-950/30 border border-red-500/20 flex items-center justify-between gap-3"
                      >
                        <div>
                          <h4 className="text-xs font-bold text-red-200">{warn.title}</h4>
                          <p className="text-[11px] text-[#EDE9E0]/60 mt-0.5">{warn.message}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onActionClick(warn.actionTab || 'settings', 'health');
                          }}
                          className="px-2.5 py-1 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 text-[11px] font-bold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                        >
                          <span>Inspect</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {staleDrafts.length > 0 && (
                <div className="space-y-2.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-white/50 block font-mono">
                    Stale Drafts Older Than 14 Days ({staleDrafts.length})
                  </span>
                  <div className="space-y-2">
                    {staleDrafts.map(draft => (
                      <div
                        key={`${draft.kind}-${draft.id}`}
                        className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-3"
                      >
                        <div className="truncate">
                          <h4 className="text-xs font-semibold text-[#EDE9E0]/80 truncate">{draft.title}</h4>
                          <span className="text-[10px] text-[#EDE9E0]/40 block">
                            Last updated {new Date(draft.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onActionClick('content', draft.kind, draft.id);
                          }}
                          className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-[#EDE9E0]/70 text-[11px] font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          <span>Open</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-4 border-t border-white/10 text-center">
          <span className="text-[11px] text-[#EDE9E0]/40">
            Items resolve automatically as actions are completed.
          </span>
        </div>
      </div>
    </div>
  );
};
