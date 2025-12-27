"use client";

import { useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";

// Icon components
const AudioWaveIcon = () => (
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
    className="text-blue-500"
  >
    <path d="M2 10v3" />
    <path d="M6 6v11" />
    <path d="M10 3v18" />
    <path d="M14 8v7" />
    <path d="M18 5v13" />
    <path d="M22 10v3" />
  </svg>
);

const PlusIcon = () => (
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
    className="text-blue-500"
  >
    <path d="M5 12h14" />
    <path d="M12 5v14" />
  </svg>
);

const SendIcon = () => (
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
    <path d="m5 12 7-7 7 7" />
    <path d="M12 19V5" />
  </svg>
);

const BriefcaseIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    <rect width="20" height="14" x="2" y="6" rx="2" />
  </svg>
);

const UsersIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const BookOpenIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 7v14" />
    <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
  </svg>
);

// Sample chat messages
const initialMessages = [
  {
    id: 1,
    type: "ai" as const,
    sender: "The Interviewer",
    content:
      "Good morning. I'm ready to begin our session. What topic would you like to explore today?",
    timestamp: "10:23 AM",
  },
  {
    id: 2,
    type: "user" as const,
    sender: "You",
    content: "Let's discuss Mental Health.",
    timestamp: "Just now",
  },
  {
    id: 3,
    type: "ai" as const,
    sender: "The Interviewer",
    content:
      "That is a broad and significant subject. To narrow our focus effectively, I can approach 'Mental Health' from a clinical or sociological perspective. Which one prefers?",
    timestamp: "",
  },
];

// Suggestion chips data
const suggestions = [
  { id: 1, label: "Clinical Perspective", icon: BriefcaseIcon },
  { id: 2, label: "Sociological View", icon: UsersIcon },
  { id: 3, label: "Historical Context", icon: BookOpenIcon },
];

// Research progress steps
const researchSteps = [
  { id: 1, label: "Searching Literature", status: "completed" as const },
  {
    id: 2,
    label: "Filtering 15 High-Quality Papers",
    status: "completed" as const,
  },
  {
    id: 3,
    label: "Reading & Analyzing",
    status: "in-progress" as const,
    subItems: [
      '"J. Clinical Psychology, Vol 4..."',
      '"Social Determinants..."',
    ],
  },
  { id: 4, label: "Drafting Content", status: "pending" as const },
];

// Checkmark Icon
const CheckIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-white"
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

// Spinner Icon
const SpinnerIcon = () => (
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
    className="text-teal-500 animate-spin"
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

// Researching Deeply Component
const ResearchingDeeply = () => (
  <div className="max-w-lg mx-auto my-6">
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
        <span className="text-sm font-medium text-teal-600">
          Researching Deeply...
        </span>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {researchSteps.map((step) => (
          <div key={step.id} className="flex items-start gap-3">
            {/* Status Icon */}
            <div className="flex-shrink-0 mt-0.5">
              {step.status === "completed" && (
                <div className="w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center">
                  <CheckIcon />
                </div>
              )}
              {step.status === "in-progress" && (
                <div className="w-5 h-5 flex items-center justify-center">
                  <SpinnerIcon />
                </div>
              )}
              {step.status === "pending" && (
                <div className="w-5 h-5 rounded-full bg-gray-200" />
              )}
            </div>

            {/* Label */}
            <div className="flex-1">
              <p
                className={`text-sm ${
                  step.status === "completed"
                    ? "text-gray-700"
                    : step.status === "in-progress"
                    ? "text-teal-600 font-medium"
                    : "text-gray-400"
                }`}
              >
                {step.label}
              </p>
              {step.subItems && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {step.subItems.map((item, idx) => (
                    <span key={idx} className="text-xs text-teal-500 font-mono">
                      {item}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default function ResearchPage() {
  const [messages, setMessages] = useState(initialMessages);
  const [inputValue, setInputValue] = useState("");

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const newMessage = {
      id: messages.length + 1,
      type: "user" as const,
      sender: "You",
      content: inputValue,
      timestamp: "Just now",
    };

    setMessages([...messages, newMessage]);
    setInputValue("");
  };

  const handleSuggestionClick = (label: string) => {
    setInputValue(label);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-[#0f0f0f] transition-colors duration-500">
      {/* Theme Toggle */}
      <ThemeToggle />
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <AudioWaveIcon />
          <span className="text-base font-medium text-[#1a1a1a]">
            The Interview Room
          </span>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {/* Date Separator */}
        <div className="flex justify-center mb-8">
          <span className="text-xs text-gray-400 uppercase tracking-wider">
            Today, 10:23 AM
          </span>
        </div>

        {/* Messages */}
        <div className="max-w-2xl mx-auto space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.type === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.type === "ai" ? (
                <div className="flex gap-3 max-w-lg">
                  {/* AI Avatar */}
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-amber-700 text-sm">🤖</span>
                  </div>
                  <div>
                    <p className="text-xs text-blue-500 mb-1">
                      {message.sender}
                    </p>
                    <div className="bg-gray-50 rounded-2xl rounded-tl-sm px-4 py-3">
                      <p className="text-sm text-[#1a1a1a] leading-relaxed">
                        {message.content}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3 max-w-lg items-end">
                  <div className="text-right">
                    <div className="bg-blue-400 text-white rounded-2xl rounded-br-sm px-4 py-3">
                      <p className="text-sm leading-relaxed">
                        {message.content}
                      </p>
                    </div>
                    {message.timestamp && (
                      <p className="text-xs text-gray-400 mt-1">
                        {message.timestamp}
                      </p>
                    )}
                  </div>
                  {/* User Avatar */}
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-amber-800 text-sm font-medium">
                      U
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Research Progress */}
          <ResearchingDeeply />
        </div>
      </div>

      {/* Bottom Section */}
      <div className="px-6 pb-6">
        {/* Suggestion Chips */}
        <div className="flex justify-center gap-3 mb-4">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              onClick={() => handleSuggestionClick(suggestion.label)}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all"
            >
              <suggestion.icon />
              {suggestion.label}
            </button>
          ))}
        </div>

        {/* Input Field */}
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 bg-gray-50 rounded-full px-5 py-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your answer..."
              className="flex-1 bg-transparent text-sm text-[#1a1a1a] placeholder-gray-400 focus:outline-none"
            />
            <button
              onClick={handleSend}
              className="w-9 h-9 flex items-center justify-center bg-blue-400 text-white rounded-full hover:bg-blue-600 transition-colors"
            >
              <SendIcon />
            </button>
          </div>

          {/* Disclaimer */}
          <p className="text-center text-xs text-blue-400 mt-3">
            The Interview Room can make mistakes. Verify important information.
          </p>
        </div>
      </div>
    </div>
  );
}
