import React from 'react';
import { Wrench } from 'lucide-react';
import { AtmosphericBackground } from '../components/AtmosphericBackground';
import { EditableText } from '../components/EditableText';
import { useContent } from '../hooks/useContent';
import { SiteContent } from '../types';

interface MaintenanceViewProps {
  content?: SiteContent;
  logoUrl?: string;
  siteName?: string;
  isEditMode?: boolean;
  onUpdateContent?: (fieldPath: string, newValue: string) => void;
}

export const MaintenanceView: React.FC<MaintenanceViewProps> = ({
  content: rawContent,
  logoUrl = '/drawing1.png',
  siteName = 'Masters Of All',
  isEditMode = false,
  onUpdateContent = () => {}
}) => {
  const { content } = useContent(rawContent);

  return (
    <AtmosphericBackground intensity="subtle" className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full text-center space-y-6 bg-[#031D1C]/85 border border-white/10 rounded-3xl p-8 sm:p-12 shadow-2xl">
        <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[#D0A873]/60 mx-auto bg-[#06302F]">
          <img
            src={logoUrl || '/drawing1.png'}
            alt={siteName}
            className="w-full h-full object-cover rounded-full"
          />
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D0A873]/15 border border-[#D0A873]/40 text-xs font-mono font-bold text-[#D0A873]">
          <Wrench className="w-3.5 h-3.5" />
          <EditableText
            value={content.maintenance.badge}
            fieldPath="maintenance.badge"
            label="Maintenance Badge"
            isEditMode={isEditMode}
            onUpdate={onUpdateContent}
          />
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#EDE9E0] tracking-tight">
          <EditableText
            value={content.maintenance.heading}
            fieldPath="maintenance.heading"
            label="Maintenance Heading"
            isEditMode={isEditMode}
            onUpdate={onUpdateContent}
          />
        </h1>

        <p className="text-sm sm:text-base text-[#EDE9E0]/75 leading-relaxed">
          <EditableText
            value={content.maintenance.message}
            fieldPath="maintenance.message"
            label="Maintenance Message"
            multiline
            isEditMode={isEditMode}
            onUpdate={onUpdateContent}
          />
        </p>
      </div>
    </AtmosphericBackground>
  );
};
