import { Suspense } from "react";
import BlokHeader from "@/components/modules/research/BlokHeader";
import ResearchFlow from "@/components/modules/research/ResearchFlow";
import LoadingPage from "@/components/ui/loading-page";

export default function ResearchPage() {
  return (
    <div className="min-h-screen bg-[#f9fafb] dark:bg-[#1a1a1a] transition-colors duration-500">
      <BlokHeader />
      <Suspense fallback={<LoadingPage message="Loading research..." />}>
        <ResearchFlow />
      </Suspense>
    </div>
  );
}
