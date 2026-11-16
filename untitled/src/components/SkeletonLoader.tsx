import React from 'react';

export const HierarchyTreeSkeleton: React.FC = () => {
  return (
    <div
      className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 py-8"
      aria-label="Loading organization hierarchy"
    >
      <div className="rounded-3xl bg-[#042423]/45 border border-white/10 p-6 sm:p-10 animate-pulse">
        {/* Desktop reserved skeleton matching 72 + 120 + 72 + 140 + 52 + labels */}
        <div className="hidden lg:flex flex-col items-center justify-between min-h-[460px]">
          <div className="flex flex-col items-center gap-2">
            <div className="w-[72px] h-[72px] rounded-full bg-white/10" />
            <div className="w-24 h-3 rounded bg-white/10" />
          </div>
          <div className="w-full flex items-center justify-center gap-24">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="w-[64px] h-[64px] rounded-full bg-white/10" />
                <div className="w-28 h-3 rounded bg-white/10" />
              </div>
            ))}
          </div>
          <div className="w-full flex items-center justify-center gap-8 flex-wrap">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="w-[52px] h-[52px] rounded-full bg-white/10" />
                <div className="w-20 h-3 rounded bg-white/10" />
              </div>
            ))}
          </div>
        </div>
        {/* Mobile/Tablet skeleton */}
        <div className="flex lg:hidden flex-col items-center gap-6 py-4">
          <div className="w-[72px] h-[72px] rounded-full bg-white/10" />
          <div className="w-[72px] h-[72px] rounded-full bg-white/10" />
          <div className="grid grid-cols-2 gap-6 w-full max-w-xs">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="w-[52px] h-[52px] rounded-full bg-white/10" />
                <div className="w-20 h-3 rounded bg-white/10" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const CardGridSkeleton: React.FC<{ count?: number; columnsClass?: string }> = ({
  count = 6,
  columnsClass = 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
}) => {
  return (
    <div className={`grid ${columnsClass}`} aria-label="Loading items">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="rounded-3xl bg-[#042423]/60 border border-white/10 overflow-hidden animate-pulse"
        >
          <div className="aspect-[16/10] bg-white/5" />
          <div className="p-6 space-y-3">
            <div className="h-5 w-3/4 rounded bg-white/10" />
            <div className="h-3.5 w-full rounded bg-white/10" />
            <div className="h-3.5 w-2/3 rounded bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  );
};
