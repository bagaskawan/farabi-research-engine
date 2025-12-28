"use client";

interface LoadingPageProps {
  message?: string;
}

export default function LoadingPage({
  message = "Loading...",
}: LoadingPageProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center">
      {/* Message */}
      <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
        {message} ...
      </h2>
    </div>
  );
}
