import React, { useEffect, useRef, useState } from 'react';
import { Department } from '../types';
import { getInitials } from '../utils/orgHelpers';
import { DepartmentIcon } from './DepartmentIcon';

interface DepartmentLogoProps {
  department: Pick<
    Department,
    'id' | 'name' | 'slug' | 'isRdd' | 'customLogoUrl' | 'iconUrl' | 'iconGlyph' | 'colorHex' | 'iconBgHex'
  >;
  size?: number;
  iconSize?: number;
  className?: string;
  /**
   * 'initials' renders department initials when no custom logo exists or on image error (D1 spec).
   * 'icon' renders the DepartmentIcon vector badge when no custom logo exists.
   */
  fallbackMode?: 'initials' | 'icon';
  rounded?: 'full' | 'xl' | '2xl';
  showBorder?: boolean;
}

export const DepartmentLogo: React.FC<DepartmentLogoProps> = ({
  department,
  size = 48,
  iconSize,
  className = '',
  fallbackMode = 'initials',
  rounded = 'full',
  showBorder = true
}) => {
  const logoSrc =
    department.customLogoUrl ||
    department.iconUrl ||
    '';

  const imgRef = useRef<HTMLImageElement>(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [logoSrc]);

  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) {
      setImgError(true);
    }
  }, [logoSrc, imgError]);

  const roundedClass =
    rounded === 'full' ? 'rounded-full' : rounded === 'xl' ? 'rounded-xl' : 'rounded-2xl';

  if (logoSrc && !imgError) {
    return (
      <div
        className={`${roundedClass} overflow-hidden flex items-center justify-center shrink-0 bg-[#042423] ${
          showBorder ? 'border border-white/15' : ''
        } ${className}`}
        style={{ width: size, height: size }}
      >
        <img
          ref={imgRef}
          src={logoSrc}
          alt={department.name}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          onLoad={e => {
            if (e.currentTarget.naturalWidth === 0) {
              setImgError(true);
            }
          }}
          className="w-full h-full object-cover text-transparent select-none"
        />
      </div>
    );
  }

  if (fallbackMode === 'icon') {
    const resolvedIconSize = iconSize ?? Math.max(14, Math.round(size * 0.62));
    return (
      <div
        className={`${roundedClass} flex items-center justify-center shrink-0 shadow-sm ${
          showBorder ? 'border border-white/15' : ''
        } ${className}`}
        style={{
          width: size,
          height: size,
          backgroundColor: department.iconBgHex || '#0A3D3C',
          color: department.colorHex || '#25CDB6'
        }}
      >
        <DepartmentIcon
          glyph={department.iconGlyph}
          size={resolvedIconSize}
          color={department.colorHex || '#25CDB6'}
          bgColor={department.iconBgHex}
        />
      </div>
    );
  }

  const initials = getInitials(department.name);
  const fontSize = Math.max(11, Math.round(size * 0.34));

  return (
    <div
      className={`${roundedClass} flex items-center justify-center shrink-0 font-bold tracking-tight select-none shadow-sm ${
        showBorder ? 'border border-white/20' : ''
      } ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: department.iconBgHex || '#0A3D3C',
        color: department.colorHex || '#EDE9E0',
        fontSize: `${fontSize}px`,
        lineHeight: 1
      }}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
};
