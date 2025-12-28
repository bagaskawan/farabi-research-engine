"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import SearchStep from "./features-research/1-search";
import DeepResearchStep from "./features-research/2-deep-research";

type FlowStep = "search" | "research" | "workspace";

interface ResearchState {
  query: string;
  mode: "deep" | "broad";
}

const STORAGE_KEY = "research_state";

// Helper to get initial state from sessionStorage
const getStoredState = (): ResearchState => {
  if (typeof window === "undefined") return { query: "", mode: "deep" };
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { query: "", mode: "deep" };
};

export default function ResearchFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read initial step from URL only
  const stepFromUrl = searchParams.get("step") as FlowStep | null;
  const [currentStep, setCurrentStep] = useState<FlowStep>(
    stepFromUrl || "search"
  );

  // Store query and mode in state (backed by sessionStorage)
  const [researchState, setResearchState] =
    useState<ResearchState>(getStoredState);

  // Sync step to URL (only step, not query/mode)
  useEffect(() => {
    const newUrl =
      currentStep !== "search" ? `/research?step=${currentStep}` : "/research";
    router.replace(newUrl, { scroll: false });
  }, [currentStep, router]);

  // Persist research state to sessionStorage
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(researchState));
  }, [researchState]);

  const handleStartResearch = (query: string, mode: "deep" | "broad") => {
    setResearchState({ query, mode });
    setCurrentStep("research");
  };

  const handleBackToSearch = () => {
    setCurrentStep("search");
    setResearchState({ query: "", mode: "deep" });
  };

  // Render based on current step
  switch (currentStep) {
    case "search":
      return <SearchStep onStartResearch={handleStartResearch} />;
    case "research":
      return (
        <DeepResearchStep
          searchQuery={researchState.query}
          searchMode={researchState.mode}
          onBack={handleBackToSearch}
        />
      );
    default:
      return <SearchStep onStartResearch={handleStartResearch} />;
  }
}
