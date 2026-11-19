import React from 'react';
import {
  LayoutDashboard,
  Globe,
  FolderKanban,
  Image as ImageIcon,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { User, RoleDefinition } from '../../types';
import { MainTab, getVisibleMainTabs } from './portalRegistry';

export type { MainTab };

interface PortalSidebarProps {
  activeTab: MainTab;
  onSelectTab: (tab: MainTab) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  currentUser: User;
  roles?: RoleDefinition[];
  logoUrl?: string;
  onOpenShortcuts: () => void;
  attentionCount?: number;
  onNavigateSite: () => void;
}

const TAB_ICONS: Record<MainTab, React.ComponentType<{ className?: string }>> = {
  overview: LayoutDashboard,
  website: Globe,
  content: FolderKanban,
  media: ImageIcon,
  team: Users,
  settings: Settings
};

export const PortalSidebar: React.FC<PortalSidebarProps> = ({
  activeTab,
  onSelectTab,
  collapsed,
  onToggleCollapsed,
  currentUser,
  roles,
  logoUrl = '/drawing1.png',
  onOpenShortcuts,
  attentionCount = 0,
  onNavigateSite
}) => {
  const visibleTabs = getVisibleMainTabs(currentUser, roles);

  return (
    <>
      {/* Desktop & Tablet Sidebar */}
      <aside
        className={`hidden md:flex flex-col justify-between shrink-0 bg-[#031D1C] border-r border-white/10 transition-all duration-300 z-30 ${
          collapsed ? 'w-20' : 'w-56 lg:w-64'
        }`}
      >
        <div>
          <div className="h-16 px-4 flex items-center justify-between border-b border-white/10">
            <button
              type="button"
              onClick={onNavigateSite}
              className="flex items-center gap-3 overflow-hidden text-left group cursor-pointer"
              title="View live public site"
            >
              <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border border-[#25CDB6]/40 bg-[#06302F]">
                <img
                  src={logoUrl || '/drawing1.png'}
                  alt="MoA Emblem"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              {!collapsed && (
                <div className="truncate">
                  <h2 className="text-xs font-bold text-[#EDE9E0] tracking-tight group-hover:text-[#25CDB6] transition-colors">
                    MoA Control Room
                  </h2>
                  <span className="text-[10px] text-[#EDE9E0]/50 block font-mono">
                    Masters Of All
                  </span>
                </div>
              )}
            </button>

            <button
              type="button"
              onClick={onToggleCollapsed}
              className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          <nav aria-label="Control Room Navigation" className="p-3 space-y-1">
            {visibleTabs.map(item => {
              const Icon = TAB_ICONS[item.id];
              const isActive = activeTab === item.id;
              const badge = item.id === 'overview' && attentionCount > 0 ? attentionCount : undefined;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer relative ${
                    isActive
                      ? 'bg-[#17A491]/20 text-[#25CDB6] border border-[#17A491]/40 shadow-sm'
                      : 'text-[#EDE9E0]/70 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#25CDB6]' : 'text-[#EDE9E0]/50'}`} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {badge && badge > 0 && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                        collapsed
                          ? 'absolute top-1.5 right-1.5 w-2 h-2 p-0 bg-amber-400'
                          : 'ml-auto bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {!collapsed && badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-3 border-t border-white/10 space-y-2">
          {!collapsed && (
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-[#17A491]/20 border border-[#17A491]/40 flex items-center justify-center text-[11px] font-bold text-[#25CDB6] shrink-0">
                {currentUser?.name ? currentUser.name[0].toUpperCase() : 'U'}
              </div>
              <div className="truncate flex-1">
                <span className="text-xs font-bold text-[#EDE9E0] block truncate">
                  {currentUser?.name || 'Team Member'}
                </span>
                <span className="text-[10px] text-[#EDE9E0]/50 capitalize block font-mono">
                  {currentUser?.role || 'Member'}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-[#EDE9E0]/50 px-1">
            <button
              type="button"
              onClick={onOpenShortcuts}
              className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer text-[11px]"
              title="Keyboard shortcuts (?)"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              {!collapsed && <span>Shortcuts</span>}
            </button>

            <button
              type="button"
              onClick={onNavigateSite}
              className="flex items-center gap-1 hover:text-[#25CDB6] transition-colors cursor-pointer text-[11px]"
              title="View live public site"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              {!collapsed && <span>Live Site</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Control Room Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#031D1C]/95 backdrop-blur-xl border-t border-white/10 px-1 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] flex items-center justify-around gap-0.5 text-[10px] text-[#EDE9E0]/70"
      >
        {visibleTabs.map(item => {
          const Icon = TAB_ICONS[item.id];
          const isActive = activeTab === item.id;
          const badge = item.id === 'overview' && attentionCount > 0 ? attentionCount : undefined;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`min-h-[44px] flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 px-1 py-1 rounded-lg transition-colors cursor-pointer relative ${
                isActive ? 'text-[#25CDB6] font-bold bg-[#17A491]/10' : 'text-[#EDE9E0]/60 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate max-w-full leading-tight">{item.label}</span>
              {badge && badge > 0 && (
                <span className="absolute top-1 right-1/4 translate-x-2 w-2 h-2 rounded-full bg-amber-400" />
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
};
