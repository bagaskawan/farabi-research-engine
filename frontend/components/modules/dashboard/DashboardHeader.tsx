"use client";

import { SunIcon, MoonIcon } from "@/components/ui/icons";
import { useTheme } from "@/context/ThemeContext";
import { getCurrentDate } from "./utils";
import UserDropdown from "@/components/modules/dashboard/UserDropdown";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardHeaderProps {
  username?: string | null;
  avatarUrl?: string | null;
  onSignOut: () => void;
  isLoading?: boolean;
}

export default function DashboardHeader({
  username,
  avatarUrl,
  onSignOut,
  isLoading,
}: DashboardHeaderProps) {
  const { toggleTheme, isDark } = useTheme();

  return (
    <header className="flex items-center justify-between px-8 py-6">
      <span className="text-xl font-light tracking-widest text-gray-600 dark:text-gray-400 transition-colors duration-500"></span>

      <div className="flex items-center gap-4">
        {isLoading ? (
          <Skeleton className="h-5 w-32" />
        ) : (
          <span className="text-sm text-gray-700 dark:text-gray-400 transition-colors duration-500">
            {getCurrentDate()}
          </span>
        )}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full transition-all duration-500 bg-gray-100 hover:bg-gray-200 text-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-yellow-400"
        >
          {isDark ? <MoonIcon /> : <SunIcon />}
        </button>
        {isLoading ? (
          <Skeleton className="h-10 w-10 rounded-full" />
        ) : (
          <UserDropdown
            username={username}
            avatarUrl={avatarUrl}
            onSignOut={onSignOut}
          />
        )}
      </div>
    </header>
  );
}
