import React, { useEffect, useState } from 'react';
import { Department } from '../types';
import { getInitials, isRddDepartment } from '../utils/orgHelpers';
import { DepartmentIcon } from './DepartmentIcon';

interface DepartmentLogoProps {
  department: Pick<
    Department,
    'id' | 'name' | 'slug' | 'isRdd' | 'customLogoUrl' | 'iconUrl' | 'iconGlyph' | 'colorHex' | 'iconBgHex'
  >;
  size?: number;
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
  className = '',
  fallbackMode = 'initials',
  rounded = 'full',
  showBorder = true
}) => {
  const logoSrc =
    department.customLogoUrl ||
    (isRddDepartment(department as Department) ? '/5320.jpg' : '') ||
    department.iconUrl ||
    '';

  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [logoSrc]);

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
          src={logoSrc}
          alt={department.name}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  if (fallbackMode === 'icon') {
    return (
      <div
        className={`${roundedClass} flex items-center justify-center shrink-0 shadow-sm ${
          showBorder ? 'border border-white/15' : ''
        } ${className}`}
        style={{
          width: size,
          height: size,
          backgroundColor: department.iconBgHex || '#0A3D3C'
        }}
      >
        <DepartmentIcon
          glyph={department.iconGlyph}
          size={size}
          color={department.colorHex}
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
