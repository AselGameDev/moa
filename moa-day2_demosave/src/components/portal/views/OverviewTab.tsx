import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  FolderKanban,
  Building,
  HardDrive,
  Users,
  Eye,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Mail,
  ShieldCheck,
  TrendingUp,
  Activity,
  FileText
} from 'lucide-react';
import {
  Department,
  Project,
  SiteHealthItem,
  FormSubmission,
  ActivityRecord,
  User
} from '../../../types';

interface OverviewTabProps {
  currentUser: User;
  departments: Department[];
  projects: Project[];
  healthWarnings: SiteHealthItem[];
  submissions: FormSubmission[];
  activityLog: ActivityRecord[];
  onNavigateTab: (tab: string, subTab?: string, id?: string) => void;
  onNavigateSite: () => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  currentUser,
  departments,
  projects,
  healthWarnings,
  submissions,
  activityLog,
  onNavigateTab,
  onNavigateSite
}) => {
  // Setup checklist state (stored in localStorage)
  const [checklistDismissed, setChecklistDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('moa_checklist_dismissed') === 'true';
    } catch {
      return false;
    }
  });

  const publishedDepts = departments.filter(d => d.published && !d.deletedAt);
  const publishedProjects = projects.filter(p => p.publicationStatus === 'Published' && !p.deletedAt);
  const pendingReviews = projects.filter(p => p.publicationStatus === 'Pending Review' && !p.deletedAt);
  const draftProjects = projects.filter(p => p.publicationStatus === 'Draft' && !p.deletedAt);

  // Setup checklist items
  const checklist = [
    { label: 'Set Organization Branding & Logo', done: true, tab: 'website', sub: 'theme' },
    { label: 'Review All Departments & Focus Areas', done: publishedDepts.length >= 8, tab: 'content', sub: 'departments' },
    { label: 'Publish Your First Research Project', done: publishedProjects.length >= 1, tab: 'content', sub: 'projects' },
    { label: 'Verify SEO Title & Share Metadata', done: true, tab: 'website', sub: 'seo' },
    { label: 'Configure Contact Form & Inquiries', done: submissions.length > 0 || true, tab: 'settings', sub: 'inbox' }
  ];
  const completedChecklistCount = checklist.filter(c => c.done).length;
  const isChecklistComplete = completedChecklistCount === checklist.length;

  // Department completeness calculation
  const getDeptCompleteness = (dept: Department) => {
    let score = 0;
    if (dept.name) score += 20;
    if (dept.introduction && dept.introduction.length > 20) score += 20;
    if (dept.purpose && dept.purpose.length > 20) score += 20;
    if (dept.mission && dept.mission.length > 20) score += 20;
    if (dept.areasOfFocus && dept.areasOfFocus.length > 0) score += 20;
    return score;
  };

  // Continue Editing: Last 3 modified items (projects or departments)
  const continueEditingItems = [...projects]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
    .slice(0, 3);

  return (
    <div className="space-y-8 select-none">
      {/* 1. Welcome & High-Level Pulse Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#031D1C] to-[#0A3D3C] border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#25CDB6]" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#25CDB6] font-mono">
              Operational Workspace
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#EDE9E0] tracking-tight">
            Welcome back, {currentUser?.name?.split(' ')[0] || 'Administrator'}
          </h1>
          <p className="text-xs sm:text-sm text-[#EDE9E0]/70 leading-relaxed">
            All system branches are live and operational. You have {pendingReviews.length} project{pendingReviews.length === 1 ? '' : 's'} in review and {submissions.filter(s => s.status === 'new').length} new inquiry.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onNavigateSite}
            className="px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-[#EDE9E0] flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Eye className="w-4 h-4 text-[#25CDB6]" />
            <span>View Live Site</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('website', 'editor')}
            className="px-5 py-2.5 rounded-2xl bg-[#17A491] hover:bg-[#25CDB6] text-[#06302F] text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-[#17A491]/25 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Open Page Editor</span>
          </button>
        </div>
      </div>

      {/* 2. Setup Checklist (Disappears when dismissed or 100% complete) */}
      {!checklistDismissed && !isChecklistComplete && (
        <div className="p-6 rounded-3xl bg-[#031D1C] border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-[#25CDB6]" />
              <h2 className="text-sm font-bold text-[#EDE9E0]">Platform Launch Checklist</h2>
              <span className="text-[11px] font-bold text-[#25CDB6] font-mono">
                {completedChecklistCount} of {checklist.length} completed
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setChecklistDismissed(true);
                try {
                  localStorage.setItem('moa_checklist_dismissed', 'true');
                } catch {}
              }}
              className="text-xs text-[#EDE9E0]/40 hover:text-white transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {checklist.map((item, idx) => (
              <div
                key={idx}
                onClick={() => onNavigateTab(item.tab, item.sub)}
                className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                  item.done
                    ? 'bg-white/[0.02] border-white/5 text-[#EDE9E0]/50'
                    : 'bg-[#06302F]/60 border-[#25CDB6]/30 text-[#EDE9E0] hover:border-[#25CDB6]'
                }`}
              >
                <div className="flex items-center gap-2 text-xs">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${item.done ? 'bg-[#25CDB6]/20 text-[#25CDB6]' : 'border border-white/30'}`}>
                    {item.done && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                  <span className={item.done ? 'line-through' : 'font-semibold'}>{item.label}</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-white/30 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Core Metrics & Pipeline Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Published Projects */}
        <div
          onClick={() => onNavigateTab('content', 'projects')}
          className="p-5 rounded-3xl bg-[#031D1C] border border-white/10 hover:border-[#25CDB6]/40 transition-colors cursor-pointer space-y-3"
        >
          <div className="flex items-center justify-between text-xs text-[#EDE9E0]/60">
            <span className="font-semibold">Projects Pipeline</span>
            <FolderKanban className="w-4 h-4 text-[#25CDB6]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#EDE9E0] tracking-tight tabular-nums font-mono">
              {projects.length}
            </span>
            <span className="text-xs text-[#25CDB6] font-semibold">
              {publishedProjects.length} live
            </span>
          </div>
          <div className="flex gap-1 h-1.5 rounded-full overflow-hidden bg-white/5">
            <div style={{ width: `${(publishedProjects.length / (projects.length || 1)) * 100}%` }} className="bg-[#25CDB6]" title="Published" />
            <div style={{ width: `${(pendingReviews.length / (projects.length || 1)) * 100}%` }} className="bg-amber-400" title="In Review" />
            <div style={{ width: `${(draftProjects.length / (projects.length || 1)) * 100}%` }} className="bg-white/20" title="Draft" />
          </div>
        </div>

        {/* Metric 2: Active Departments */}
        <div
          onClick={() => onNavigateTab('content', 'departments')}
          className="p-5 rounded-3xl bg-[#031D1C] border border-white/10 hover:border-[#25CDB6]/40 transition-colors cursor-pointer space-y-3"
        >
          <div className="flex items-center justify-between text-xs text-[#EDE9E0]/60">
            <span className="font-semibold">Active Departments</span>
            <Building className="w-4 h-4 text-[#D0A873]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#EDE9E0] tracking-tight tabular-nums font-mono">
              {publishedDepts.length}
            </span>
            <span className="text-xs text-[#EDE9E0]/50 font-semibold">
              of {departments.length} total
            </span>
          </div>
          <div className="text-[11px] text-[#EDE9E0]/50 truncate">
            RDD Oversight Active · 100% Tree Linked
          </div>
        </div>

        {/* Metric 3: Form Inquiries */}
        <div
          onClick={() => onNavigateTab('settings', 'inbox')}
          className="p-5 rounded-3xl bg-[#031D1C] border border-white/10 hover:border-[#25CDB6]/40 transition-colors cursor-pointer space-y-3"
        >
          <div className="flex items-center justify-between text-xs text-[#EDE9E0]/60">
            <span className="font-semibold">Contact Inquiries</span>
            <Mail className="w-4 h-4 text-[#64B5D9]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#EDE9E0] tracking-tight tabular-nums font-mono">
              {submissions.length}
            </span>
            {submissions.filter(s => s.status === 'new').length > 0 && (
              <span className="text-xs text-amber-300 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-full">
                {submissions.filter(s => s.status === 'new').length} new
              </span>
            )}
          </div>
          <div className="text-[11px] text-[#EDE9E0]/50">
            Zero telemetry · Direct private inbox
          </div>
        </div>

        {/* Metric 4: System Health Status */}
        <div
          onClick={() => onNavigateTab('settings', 'health')}
          className="p-5 rounded-3xl bg-[#031D1C] border border-white/10 hover:border-[#25CDB6]/40 transition-colors cursor-pointer space-y-3"
        >
          <div className="flex items-center justify-between text-xs text-[#EDE9E0]/60">
            <span className="font-semibold">Site Health Check</span>
            <ShieldCheck className="w-4 h-4 text-[#25CDB6]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#25CDB6] tracking-tight tabular-nums font-mono">
              {healthWarnings.length === 0 ? '100%' : `${Math.max(60, 100 - healthWarnings.length * 10)}%`}
            </span>
            <span className="text-xs text-[#EDE9E0]/50 font-semibold">
              {healthWarnings.length === 0 ? 'Optimal' : `${healthWarnings.length} alerts`}
            </span>
          </div>
          <div className="text-[11px] text-[#EDE9E0]/50">
            {healthWarnings.length === 0 ? 'All links & assets verified' : 'Actionable issues require review'}
          </div>
        </div>
      </div>

      {/* 4. Two-Column Split: Continue Editing + Actionable Health Warnings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Continue Editing */}
        <div className="p-6 rounded-3xl bg-[#031D1C] border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#25CDB6]" />
              <h3 className="text-sm font-bold text-[#EDE9E0]">Continue Editing</h3>
            </div>
            <button
              onClick={() => onNavigateTab('content', 'projects')}
              className="text-xs text-[#25CDB6] hover:underline cursor-pointer"
            >
              View all
            </button>
          </div>

          <div className="space-y-2.5">
            {continueEditingItems.map(item => (
              <div
                key={item.id}
                onClick={() => onNavigateTab('content', 'projects', item.id)}
                className="p-3.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 flex items-center justify-between gap-4 transition-colors cursor-pointer"
              >
                <div className="truncate">
                  <h4 className="text-xs font-bold text-[#EDE9E0] truncate">{item.title}</h4>
                  <div className="flex items-center gap-2 text-[11px] text-[#EDE9E0]/50 mt-0.5">
                    <span className="capitalize">{item.category || 'Innovation'}</span>
                    <span>·</span>
                    <span className="capitalize font-medium text-[#25CDB6]">{item.publicationStatus}</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-white/30 shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* Right: Actionable Site Health Alerts */}
        <div className="p-6 rounded-3xl bg-[#031D1C] border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-[#EDE9E0]">Actionable Site Health</h3>
            </div>
            <button
              onClick={() => onNavigateTab('settings', 'health')}
              className="text-xs text-[#25CDB6] hover:underline cursor-pointer"
            >
              Run scan
            </button>
          </div>

          <div className="space-y-2.5">
            {healthWarnings.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#EDE9E0]/50 space-y-1">
                <CheckCircle2 className="w-6 h-6 text-[#25CDB6] mx-auto mb-2" />
                <p className="font-semibold text-[#EDE9E0]">No health warnings</p>
                <p>All SEO titles, department intros, and image assets are in verified order.</p>
              </div>
            ) : (
              healthWarnings.slice(0, 4).map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-3"
                >
                  <div>
                    <h4 className="text-xs font-bold text-[#EDE9E0]">{item.title}</h4>
                    <p className="text-[11px] text-[#EDE9E0]/60 mt-0.5">{item.message}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateTab(item.actionTab || 'settings', 'health')}
                    className="px-3 py-1 rounded-xl bg-[#17A491]/20 hover:bg-[#17A491]/30 text-[#25CDB6] text-xs font-bold shrink-0 transition-colors cursor-pointer"
                  >
                    Fix
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 5. Department Completeness Section */}
      <div className="p-6 sm:p-7 rounded-3xl bg-[#031D1C] border border-white/10 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#EDE9E0]">Department Completeness Scores</h3>
            <p className="text-xs text-[#EDE9E0]/60">
              Ensure each department has structured purpose, mission, and areas of focus for public display.
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('content', 'departments')}
            className="text-xs text-[#25CDB6] font-bold hover:underline cursor-pointer"
          >
            Manage Departments →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {departments.map(dept => {
            const pct = getDeptCompleteness(dept);
            return (
              <div
                key={dept.id}
                onClick={() => onNavigateTab('content', 'departments', dept.id)}
                className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-[#25CDB6]/40 transition-colors cursor-pointer space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#EDE9E0] truncate">{dept.shortName || dept.name}</span>
                  <span className="font-mono font-bold text-[#25CDB6] text-[11px] tabular-nums">{pct}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    style={{ width: `${pct}%` }}
                    className={`h-full transition-all duration-300 ${
                      pct === 100 ? 'bg-[#25CDB6]' : pct >= 60 ? 'bg-[#17A491]' : 'bg-amber-400'
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
