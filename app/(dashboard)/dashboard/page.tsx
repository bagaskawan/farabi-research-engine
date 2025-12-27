"use client";

import Link from "next/link";
import { useTheme } from "@/context/ThemeContext";

// Icons
const PlusIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-gray-400 dark:text-gray-500"
  >
    <path d="M5 12h14" />
    <path d="M12 5v14" />
  </svg>
);

const SunIcon = () => (
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
  >
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="m4.93 4.93 1.41 1.41" />
    <path d="m17.66 17.66 1.41 1.41" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="m6.34 17.66-1.41 1.41" />
    <path d="m19.07 4.93-1.41 1.41" />
  </svg>
);

const MoonIcon = () => (
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
  >
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </svg>
);

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

  return (
    <div className="min-h-screen transition-colors duration-500 bg-[#f9fafb] dark:bg-[#0f0f0f]">
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
          <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center overflow-hidden">
            <span className="text-amber-800 text-sm font-medium">U</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-8 py-8">
        {/* Greeting */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold mb-2 transition-colors duration-500 text-[#1a1a1a] dark:text-white">
            Hi, bagas kawan!
          </h1>
          <p className="transition-colors duration-500 text-gray-500 dark:text-gray-400">
            Let's turn your brilliant ideas into real projects today.
          </p>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Create New Project Card */}
          <Link href="/search">
            <div className="border border-dashed rounded-xl p-6 flex flex-col items-center justify-center min-h-[200px] cursor-pointer group transition-all duration-500 bg-white border-gray-100 hover:border-gray-300 hover:shadow-sm dark:bg-[#1a1a1a] dark:border-gray-700 dark:hover:border-gray-500 dark:hover:shadow-lg dark:hover:shadow-gray-900/20">
              <div className="w-12 h-12 rounded-full border flex items-center justify-center mb-4 transition-colors duration-500 border-gray-200 group-hover:border-gray-400 dark:border-gray-600 dark:group-hover:border-gray-400">
                <PlusIcon />
              </div>
              <h3 className="text-base font-semibold mb-1 transition-colors duration-500 text-[#1a1a1a] dark:text-white">
                Create New Project
              </h3>
              <p className="text-sm text-center transition-colors duration-500 text-gray-400 dark:text-gray-500">
                Click here to add a new project.
              </p>
            </div>
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
