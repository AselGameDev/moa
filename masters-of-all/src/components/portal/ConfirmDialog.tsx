import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = true,
  onConfirm,
  onCancel,
  children
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[#0A3D3C] border border-[#EDE9E0]/20 rounded-2xl shadow-2xl p-6 space-y-5 text-[#EDE9E0]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isDestructive ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-[#17A491]/20 text-[#25CDB6]'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-[#EDE9E0] tracking-tight">
              {title}
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="text-[#EDE9E0]/40 hover:text-[#EDE9E0] transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-[#EDE9E0]/80 leading-relaxed">
          {message}
        </p>

        {children}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EDE9E0]/10">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-semibold text-[#EDE9E0] transition-colors cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg cursor-pointer border ${
              isDestructive
                ? 'bg-red-600/90 hover:bg-red-500 border-red-400/40 text-white shadow-red-950/50'
                : 'bg-[#17A491] hover:bg-[#25CDB6] border-[#25CDB6]/40 text-[#06302F]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
