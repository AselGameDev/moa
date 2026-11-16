import React from 'react';
import { ArrowLeft, Compass } from 'lucide-react';
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
  const message =
    content.notFound.message ||
    fallbackMessage ||
    'The page you are looking for does not exist or may have been moved.';

  return (
    <AtmosphericBackground
      intensity="subtle"
      className="flex-1 flex flex-col items-center justify-center px-4 py-16 sm:py-24"
    >
      <div className="max-w-lg w-full mx-auto text-center space-y-6 bg-[#031D1C]/85 border border-white/10 rounded-3xl p-8 sm:p-12 shadow-2xl">
        <div className="text-sm font-mono font-bold tracking-[0.25em] uppercase text-[#CA7952]">
          <EditableText
            value={content.notFound.badge || '404'}
            fieldPath="notFound.badge"
            label="404 Indicator"
            isEditMode={isEditMode}
            onUpdate={onUpdateContent}
          />
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#EDE9E0] tracking-tight">
          <EditableText
            value={content.notFound.heading || 'Page not found'}
            fieldPath="notFound.heading"
            label="404 Heading"
            isEditMode={isEditMode}
            onUpdate={onUpdateContent}
          />
        </h1>

        <p className="max-w-md mx-auto text-sm sm:text-base text-[#EDE9E0]/80 leading-relaxed">
          <EditableText
            value={message}
            fieldPath="notFound.message"
            label="404 Message"
            multiline
            isEditMode={isEditMode}
            onUpdate={onUpdateContent}
          />
        </p>

        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
          <SpaLink
            href="/"
            onNavigate={onNavigate}
            className="min-h-[44px] whitespace-nowrap inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#031D1C] font-bold text-sm transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span>{content.notFound.homeButtonLabel || 'Return to Home'}</span>
          </SpaLink>
          <SpaLink
            href="/departments"
            onNavigate={onNavigate}
            className="min-h-[44px] whitespace-nowrap inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-[#EDE9E0] font-semibold text-sm transition-colors cursor-pointer"
          >
            <Compass className="w-4 h-4 shrink-0 text-[#25CDB6]" />
            <span>Explore Departments</span>
          </SpaLink>
        </div>
      </div>
    </AtmosphericBackground>
  );
};
