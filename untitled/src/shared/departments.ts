import type { Department, Sector } from '../types';

/**
 * Orders departments for display across navigation, footer, grids, and hierarchy tree:
 * non-pinned departments ordered by displayOrder ascending, followed by pinnedLast
 * departments (e.g. Research, Discovery and Development) pinned at the end.
 */
export function orderDepartmentsForDisplay(departments: Department[]): Department[] {
  return [...departments].sort((a, b) => {
    const aPinned = Boolean(a.pinnedLast) || a.id === 'dept-rdd' || a.slug.toLowerCase() === 'rdd';
    const bPinned = Boolean(b.pinnedLast) || b.id === 'dept-rdd' || b.slug.toLowerCase() === 'rdd';
    if (aPinned !== bPinned) {
      return aPinned ? 1 : -1;
    }
    return (a.displayOrder || 0) - (b.displayOrder || 0);
  });
}

export interface HierarchyLayout {
  rootLabel: string;
  departments: Department[];
  sectorsByDepartment: Record<string, Sector[]>;
}

/**
 * Computes the Masters Of All -> Top-Level Departments -> (RDD) Sectors hierarchy
 * used by the About organizational tree and tests.
 */
export function computeHierarchyLayout(
  departments: Department[],
  sectors: Sector[] = []
): HierarchyLayout {
  const visibleDepts = orderDepartmentsForDisplay(
    departments.filter(d => !d.deletedAt && d.published && d.showInTree !== false)
  );

  const visibleSectors = [...sectors]
    .filter(s => !s.deletedAt && s.published && s.showInTree !== false)
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  const sectorsByDepartment: Record<string, Sector[]> = {};
  for (const dept of visibleDepts) {
    if (dept.supportsSectors || dept.id === 'dept-rdd' || dept.slug.toLowerCase() === 'rdd') {
      sectorsByDepartment[dept.id] = visibleSectors.filter(
        s => s.departmentId === dept.id || (!s.departmentId && dept.id === 'dept-rdd')
      );
    } else {
      sectorsByDepartment[dept.id] = [];
    }
  }

  return {
    rootLabel: 'Masters Of All',
    departments: visibleDepts,
    sectorsByDepartment
  };
}
