import Link from "next/link";

export default function EmptyProjectsState() {
  return (
    <div className="flex flex-col justify-center items-center min-h-[700px] text-center">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        Your workspace is empty
      </h2>

      <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-6">
        It looks like you haven't added any ideas yet.
        <br />
        Start building your collection of research and insights today.
      </p>

      <Link
        href="/research"
        className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 dark:bg-gray-800 text-white rounded-full font-medium hover:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
        Create an project
      </Link>
    </div>
  );
}
