import CreateProjectCard from "./CreateProjectCard";
import EmptyProjectsState from "./EmptyProjectsState";
import ProjectCard from "./ProjectCard";
import { Skeleton } from "@/components/ui/skeleton";
import type { Project } from "@/lib/types/database";

interface ProjectsGridProps {
  projects: (Project & {
    workbench_content: { canvas_content: any | null }[];
  })[];
  isLoading?: boolean;
}

export default function ProjectsGrid({
  projects,
  isLoading,
}: ProjectsGridProps) {
  // Show skeleton while loading
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-48 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  // Show empty state only after loading is complete and projects is truly empty
  if (projects.length === 0) {
    return <EmptyProjectsState />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <CreateProjectCard />
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}
