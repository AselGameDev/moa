import React from 'react';
import { Trash2 } from 'lucide-react';

export const DESTRUCTIVE_ICON_BTN_CLASS =
  'inline-flex items-center justify-center w-8 h-8 rounded-xl bg-red-950/40 border border-red-500/30 text-red-400 hover:bg-red-900/60 hover:border-red-400 transition-colors cursor-pointer shrink-0 disabled:opacity-35 disabled:cursor-not-allowed';

export const DESTRUCTIVE_LABEL_BTN_CLASS =
  'inline-flex items-center justify-center gap-1.5 min-h-[36px] px-3.5 py-2 rounded-xl bg-red-950/40 border border-red-500/30 text-red-400 hover:bg-red-900/60 hover:border-red-400 text-xs font-semibold transition-colors cursor-pointer shrink-0 disabled:opacity-35 disabled:cursor-not-allowed';

interface DeleteButtonProps {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  label?: string;
  title?: string;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
}

export const DeleteButton: React.FC<DeleteButtonProps> = ({
  onClick,
  label,
  title = 'Delete',
  ariaLabel,
  disabled = false,
  className = ''
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel || label || title}
      className={`${label ? DESTRUCTIVE_LABEL_BTN_CLASS : DESTRUCTIVE_ICON_BTN_CLASS} ${className}`.trim()}
    >
      <Trash2 className="w-3.5 h-3.5 shrink-0" />
      {label && <span>{label}</span>}
    </button>
  );
};
