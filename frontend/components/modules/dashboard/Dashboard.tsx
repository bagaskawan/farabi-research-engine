"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/hooks/use-user";
import { signout } from "@/lib/actions/auth-actions";
import { createClient } from "@/lib/supabase/client";
import type { Project } from "@/lib/types/database";

import DashboardHeader from "./DashboardHeader";
import ProjectsGrid from "./ProjectsGrid";
import LoadingPage from "@/components/ui/loading-page";

export default function Dashboard() {
  const { username, avatarUrl, isLoading } = useUser();
  const [projects, setProjects] = useState<
    (Project & { workbench_content: { canvas_content: any | null }[] })[]
  >([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  // Fetch projects from Supabase
  useEffect(() => {
    async function fetchProjects() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("projects")
        .select(
          `
          *,
          workbench_content ( canvas_content )
        `
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching projects:", error);
      } else {
        setProjects(data || []);
      }
      setIsLoadingProjects(false);
    }

    fetchProjects();
  }, []);

  const handleSignOut = async () => {
    await signout();
    window.location.href = "/login";
  };

  if (isLoading) {
    return <LoadingPage message="Preparing your dashboard" />;
  }

  return (
    <div className="flex h-screen bg-background">
      <div className="flex-1 flex flex-col h-screen bg-[#f9fafb] dark:bg-[#1a1a1a]">
        <DashboardHeader
          username={username}
          avatarUrl={avatarUrl}
          onSignOut={handleSignOut}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto mx-4 px-12 py-10 space-y-8">
          {/* Greeting */}
          <div className="w-full py-10 flex justify-between items-center mb-10">
            <div className="flex flex-col">
              <h1 className="text-6xl font-bold tracking-tight text-[#1a1a1a] dark:text-white">
                Hi, {isLoading ? "..." : username || "there"}!
              </h1>
              <p className="text-md mt-4 text-gray-500 dark:text-gray-400">
                Let's turn your brilliant ideas into real projects today.
              </p>
            </div>
          </div>

          <ProjectsGrid projects={projects} isLoading={isLoadingProjects} />
        </main>
      </div>
    </div>
  );
}
