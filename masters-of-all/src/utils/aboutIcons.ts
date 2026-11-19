import type { LucideIcon } from 'lucide-react';
import {
  Atom,
  Award,
  BookOpen,
  Brain,
  Code2,
  Compass,
  Cpu,
  Eye,
  FlaskConical,
  Globe,
  Hammer,
  HelpCircle,
  Layers,
  Lightbulb,
  Microscope,
  Puzzle,
  Rocket,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Workflow,
  Wrench
} from 'lucide-react';

export interface AboutIconOption {
  name: string;
  label: string;
  Icon: LucideIcon;
}

export const ABOUT_ICON_OPTIONS: AboutIconOption[] = [
  { name: 'HelpCircle', label: 'Question', Icon: HelpCircle },
  { name: 'Compass', label: 'Compass', Icon: Compass },
  { name: 'Brain', label: 'Critical Mind', Icon: Brain },
  { name: 'Search', label: 'Research', Icon: Search },
  { name: 'Lightbulb', label: 'Insight', Icon: Lightbulb },
  { name: 'Wrench', label: 'Engineering', Icon: Wrench },
  { name: 'Target', label: 'Target', Icon: Target },
  { name: 'Cpu', label: 'Systems', Icon: Cpu },
  { name: 'BookOpen', label: 'Knowledge', Icon: BookOpen },
  { name: 'Microscope', label: 'Empirical Lab', Icon: Microscope },
  { name: 'Atom', label: 'Physics / Core', Icon: Atom },
  { name: 'FlaskConical', label: 'Experiment', Icon: FlaskConical },
  { name: 'Layers', label: 'Synthesis', Icon: Layers },
  { name: 'Code2', label: 'Code / Logic', Icon: Code2 },
  { name: 'Globe', label: 'Global Impact', Icon: Globe },
  { name: 'Scale', label: 'Ethics / Balance', Icon: Scale },
  { name: 'ShieldCheck', label: 'Verification', Icon: ShieldCheck },
  { name: 'Rocket', label: 'Launch', Icon: Rocket },
  { name: 'Workflow', label: 'Continuum', Icon: Workflow },
  { name: 'Eye', label: 'Observation', Icon: Eye },
  { name: 'Puzzle', label: 'Problem Solving', Icon: Puzzle },
  { name: 'Hammer', label: 'Craft / Build', Icon: Hammer },
  { name: 'Sparkles', label: 'Discovery', Icon: Sparkles },
  { name: 'Award', label: 'Excellence', Icon: Award }
];

const ICON_MAP = new Map<string, LucideIcon>(
  ABOUT_ICON_OPTIONS.map(option => [option.name, option.Icon])
);

export const DEFAULT_THINKING_STEP_ICON_NAMES = [
  'HelpCircle',
  'Compass',
  'Brain',
  'Search',
  'Lightbulb',
  'Wrench'
];

export const DEFAULT_WHAT_WE_DO_ICON_NAMES = [
  'Search',
  'Cpu',
  'BookOpen',
  'Target'
];

export function resolveAboutIcon(
  iconName: string | undefined,
  fallbackIndex: number,
  defaultNames: string[] = DEFAULT_THINKING_STEP_ICON_NAMES
): LucideIcon {
  if (iconName && ICON_MAP.has(iconName)) {
    return ICON_MAP.get(iconName)!;
  }
  const fallbackName = defaultNames[fallbackIndex % defaultNames.length];
  return (fallbackName && ICON_MAP.get(fallbackName)) || HelpCircle;
}
