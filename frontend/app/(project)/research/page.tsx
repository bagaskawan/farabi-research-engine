import BlokHeader from "@/components/modules/research/BlokHeader";
import ResearchFlow from "@/components/modules/research/ResearchFlow";

export default function ResearchPage() {
  return (
    <div className="min-h-screen bg-[#f9fafb] dark:bg-[#1a1a1a] transition-colors duration-500">
      <BlokHeader />
      <ResearchFlow />
    </div>
  );
}
