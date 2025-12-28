"use client";

import { useState } from "react";
import Link from "next/link";
import { useTheme } from "@/context/ThemeContext";
import { useUser } from "@/hooks/use-user";
import { signout } from "@/lib/actions/auth-actions";
import { PlusIcon, SunIcon, MoonIcon } from "@/components/ui/icons";
import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";

// Sample project data
const projects = [
  {
    id: 1,
    title: "LitSearch",
    description:
      "Mencari dan memfilter literatur ilmiah yang relevan dan kredibel merupakan tantangan besar bagi peneliti dan pembelajar sepanjang hayat, terutama dengan jumla...",
    createdAt: "1 day ago",
  },
  {
    id: 2,
    title: "TimeShield",
    description:
      "Banyak orang mengalami kesulitan dalam mengelola waktu dan fokus karena distraksi, sehingga mengurangi produktivitas dan efisiensi. TimeShield...",
    createdAt: "11 days ago",
  },
  {
    id: 3,
    title: "AIClipMate",
    description:
      "Banyak YouTuber pemula hingga menengah kesulitan mengelola konten, menganalisis data performa, dan mengambil keputusan kreatif secara cep...",
    createdAt: "13 days ago",
  },
  {
    id: 4,
    title: "BoostBuddy",
    description:
      "Banyak pemula dan pekerja muda ingin meningkatkan kemampuan bahasa Inggris secara praktis, namun waktu belajar terbatas dan materi sering tidak...",
    createdAt: "13 days ago",
  },
  {
    id: 5,
    title: "MetricMentor Mini",
    description:
      "Banyak creator YouTube, terutama yang baru memulai, merasa kewalahan dengan data analytics yang kompleks dan tidak tahu tindakan spesifik apa yang harus...",
    createdAt: "13 days ago",
  },
  {
    id: 6,
    title: "TrendWizard Planner",
    description:
      "Banyak creator YouTube menghadapi tantangan besar dalam mengubah data analytics yang kompleks menjadi keputusan konten yang jelas dan dapat...",
    createdAt: "13 days ago",
  },
  {
    id: 7,
    title: "FlowState Creator",
    description:
      "Youtuber pemula seringkali merasa kewalahan dan bingung di tahap awal pembuatan konten, khususnya dari ideasi hingga pra-produksi. Mereka menghadap...",
    createdAt: "14 days ago",
  },
  {
    id: 8,
    title: "Frugal Apps",
    description:
      "Banyak individu kesulitan mengelola keuangan mereka secara efektif, bukan karena kurangnya kemauan, tetapi karena ketidaksadaran akan pola perilaku...",
    createdAt: "20 days ago",
  },
];

// Get current date
const getCurrentDate = () => {
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return new Date().toLocaleDateString("en-US", options);
};

export default function DashboardPage() {
  const { toggleTheme, isDark } = useTheme();
  const { username, avatarUrl, isLoading } = useUser();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleSignOut = async () => {
    await signout();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen transition-colors duration-500 bg-[#f9fafb] dark:bg-[#1a1a1a]">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6">
        <span className="text-xl font-light tracking-widest text-gray-600 dark:text-gray-400 transition-colors duration-500"></span>

        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-700 dark:text-gray-400 transition-colors duration-500">
            {getCurrentDate()}
          </span>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full transition-all duration-500 bg-gray-100 hover:bg-gray-200 text-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-yellow-400"
          >
            {isDark ? <MoonIcon /> : <SunIcon />}
          </button>
          {/* Avatar with Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center overflow-hidden focus:outline-none focus:ring-2 focus:ring-amber-300"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-amber-800 text-sm font-medium uppercase">
                  {username?.charAt(0) || "U"}
                </span>
              )}
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsDropdownOpen(false)}
                />
                {/* Menu */}
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 z-50 py-3">
                  {/* Profile Section */}
                  <div className="flex flex-col items-center px-4 pb-3 border-b border-gray-100 dark:border-gray-700">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center overflow-hidden">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt="Avatar"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-amber-800 text-xl font-medium uppercase">
                            {username?.charAt(0) || "U"}
                          </span>
                        )}
                      </div>
                      {/* Online Indicator */}
                      <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
                    </div>
                    <span className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                      {username || "User"}
                    </span>
                  </div>

                  {/* Menu Items */}
                  <div className="py-2">
                    <button className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      Settings
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-8 py-8">
        {/* Greeting */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold mb-2 transition-colors duration-500 text-[#1a1a1a] dark:text-white">
            Hi, {isLoading ? "..." : username || "there"}!
          </h1>
          <p className="transition-colors duration-500 text-gray-500 dark:text-gray-400">
            Let's turn your brilliant ideas into real projects today.
          </p>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Create New Project Card */}
          <Link href="/research" className="h-full">
            <Card
              className="bg-card rounded-lg border-2 border-dashed border-border hover:border-solid hover:border-primary 
                   hover:shadow-lg transition-all duration-300 cursor-pointer 
                   flex flex-col items-center justify-center h-full group"
            >
              <div className="p-6 text-center">
                <Plus
                  className="w-12 h-12 text-muted-foreground group-hover:text-primary transition-colors duration-300 mx-auto"
                  strokeWidth={1.5}
                />
                <h3 className="mt-4 text-lg font-semibold text-foreground">
                  Create New Project
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Click here to add a new project.
                </p>
              </div>
            </Card>
          </Link>

          {/* Project Cards */}
          {projects.map((project) => (
            <div
              key={project.id}
              className="rounded-xl p-6 cursor-pointer min-h-[200px] flex flex-col transition-all duration-500 bg-white border border-gray-100 hover:border-gray-200 hover:shadow-md dark:bg-[#1a1a1a] dark:border-gray-800 dark:hover:border-gray-600 dark:hover:shadow-lg dark:hover:shadow-gray-900/20"
            >
              <h3 className="text-lg font-bold mb-2 transition-colors duration-500 text-[#1a1a1a] dark:text-white">
                {project.title}
              </h3>
              <p className="text-sm leading-relaxed flex-1 mb-4 transition-colors duration-500 text-gray-500 dark:text-gray-400">
                {project.description}
              </p>
              <p className="text-sm">
                <span className="transition-colors duration-500 text-gray-400 dark:text-gray-500">
                  Created{" "}
                </span>
                <span className="text-amber-500">{project.createdAt}</span>
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
