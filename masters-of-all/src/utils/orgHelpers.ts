import { Department } from '../types';

export function isSector(item: Department): boolean {
  return item.kind === 'sector';
}

export function isDepartment(item: Department): boolean {
  return item.kind !== 'sector';
}

export function isRddDepartment(item: Department): boolean {
  return Boolean(item.isRdd || item.id === 'dept-rdd' || item.slug?.toLowerCase() === 'rdd');
}

export function splitOrgUnits(allUnits: Department[]): {
  departments: Department[];
  nonRddDepartments: Department[];
  rddDepartment: Department | undefined;
  sectors: Department[];
} {
  const departments = allUnits
    .filter(isDepartment)
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  const rddDepartment = departments.find(isRddDepartment);
  const nonRddDepartments = departments.filter(d => !isRddDepartment(d));

  const sectors = allUnits
    .filter(isSector)
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  return {
    departments,
    nonRddDepartments,
    rddDepartment,
    sectors
  };
}

export function getInitials(name: string): string {
  const cleaned = name
    .replace(/\b(and|of|the|for|unit)\b/gi, ' ')
    .trim()
    .split(/[\s,/-]+/)
    .filter(Boolean);
  if (cleaned.length === 0) return 'M';
  if (cleaned.length === 1) return cleaned[0].slice(0, 2).toUpperCase();
  return `${cleaned[0][0]}${cleaned[1][0]}`.toUpperCase();
}

export function getSectorParentId(sector: Department): string {
  return sector.parentDepartmentId || 'dept-rdd';
}

export function getChildSectors(parentDepartmentId: string, allUnits: Department[]): Department[] {
  return allUnits
    .filter(u => isSector(u) && getSectorParentId(u) === parentDepartmentId)
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
}

export function getUnitHref(unit: Department, allUnits?: Department[]): string {
  if (!isSector(unit)) {
    return `/departments/${unit.slug}`;
  }
  const parentId = getSectorParentId(unit);
  const parentDept = allUnits?.find(d => d.id === parentId && !isSector(d));
  const parentSlug = parentDept?.slug || 'rdd';
  return `/departments/${parentSlug}/${unit.slug}`;
}
