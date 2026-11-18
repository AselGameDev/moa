import React from 'react';
import { Search } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  customVisual?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  maxWidthClass?: string;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  customVisual,
  title,
  description,
  actionLabel,
  onAction,
  maxWidthClass = 'max-w-2xl mx-auto',
  className = ''
}) => {
  return (
    <div
      className={`text-center py-14 px-6 rounded-2xl bg-[#031D1C] border border-white/10 ${maxWidthClass} ${className}`}
    >
      {customVisual ? (
        <div className="flex items-center justify-center mx-auto mb-5">
          {customVisual}
        </div>
      ) : (
        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4 text-[#25CDB6]">
          {icon || <Search className="w-5 h-5" />}
        </div>
      )}
      <h3 className="text-xl font-bold text-[#EDE9E0] tracking-tight mb-2">{title}</h3>
      {description && (
        <p className="text-sm sm:text-base text-[#EDE9E0]/75 max-w-lg mx-auto leading-relaxed">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-6 inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 rounded-xl bg-[#25CDB6]/15 border border-[#25CDB6]/35 text-sm font-medium text-[#25CDB6] hover:bg-[#25CDB6]/25 transition-colors cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
