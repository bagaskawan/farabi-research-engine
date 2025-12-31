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
      <div className="rounded-xl p-6 cursor-pointer h-[200px] flex flex-col transition-all duration-300 bg-white border border-gray-200 hover:border-gray-300 hover:shadow-lg dark:bg-[#1a1a1a] dark:border-gray-800 dark:hover:border-gray-600 dark:hover:shadow-lg dark:hover:shadow-gray-900/20">
        {/* Title - Fixed 2 lines max */}
        <h3 className="text-lg font-bold mb-3 text-[#1a1a1a] dark:text-white line-clamp-2 leading-tight min-h-[3.5rem]">
          {project.title}
        </h3>

        {/* Description - Fixed 3 lines, takes remaining space */}
        <p className="text-sm leading-relaxed flex-1 text-gray-500 dark:text-gray-400 line-clamp-3 overflow-hidden">
          {description || "No description available"}
        </p>

        {/* Footer - Always at bottom */}
        <p className="text-sm mt-auto pt-3 border-t border-gray-100 dark:border-gray-800">
          <span className="text-gray-400 dark:text-gray-500">Created </span>
          <span className="text-amber-500 font-medium">
            {getRelativeTime(project.created_at)}
          </span>
        </p>
      </div>
    </Link>
  );
}
