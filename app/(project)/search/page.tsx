"use client";

import Link from "next/link";
import { useState } from "react";

// Icon components
const SearchIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-gray-400"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

const BookIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
  </svg>
);

const GridIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="7" height="7" x="3" y="3" rx="1" />
    <rect width="7" height="7" x="14" y="3" rx="1" />
    <rect width="7" height="7" x="14" y="14" rx="1" />
    <rect width="7" height="7" x="3" y="14" rx="1" />
  </svg>
);

const DocumentIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-gray-500"
  >
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
  </svg>
);

const ChartIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-gray-500"
  >
    <path d="M3 3v16a2 2 0 0 0 2 2h16" />
    <path d="M7 16l4-8 4 4 6-6" />
  </svg>
);

const MenuIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="4" x2="20" y1="12" y2="12" />
    <line x1="4" x2="20" y1="6" y2="6" />
    <line x1="4" x2="20" y1="18" y2="18" />
  </svg>
);

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

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMode, setSelectedMode] = useState<"deep" | "broad">("deep");

  return (
    <div className="min-h-screen bg-[#f9fafb]">
      {/* Header */}
      <header className="flex items-center justify-center p-8 relative">
        <Link href="/">
          <span className="text-sm font-barlow font-light tracking-widest transition-colors duration-500">
            FARABI PROJECT
          </span>
        </Link>
        <div className="absolute right-6 w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center overflow-hidden">
          <span className="text-amber-800 text-sm font-medium">U</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-col items-center justify-center flex-1 min-h-[calc(100vh-72px)] px-6 pb-12">
        {/* Hero Section */}
        <div className="text-center mb-10">
          <h1
            className="text-7xl md:text-8xl font-bold tracking-tight text-gray-800 mb-3"
            style={{ fontFamily: "var(--font-title)" }}
          >
            Deep Research Engine
          </h1>
          <p className="text-gray-500 text-md">
            Distraction-free intelligence for creators
          </p>
        </div>

        {/* Search Section */}
        <div className="w-full max-w-3xl mb-6 mt-6">
          <div className="relative flex items-center bg-white rounded-full shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="pl-5">
              <SearchIcon />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="What is your YouTube content topic today?"
              className="flex-1 py-4 px-4 bg-transparent text-gray-900 placeholder-gray-400 focus:outline-none text-base"
            />
            <button className="m-1.5 px-6 py-3 bg-gray-800 text-white rounded-full font-medium hover:bg-gray-800 transition-colors">
              Search
            </button>
          </div>
        </div>

        {/* Mode Toggle Buttons */}
        <div className="flex gap-3 mb-16">
          <button
            onClick={() => setSelectedMode("deep")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-medium transition-all ${
              selectedMode === "deep"
                ? "bg-white border-gray-300 text-gray-900 shadow-sm"
                : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-white"
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
                : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-white"
            }`}
          >
            <GridIcon />
            Broad Overview
          </button>
        </div>

        {/* Recent Projects Section */}
        <div className="w-full max-w-md">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Recent Projects
          </h2>
          <div className="space-y-1">
            {recentProjects.map((project) => (
              <button
                key={project.id}
                className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-white hover:shadow-sm transition-all text-left group"
              >
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-gray-50">
                  {project.icon === "chart" ? <ChartIcon /> : <DocumentIcon />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {project.title}
                  </p>
                  <p className="text-xs text-gray-400">{project.editedAt}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
