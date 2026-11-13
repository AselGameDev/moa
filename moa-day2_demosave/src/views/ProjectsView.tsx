import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Project, Department } from '../types';
import { Search, RefreshCw, ArrowRight } from 'lucide-react';
import { AtmosphericBackground } from '../components/AtmosphericBackground';

interface ProjectsViewProps {
  projects: Project[];
  departments: Department[];
  onNavigate: (path: string) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  departments,
  onNavigate
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const deptMap = useMemo(() => {
    const map = new Map<string, Department>();
    departments.forEach(d => map.set(d.id, d));
    return map;
  }, [departments]);

  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      const matchesSearch =
        project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.shortDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDept =
        selectedDeptId === 'all' || project.departmentIds.includes(selectedDeptId);

      const matchesStatus =
        selectedStatus === 'all' || project.status === selectedStatus;

      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [projects, searchQuery, selectedDeptId, selectedStatus]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedDeptId('all');
    setSelectedStatus('all');
  };

  return (
    <div className="min-h-screen">
      <AtmosphericBackground intensity="subtle" fadeToColor="transparent" className="pt-16 pb-10 lg:pt-20 lg:pb-12 border-b border-[#EDE9E0]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-3xl space-y-4"
          >
            <h1 className="text-4xl sm:text-5xl font-extrabold text-[#EDE9E0] tracking-tight">
              Projects
            </h1>
            <p className="text-base sm:text-lg text-[#EDE9E0]/80 leading-relaxed">
              Exploration turned into practical mechanisms, research tools, educational media, and community initiatives.
            </p>
          </motion.div>
        </div>
      </AtmosphericBackground>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 pb-24 pt-8 sm:pt-12">

        {/* Filter Controls with generous top separation */}
        <div className="p-5 sm:p-7 rounded-2xl bg-[#031D1C] border border-[#EDE9E0]/12 shadow-xl shadow-black/25 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Search Input */}
            <div className="md:col-span-5 relative">
              <Search className="w-4 h-4 text-[#EDE9E0]/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#06302F] border border-[#EDE9E0]/10 text-sm text-[#EDE9E0] placeholder:text-[#EDE9E0]/40 focus:outline-none focus:border-[#17A491]"
              />
            </div>

            {/* Department Filter */}
            <div className="md:col-span-4">
              <select
                value={selectedDeptId}
                onChange={e => setSelectedDeptId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#06302F] border border-[#EDE9E0]/10 text-sm text-[#EDE9E0] focus:outline-none focus:border-[#17A491] cursor-pointer"
              >
                <option value="all">All Departments</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="md:col-span-3">
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#06302F] border border-[#EDE9E0]/10 text-sm text-[#EDE9E0] focus:outline-none focus:border-[#17A491] cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="Active">Active</option>
                <option value="In Development">In Development</option>
                <option value="Completed">Completed</option>
                <option value="Concept">Concept</option>
                <option value="On Hold">On Hold</option>
              </select>
            </div>
          </div>

          {(searchQuery || selectedDeptId !== 'all' || selectedStatus !== 'all') && (
            <div className="pt-2 border-t border-[#EDE9E0]/10 flex items-center justify-between text-xs">
              <span className="text-[#EDE9E0]/60">
                Found <strong className="text-[#25CDB6]">{filteredProjects.length}</strong> matching projects
              </span>
              <button
                onClick={resetFilters}
                className="text-[#CA7952] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reset Filters</span>
              </button>
            </div>
          )}
        </div>

        {/* Project Content Listing / Friendly Empty State with Single Circling Dot in Orbit */}
        {filteredProjects.length === 0 ? (
          <div className="p-16 sm:p-24 text-center rounded-3xl bg-[#031D1C] border border-[#EDE9E0]/10 space-y-6">
            {/* Empty orbit illustration with single circling dot */}
            <div className="relative w-36 h-36 mx-auto flex items-center justify-center">
              <div className="w-28 h-28 rounded-full border border-dashed border-[#17A491]/50 relative animate-[spin_10s_linear_infinite]">
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[#CA7952] shadow-[0_0_10px_#CA7952]" />
              </div>
              <div className="absolute w-12 h-12 rounded-full border border-[#EDE9E0]/20 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-[#25CDB6]" />
              </div>
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <h3 className="text-xl sm:text-2xl font-bold text-[#EDE9E0]">
                No projects yet
              </h3>
              <p className="text-sm text-[#EDE9E0]/70 leading-relaxed">
                We will publish as soon we are done with them.
              </p>
            </div>
          </div>
        ) : (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: {
                transition: {
                  staggerChildren: 0.08
                }
              }
            }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {filteredProjects.map(project => {
              const assignedDepts = project.departmentIds
                .map(id => deptMap.get(id))
                .filter(Boolean) as Department[];

              return (
                <motion.div
                  key={project.id}
                  variants={{
                    hidden: { opacity: 0, y: 24, scale: 0.95 },
                    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } }
                  }}
                  onClick={() => onNavigate(`/projects/${project.slug}`)}
                  className="group cursor-pointer rounded-2xl bg-[#031D1C] border border-[#EDE9E0]/10 overflow-hidden flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:border-[#17A491]"
                >
                  <div>
                    {project.coverImage && (
                      <div className="relative aspect-[16/10] overflow-hidden bg-[#06302F]">
                        <img
                          src={project.coverImage}
                          alt={project.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute top-3 right-3 px-2 py-0.5 rounded text-xs bg-[#06302F]/90 border border-[#EDE9E0]/10 text-[#25CDB6]">
                          {project.status}
                        </div>
                      </div>
                    )}

                    <div className="p-6 space-y-3">
                      <div className="flex flex-wrap gap-1.5">
                        {assignedDepts.map(d => (
                          <span
                            key={d.id}
                            className="text-xs text-[#CA7952] bg-[#06302F] px-2 py-0.5 rounded border border-[#EDE9E0]/10"
                          >
                            {d.name}
                          </span>
                        ))}
                      </div>

                      <h3 className="text-lg font-bold text-[#EDE9E0] group-hover:text-[#25CDB6] transition-colors leading-snug">
                        {project.title}
                      </h3>

                      <p className="text-xs sm:text-sm text-[#EDE9E0]/70 line-clamp-3 leading-relaxed">
                        {project.shortDescription}
                      </p>
                    </div>
                  </div>

                  <div className="p-6 pt-0">
                    <div className="pt-4 border-t border-[#EDE9E0]/10 flex items-center justify-between text-xs text-[#EDE9E0]/50">
                      <span>{project.startDate.substring(0, 7)}</span>
                      <span className="inline-flex items-center gap-1 text-[#25CDB6] font-medium group-hover:translate-x-1 transition-transform">
                        <span>Read More</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
};
