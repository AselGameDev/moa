import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { AtmosphericBackground } from '../components/AtmosphericBackground';
import { EditableText } from '../components/EditableText';
import { SpaLink } from '../components/SpaLink';
import { useContent } from '../hooks/useContent';
import { SiteContent } from '../types';

interface NotFoundViewProps {
  content: SiteContent;
  onNavigate: (path: string) => void;
  isEditMode?: boolean;
  onUpdateContent?: (fieldPath: string, newValue: string) => void;
  fallbackMessage?: string;
}

export const NotFoundView: React.FC<NotFoundViewProps> = ({
  content: rawContent,
  onNavigate,
  isEditMode = false,
  onUpdateContent = () => {},
  fallbackMessage
}) => {
  const { content } = useContent(rawContent);
  const message = content.notFound.message || fallbackMessage || 'The page or resource you are looking for does not exist.';

  return (
    <AtmosphericBackground intensity="subtle" className="min-h-[75vh] flex items-center justify-center px-4 py-20">
      <div className="max-w-lg w-full text-center space-y-6 bg-[#031D1C]/80 border border-white/10 rounded-3xl p-8 sm:p-12 shadow-2xl">
        <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#CA7952]/15 border border-[#CA7952]/40 text-xs font-mono font-bold text-[#CA7952]">
          <EditableText
            value={content.notFound.badge}
            fieldPath="notFound.badge"
            label="404 Badge"
            isEditMode={isEditMode}
            onUpdate={onUpdateContent}
          />
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#EDE9E0] tracking-tight">
          <EditableText
            value={content.notFound.heading}
            fieldPath="notFound.heading"
            label="404 Heading"
            isEditMode={isEditMode}
            onUpdate={onUpdateContent}
          />
        </h1>

        <p className="text-sm sm:text-base text-[#EDE9E0]/75 leading-relaxed">
          <EditableText
            value={message}
            fieldPath="notFound.message"
            label="404 Message"
            multiline
            isEditMode={isEditMode}
            onUpdate={onUpdateContent}
          />
        </p>

        <div className="pt-2">
          <SpaLink
            href="/"
            onNavigate={onNavigate}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#031D1C] font-bold text-sm transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{content.notFound.homeButtonLabel}</span>
          </SpaLink>
        </div>
      </div>
    </AtmosphericBackground>
  );
};
