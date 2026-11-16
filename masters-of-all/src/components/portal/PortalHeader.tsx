import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Bell,
  Plus,
  ExternalLink,
  ChevronDown,
  LogOut,
  FolderKanban,
  Building,
  FileText,
  BookOpen,
  Package,
  Users
} from 'lucide-react';
import { User, RoleDefinition } from '../../types';
import { CreateActionType, getVisibleCreateActions } from './portalRegistry';

interface PortalHeaderProps {
  breadcrumbs: string[];
  currentUser: User;
  roles?: RoleDefinition[];
  onOpenSearch: () => void;
  onOpenInbox: () => void;
  attentionCount?: number;
  onNavigateSite: () => void;
  onLogout: () => void;
  onCreateAction: (actionType: CreateActionType) => void;
  siteStatus?: 'Live' | 'Maintenance' | 'Unsaved Changes';
}

const ACTION_ICONS: Record<CreateActionType, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  project: { icon: FolderKanban, color: 'text-[#25CDB6]' },
  publication: { icon: BookOpen, color: 'text-[#D0A873]' },
  product: { icon: Package, color: 'text-[#64B5D9]' },
  department: { icon: Building, color: 'text-[#CA7952]' },
  page: { icon: FileText, color: 'text-[#EDE9E0]/80' },
  member: { icon: Users, color: 'text-[#EDE9E0]/80' }
};

export const PortalHeader: React.FC<PortalHeaderProps> = ({
  breadcrumbs,
  currentUser,
  roles,
  onOpenSearch,
  onOpenInbox,
  attentionCount = 0,
  onNavigateSite,
  onLogout,
  onCreateAction,
  siteStatus = 'Live'
}) => {
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const createMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const visibleActions = getVisibleCreateActions(currentUser, roles);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (createMenuRef.current && !createMenuRef.current.contains(e.target as Node)) {
        setCreateMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-16 shrink-0 bg-[#06302F] border-b border-white/10 px-4 sm:px-6 flex items-center justify-between gap-4 z-20">
      <div className="flex items-center gap-3 overflow-hidden">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[#EDE9E0]/60 truncate font-medium">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span className="text-white/20">/</span>}
              <span className={`truncate ${idx === breadcrumbs.length - 1 ? 'text-[#EDE9E0] font-bold' : 'hover:text-white'}`}>
                {crumb}
              </span>
            </React.Fragment>
          ))}
        </nav>

        <span
          className={`hidden xl:inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
            siteStatus === 'Live'
              ? 'bg-[#17A491]/15 text-[#25CDB6] border-[#17A491]/30'
              : siteStatus === 'Maintenance'
              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
              : 'bg-blue-500/15 text-blue-300 border-blue-500/30'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${siteStatus === 'Live' ? 'bg-[#25CDB6]' : 'bg-amber-400'}`} />
          <span>{siteStatus}</span>
        </span>
      </div>

      <div className="flex-1 max-w-md hidden md:block">
        <button
          type="button"
          onClick={onOpenSearch}
          className="w-full bg-[#031D1C] hover:bg-white/[0.04] border border-white/10 hover:border-[#25CDB6]/40 px-3.5 py-2 rounded-xl text-xs text-[#EDE9E0]/50 flex items-center justify-between transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-[#EDE9E0]/40 group-hover:text-[#25CDB6] transition-colors" />
            <span className="truncate">Search content or run action...</span>
          </div>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-[#EDE9E0]/40">
            ⌘K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <button
          type="button"
          onClick={onOpenSearch}
          className="md:hidden p-2 rounded-xl text-[#EDE9E0]/70 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          aria-label="Search Control Room"
          title="Search (⌘K)"
        >
          <Search className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onOpenInbox}
          className="p-2 rounded-xl text-[#EDE9E0]/70 hover:text-white hover:bg-white/5 transition-colors cursor-pointer relative"
          aria-label="Open notifications inbox"
          title="Needs your attention inbox"
        >
          <Bell className="w-4 h-4" />
          {attentionCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          )}
        </button>

        {visibleActions.length > 0 && (
          <div className="relative" ref={createMenuRef}>
            <button
              type="button"
              onClick={() => setCreateMenuOpen(!createMenuOpen)}
              className="px-3 py-1.5 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#17A491]/20 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">Create</span>
              <ChevronDown className="w-3 h-3 text-[#06302F]/60" />
            </button>

            {createMenuOpen && (
              <div className="absolute right-0 mt-2 w-60 bg-[#031D1C] border border-white/10 rounded-2xl shadow-2xl p-1.5 space-y-0.5 text-xs text-[#EDE9E0] z-50">
                {visibleActions.map(action => {
                  const meta = ACTION_ICONS[action.id];
                  const Icon = meta.icon;
                  return (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => {
                        setCreateMenuOpen(false);
                        onCreateAction(action.id);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-left transition-colors cursor-pointer"
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${meta.color}`} />
                      <div>
                        <span className="font-bold block">{action.label}</span>
                        <span className="text-[10px] text-[#EDE9E0]/50">{action.description}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={onNavigateSite}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-[#EDE9E0] transition-colors cursor-pointer"
          title="Open live public website"
        >
          <span>Live Site</span>
          <ExternalLink className="w-3.5 h-3.5 text-[#EDE9E0]/60" />
        </button>

        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            aria-label="Account menu"
            className="w-8 h-8 rounded-full bg-[#17A491]/20 border border-[#17A491]/50 text-[#25CDB6] font-bold text-xs flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-[#25CDB6]/40 transition-all"
            title={currentUser?.email}
          >
            {currentUser?.name ? currentUser.name[0].toUpperCase() : 'U'}
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-[#031D1C] border border-white/10 rounded-2xl shadow-2xl p-2 space-y-1 text-xs text-[#EDE9E0] z-50">
              <div className="px-3 py-2 border-b border-white/10">
                <span className="font-bold block text-[#EDE9E0] truncate">{currentUser?.name}</span>
                <span className="text-[10px] text-[#EDE9E0]/50 truncate block font-mono">{currentUser?.email}</span>
                <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#17A491]/20 text-[#25CDB6] capitalize">
                  {currentUser?.role}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setUserMenuOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-red-300 hover:bg-red-500/10 text-left transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
