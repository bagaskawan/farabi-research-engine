"use client";
import { useState } from "react";
import { FileText } from "lucide-react";
import { SearchIcon, BookIcon, GridIcon } from "@/components/ui/icons";

// Sample data for recent projects
const recentProjects = [
  {
    id: 1,
    title: "AI Ethics in 2024 Video Script",
    editedAt: "Edited 2 hours ago",
    icon: "document",
  },
  {
    id: 2,
    title: "Competitor Analysis: Tech Reviewers",
    editedAt: "Edited yesterday",
    icon: "chart",
  },
  {
    id: 3,
    title: "Sponsorship Outreach List",
    editedAt: "Edited 3 days ago",
    icon: "document",
  },
];

interface SearchStepProps {
  onStartResearch: (query: string, mode: "deep" | "broad") => void;
}

export default function SearchStep({ onStartResearch }: SearchStepProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMode, setSelectedMode] = useState<"deep" | "broad">("deep");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onStartResearch(searchQuery, selectedMode);
    }
  };

  return (
    <>
      {/* Main Content */}
      <main className="flex flex-col items-center justify-center flex-1 min-h-[calc(100vh-72px)] px-6 pb-12">
        {/* Hero Section */}
        <div className="text-center mb-10">
          <h1
            className="text-7xl md:text-8xl font-bold tracking-tight text-gray-600 dark:text-gray-200 transition-colors duration-500"
            style={{ fontFamily: "var(--font-title)" }}
          >
            Deep Research Engine
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-md transition-colors duration-500">
            Distraction-free intelligence for creators
          </p>
        </div>

        {/* Search Section */}
        <div className="w-full max-w-3xl mb-6 mt-6">
          <form
            onSubmit={handleSearch}
            className="relative flex items-center bg-white rounded-full shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="pl-5">
              <SearchIcon />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="What is your YouTube content topic today?"
              className="flex-1 py-4 px-4 bg-transparent text-gray-900 placeholder-gray-400 focus:outline-none text-base"
              autoFocus
            />
            <button
              type="submit"
              className="m-1.5 px-6 py-3 bg-gray-700 text-white rounded-full font-medium transition-colors hover:bg-gray-800"
            >
              Search
            </button>
          </form>
        </div>

        {/* Mode Toggle Buttons */}
        <div className="flex gap-3 mb-16">
          <button
            onClick={() => setSelectedMode("deep")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-medium transition-all ${
              selectedMode === "deep"
                ? "bg-white border-gray-300 text-gray-900 shadow-sm"
                : "border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400"
            }`}
          >
            <BookIcon />
            Deep Dive (Journal)
          </button>
          <button
            onClick={() => setSelectedMode("broad")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-medium transition-all ${
              selectedMode === "broad"
                ? "bg-white border-gray-300 text-gray-900 shadow-sm"
                : "border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400"
            }`}
          >
            <GridIcon />
            Broad Overview
          </button>
        </div>
      </main>
    </>
  );
}
