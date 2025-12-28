import Link from "next/link";
import { getRelativeTime, extractDescription } from "./utils";
import type { Project } from "@/lib/types/database";

interface ProjectCardProps {
  project: Project & { workbench_content: { canvas_content: any | null }[] };
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const description = extractDescription(
    project.workbench_content?.[0]?.canvas_content
  );

  return (
    <Link href={`/workspace/${project.id}`}>
      <div className="rounded-xl p-6 cursor-pointer min-h-[200px] flex flex-col transition-all duration-500 bg-white border border-gray-100 hover:border-gray-200 hover:shadow-md dark:bg-[#1a1a1a] dark:border-gray-800 dark:hover:border-gray-600 dark:hover:shadow-lg dark:hover:shadow-gray-900/20">
        <h3 className="text-lg font-bold mb-2 transition-colors duration-500 text-[#1a1a1a] dark:text-white line-clamp-2">
          {project.title}
        </h3>
        <p className="text-sm leading-relaxed flex-1 mb-4 transition-colors duration-500 text-gray-500 dark:text-gray-400 line-clamp-3">
          {description}
        </p>
        <p className="text-sm">
          <span className="transition-colors duration-500 text-gray-400 dark:text-gray-500">
            Created{" "}
          </span>
          <span className="text-amber-500">
            {getRelativeTime(project.created_at)}
          </span>
        </p>
      </div>
    </Link>
  );
}
