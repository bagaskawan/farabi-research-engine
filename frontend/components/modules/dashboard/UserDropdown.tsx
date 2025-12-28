"use client";

import { useState } from "react";

interface UserDropdownProps {
  username?: string | null;
  avatarUrl?: string | null;
  onSignOut: () => void;
}

export default function UserDropdown({
  username,
  avatarUrl,
  onSignOut,
}: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
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
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
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
                onClick={onSignOut}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
