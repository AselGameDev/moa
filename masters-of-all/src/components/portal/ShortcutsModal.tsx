import React, { useEffect } from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const shortcuts = [
    { key: '/', desc: 'Open Global Search' },
    { key: '?', desc: 'Show this keyboard shortcuts guide' },
    { key: 'Esc', desc: 'Close open modals or drawers' }
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard Shortcuts"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#031D1C] border border-white/15 rounded-3xl p-6 shadow-2xl space-y-5 text-[#EDE9E0]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-[#25CDB6]" />
            <h3 className="text-sm font-bold text-[#EDE9E0]">Keyboard Shortcuts</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close shortcuts guide"
            className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          {shortcuts.map((sc, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between py-1.5 px-2 rounded-xl hover:bg-white/[0.03] text-xs"
            >
              <span className="text-[#EDE9E0]/80">{sc.desc}</span>
              <kbd className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[11px] font-mono text-[#25CDB6]">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-white/10 text-[11px] text-[#EDE9E0]/40 text-center">
          Press <kbd className="px-1 py-0.5 rounded bg-white/5 font-mono text-white/60">Esc</kbd> anytime to dismiss
        </div>
      </div>
    </div>
  );
};
