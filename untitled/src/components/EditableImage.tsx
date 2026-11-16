import React, { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { MediaPicker } from './MediaPicker';

interface EditableImageProps {
  src: string;
  alt: string;
  label: string;
  isEditMode: boolean;
  onSelectUrl: (newUrl: string) => void;
  className?: string;
  containerClassName?: string;
}

export const EditableImage: React.FC<EditableImageProps> = ({
  src,
  alt,
  label,
  isEditMode,
  onSelectUrl,
  className = '',
  containerClassName = ''
}) => {
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!isEditMode) {
    return <img src={src} alt={alt} className={className} />;
  }

  return (
    <>
      <div
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();
          setPickerOpen(true);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setPickerOpen(true);
          }
        }}
        title={`Click to change ${label}`}
        className={`relative group/editimg cursor-pointer rounded-xl hover:outline-dashed hover:outline-2 hover:outline-[#25CDB6] ${containerClassName}`}
      >
        <img src={src} alt={alt} className={className} />
        <span className="opacity-0 group-hover/editimg:opacity-100 transition-opacity duration-150 absolute top-2 right-2 z-30 bg-[#031D1C] text-[#25CDB6] border border-[#25CDB6]/50 text-[10px] font-mono font-bold px-2 py-0.5 rounded shadow-lg flex items-center gap-1 pointer-events-none whitespace-nowrap">
          <ImageIcon className="w-2.5 h-2.5" />
          <span>Change {label}</span>
        </span>
      </div>

      <MediaPicker
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={asset => onSelectUrl(asset.url)}
        allowedTypes={['image']}
        title={`Select ${label}`}
        currentUrl={src}
      />
    </>
  );
};
