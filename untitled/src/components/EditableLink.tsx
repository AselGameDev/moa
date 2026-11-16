import React, { useState } from 'react';
import { Link2, X, Check } from 'lucide-react';
import { SpaLink } from './SpaLink';
import { isSafeUrl } from '../shared/url';

interface EditableLinkProps {
  label: string;
  href: string;
  labelFieldPath: string;
  hrefFieldPath?: string;
  editorLabel: string;
  isEditMode: boolean;
  onUpdate: (fieldPath: string, newValue: string) => void;
  onNavigate: (path: string) => void;
  className?: string;
  children?: React.ReactNode;
}

export const EditableLink: React.FC<EditableLinkProps> = ({
  label,
  href,
  labelFieldPath,
  hrefFieldPath,
  editorLabel,
  isEditMode,
  onUpdate,
  onNavigate,
  className = '',
  children
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempLabel, setTempLabel] = useState(label);
  const [tempHref, setTempHref] = useState(href);
  const [err, setErr] = useState<string | null>(null);

  if (!isEditMode) {
    return (
      <SpaLink href={href} onNavigate={onNavigate} className={className}>
        {children || label}
      </SpaLink>
    );
  }

  const handleSave = () => {
    if (hrefFieldPath && !isSafeUrl(tempHref, true)) {
      setErr('Please enter a valid internal path (/...) or safe http(s) / mailto URL.');
      return;
    }
    onUpdate(labelFieldPath, tempLabel);
    if (hrefFieldPath) {
      onUpdate(hrefFieldPath, tempHref);
    }
    setErr(null);
    setIsOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();
          setTempLabel(label);
          setTempHref(href);
          setErr(null);
          setIsOpen(true);
        }}
        className={`relative group/editlink ${className} hover:outline-dashed hover:outline-2 hover:outline-[#25CDB6]`}
      >
        {children || label}
        <span className="opacity-0 group-hover/editlink:opacity-100 transition-opacity duration-150 absolute -top-6 right-0 z-40 bg-[#031D1C] text-[#25CDB6] border border-[#25CDB6]/50 text-[10px] font-mono font-bold px-2 py-0.5 rounded shadow-lg flex items-center gap-1 pointer-events-none whitespace-nowrap">
          <Link2 className="w-2.5 h-2.5" />
          <span>Edit {editorLabel}</span>
        </span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`Edit ${editorLabel}`}
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-md bg-[#031D1C] border border-[#25CDB6]/50 rounded-3xl p-6 space-y-4 text-[#EDE9E0] shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold">Edit {editorLabel}</h3>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#25CDB6] block mb-1">Label</label>
                <input
                  type="text"
                  value={tempLabel}
                  onChange={e => setTempLabel(e.target.value)}
                  className="w-full bg-[#06302F] border border-white/20 rounded-xl px-3.5 py-2.5 text-sm text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                />
              </div>
              {hrefFieldPath && (
                <div>
                  <label className="text-xs font-semibold text-[#25CDB6] block mb-1">Destination URL</label>
                  <input
                    type="text"
                    value={tempHref}
                    onChange={e => setTempHref(e.target.value)}
                    className="w-full bg-[#06302F] border border-white/20 rounded-xl px-3.5 py-2.5 text-sm text-[#EDE9E0] font-mono focus:border-[#25CDB6] focus:outline-none"
                  />
                </div>
              )}
              {err && <p className="text-xs text-[#CA7952]">{err}</p>}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#EDE9E0]/70 hover:bg-white/5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#031D1C] font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
