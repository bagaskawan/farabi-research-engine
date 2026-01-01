"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import type {
  Project,
  WorkbenchContent,
  ResearchPaper,
} from "@/lib/types/database";
import LoadingPage from "@/components/ui/loading-page";
import { FileText, Network } from "lucide-react";

import ProjectSidebar from "@/components/modules/workspace/reference-literature";
import WorkspaceHeader from "@/components/modules/workspace/workspace-header";
import WorkspaceCanvas from "@/components/modules/workspace/workspace-canvas";
import BlokHeader from "@/components/modules/research/BlokHeader";

// Dynamically import WorkspaceMindmap to avoid SSR issues with React Flow
const WorkspaceMindmap = dynamic(
  () => import("@/components/modules/workspace/mindmap/WorkspaceMindmap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[600px] bg-slate-100 dark:bg-slate-900 rounded-xl flex items-center justify-center">
        <div className="text-muted-foreground">Loading mindmap...</div>
      </div>
    ),
  }
);

interface WorkspacePageProps {
  projectId?: string;
}

type ViewTab = "canvas" | "mindmap";

export default function WorkspacePage({
  projectId: propProjectId,
}: WorkspacePageProps) {
  const params = useParams();
  const router = useRouter();
  const projectId = propProjectId || (params.id as string);

  const [project, setProject] = useState<Project | null>(null);
  const [content, setContent] = useState<WorkbenchContent | null>(null);
  const [papers, setPapers] = useState<ResearchPaper[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<ViewTab>("canvas");

  // Fetch project data
  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();

      // Fetch project
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (projectError) {
        console.error("Error fetching project:", projectError);
        router.push("/");
        return;
      }

      setProject(projectData);

      // Fetch workbench content
      const { data: contentData } = await supabase
        .from("workbench_content")
        .select("*")
        .eq("project_id", projectId)
        .single();

      if (contentData) {
        setContent(contentData);
      }

      // Fetch research papers
      const { data: papersData } = await supabase
        .from("research_papers")
        .select("*")
        .eq("project_id", projectId)
        .order("citation_count", { ascending: false });

      if (papersData) {
        setPapers(papersData);
      }

      setIsLoading(false);
    }

    fetchData();
  }, [projectId, router]);

  // Extract first paragraph text from canvas_content for sidebar display
  const getProblemStatement = (): string | undefined => {
    if (!content?.canvas_content) return undefined;
    try {
      const blocks = content.canvas_content;
      for (let i = 0; i < blocks.length; i++) {
        if (blocks[i].type === "paragraph" && blocks[i].content?.length > 0) {
          return blocks[i].content.map((c: any) => c.text || "").join("");
        }
      }
    } catch {
      return undefined;
    }
    return undefined;
  };

  // Show loading page while loading
  if (isLoading) {
    return <LoadingPage message="Preparing your workspace" />;
  }

  return (
    <div className="min-h-screen bg-background">
      <BlokHeader />
      <div className="max-w-screen-2xl h-full mx-auto px-4 sm:px-6 lg:px-6 mt-12">
        {/* Tab Navigation + Menu */}
        <div className="flex items-center justify-between mt-6 mb-4 border-b border-border">
          {/* Left: Tabs */}
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab("canvas")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === "canvas"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText className="w-4 h-4" />
              Canvas
            </button>
            <button
              onClick={() => setActiveTab("mindmap")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === "mindmap"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Network className="w-4 h-4" />
              Mindmap
            </button>
          </div>

          {/* Right: Save Status + Menu */}
          <div className="flex items-center gap-2 pb-2">
            <WorkspaceHeader
              isSaving={isSaving}
              projectId={projectId}
              projectTitle={project?.title || "Untitled"}
            />
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === "canvas" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-8">
            {/* Left: Canvas/Editor Area */}
            <WorkspaceCanvas
              canvasContent={content?.canvas_content}
              title={project?.title || "Untitled Research"}
              keyInsights={content?.key_insights || []}
              projectId={projectId}
              onSavingChange={setIsSaving}
            />

            {/* Right: Project Sidebar */}
            <ProjectSidebar
              papers={papers}
              keyInsights={content?.key_insights || []}
              problemStatement={getProblemStatement()}
            />
          </div>
        ) : (
          <div className="lg:col-span-12">
            <WorkspaceMindmap
              projectTitle={project?.title || "Research Topic"}
              papers={papers}
              keyInsights={content?.key_insights || []}
            />
          </div>
        )}
      </div>
    </div>
  );
}
