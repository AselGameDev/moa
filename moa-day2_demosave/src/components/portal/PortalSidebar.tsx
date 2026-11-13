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
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { User } from '../../types';

export type MainTab = 'overview' | 'website' | 'content' | 'media' | 'team' | 'settings';

interface PortalSidebarProps {
  activeTab: MainTab;
  onSelectTab: (tab: MainTab) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  currentUser: User;
  onOpenShortcuts: () => void;
  attentionCount?: number;
  onNavigateSite: () => void;
}

export const PortalSidebar: React.FC<PortalSidebarProps> = ({
  activeTab,
  onSelectTab,
  collapsed,
  onToggleCollapsed,
  currentUser,
  onOpenShortcuts,
  attentionCount = 0,
  onNavigateSite
}) => {
  const navItems: { id: MainTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, badge: attentionCount > 0 ? attentionCount : undefined },
    { id: 'website', label: 'Website', icon: Globe },
    { id: 'content', label: 'Content', icon: FolderKanban },
    { id: 'media', label: 'Media', icon: ImageIcon },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <>
      {/* Desktop & Tablet Sidebar */}
      <aside
        className={`hidden md:flex flex-col justify-between shrink-0 bg-[#031D1C] border-r border-white/10 transition-all duration-300 z-30 select-none ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Top: Brand & Collapse Toggle */}
        <div>
          <div className="h-16 px-4 flex items-center justify-between border-b border-white/10">
            <button
              onClick={onNavigateSite}
              className="flex items-center gap-3 overflow-hidden text-left group cursor-pointer"
              title="View live public site"
            >
              <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border border-[#25CDB6]/40 bg-[#06302F]">
                <img
                  src="/drawing1.png"
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
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Navigation Items (6 Main Tabs) */}
          <nav className="p-3 space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
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
                  {item.badge && item.badge > 0 && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                        collapsed
                          ? 'absolute top-1.5 right-1.5 w-2 h-2 p-0 bg-amber-400'
                          : 'ml-auto bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {!collapsed && item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom: User Card & Shortcuts */}
        <div className="p-3 border-t border-white/10 space-y-2">
          {!collapsed && (
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-[#17A491]/20 border border-[#17A491]/40 flex items-center justify-center text-[11px] font-bold text-[#25CDB6] shrink-0">
                {currentUser?.name ? currentUser.name[0].toUpperCase() : 'U'}
              </div>
              <div className="truncate flex-1">
                <span className="text-xs font-bold text-[#EDE9E0] block truncate">
                  {currentUser?.name || 'Administrator'}
                </span>
                <span className="text-[10px] text-[#EDE9E0]/50 capitalize block font-mono">
                  {currentUser?.role || 'Admin'}
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
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#031D1C]/95 backdrop-blur-xl border-t border-white/10 px-2 py-1.5 flex items-center justify-around text-[10px] text-[#EDE9E0]/70">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center gap-1 p-1.5 rounded-lg transition-colors cursor-pointer relative ${
                isActive ? 'text-[#25CDB6] font-bold' : 'text-[#EDE9E0]/60 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-amber-400" />
              )}
            </button>
          );
        })}
      </div>
    </>
  );
};
