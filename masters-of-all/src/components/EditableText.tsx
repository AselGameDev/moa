import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Edit3, Check, X, Sparkles } from 'lucide-react';

interface EditableTextProps {
  value: string;
  fieldPath: string;
  label: string;
  isEditMode: boolean;
  onUpdate: (fieldPath: string, newValue: string) => void;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'div';
  multiline?: boolean;
  children?: React.ReactNode;
}

export const EditableText: React.FC<EditableTextProps> = ({
  value,
  fieldPath,
  label,
  isEditMode,
  onUpdate,
  className = '',
  as: Component = 'span',
  multiline = false,
  children
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setTempValue(value);
    }
  }, [value, isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      if ('select' in inputRef.current) {
        inputRef.current.select();
      }
    }
  }, [isOpen]);

  if (!isEditMode) {
    return <Component className={className}>{children !== undefined ? children : value}</Component>;
  }

  const handleOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    triggerRef.current = e.currentTarget as HTMLElement;
    setTempValue(value);
    setIsOpen(true);
  };

  const handleSave = () => {
    onUpdate(fieldPath, tempValue);
    setIsOpen(false);
    setTimeout(() => triggerRef.current?.focus?.(), 0);
  };

  const handleCancel = () => {
    setTempValue(value);
    setIsOpen(false);
    setTimeout(() => triggerRef.current?.focus?.(), 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      handleCancel();
    } else if (e.key === 'Enter' && (!multiline || e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <>
      <Component
        onClick={handleOpen}
        title={`Click to edit "${label}" (Page Editor)`}
        className={`relative group/editable cursor-pointer transition-all duration-200 ${className} hover:outline-dashed hover:outline-2 hover:outline-[#25CDB6] hover:bg-[#25CDB6]/10 rounded-lg p-0.5`}
      >
        {children !== undefined ? children : value}

        <span className="opacity-0 group-hover/editable:opacity-100 transition-opacity duration-150 absolute -top-7 right-0 z-40 bg-[#031D1C] text-[#25CDB6] border border-[#25CDB6]/50 text-[10px] font-mono font-bold px-2 py-0.5 rounded shadow-lg flex items-center gap-1 pointer-events-none whitespace-nowrap">
          <Edit3 className="w-2.5 h-2.5" />
          <span>Edit {label}</span>
        </span>
      </Component>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
            role="dialog"
            aria-modal="true"
            aria-label={`Edit ${label}`}
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              handleCancel();
            }}
          >
            <div
              className="w-full max-w-xl bg-[#031D1C] border-2 border-[#25CDB6]/60 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-black/80 space-y-5 text-[#EDE9E0]"
              onClick={e => e.stopPropagation()}
            >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#17A491]/20 border border-[#17A491]/40 flex items-center justify-center text-[#25CDB6]">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#EDE9E0]">
                    Visual Text Editor · {label}
                  </h3>
                  <span className="text-[11px] font-mono text-[#EDE9E0]/50">
                    Field: {fieldPath}
                  </span>
                </div>
              </div>

              <button
                type="button"
                aria-label="Close text editor"
                onClick={handleCancel}
                className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-[#25CDB6] font-bold block">
                Live Text Content
              </label>

              {multiline ? (
                <textarea
                  ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                  rows={5}
                  value={tempValue}
                  onChange={e => setTempValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Enter ${label}...`}
                  className="w-full bg-[#06302F] border border-white/20 rounded-2xl p-4 text-sm text-[#EDE9E0] focus:border-[#25CDB6] focus:ring-1 focus:ring-[#25CDB6] focus:outline-none transition-colors leading-relaxed"
                />
              ) : (
                <input
                  ref={inputRef as React.RefObject<HTMLInputElement>}
                  type="text"
                  value={tempValue}
                  onChange={e => setTempValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Enter ${label}...`}
                  className="w-full bg-[#06302F] border border-white/20 rounded-2xl px-4 py-3 text-sm text-[#EDE9E0] focus:border-[#25CDB6] focus:ring-1 focus:ring-[#25CDB6] focus:outline-none transition-colors"
                />
              )}

              <p className="text-[11px] text-[#EDE9E0]/50 flex items-center justify-between">
                <span>Changes save automatically to draft when you click Apply.</span>
                <span className="font-mono">{multiline ? 'Ctrl+Enter to apply' : 'Enter to apply'} · Esc to cancel</span>
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#EDE9E0]/70 hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2.5 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-[#17A491]/30 transition-all cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply</span>
              </button>
            </div>
          </div>
          </div>,
          document.body
        )}
    </>
  );
};
