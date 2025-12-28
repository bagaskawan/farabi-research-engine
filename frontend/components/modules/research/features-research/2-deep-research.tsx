"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/use-user";
import { SendIcon } from "@/components/ui/icons";

// CSS for animations
const animationStyles = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

// Helper function to get formatted current time
const getCurrentTime = () => {
  const now = new Date();
  return now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

// Helper function to get today's date with time
const getTodayWithTime = () => {
  const now = new Date();
  const time = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `Today, ${time}`;
};

// Message type definition
interface Message {
  id: number;
  type: "user" | "ai";
  sender: string;
  content: string;
  timestamp: string;
}

// Research option from AI
interface ResearchOption {
  label: string;
  description: string;
}

// AI Response structure
interface AIResponse {
  next_action: "probe" | "propose" | "finalize";
  reply_message: string;
  options: ResearchOption[];
  final_keywords?: string; // Final keywords for Semantic Scholar search
}

// Paper from Semantic Scholar
interface Paper {
  paperId: string;
  title: string;
  abstract: string | null;
  authors: { name: string }[];
  year: number | null;
  citationCount: number | null;
  url: string | null;
}

// Key Insight extracted from papers
interface KeyInsight {
  insight: string;
  source: string;
  paperId: string;
}

// Narrative structure for video script
interface NarrativeStructure {
  hook: string;
  problem: string;
  science: string;
  takeaway: string;
}

// Reference for sources
interface Reference {
  title: string;
  authors: string;
  year: number | null;
  url: string | null;
}

// Final Content Blueprint
interface ContentBlueprint {
  key_insights: KeyInsight[];
  narrative: NarrativeStructure;
  references: Reference[];
}

// Research step for animation
interface ResearchStepItem {
  id: number;
  label: string;
  status: "pending" | "in-progress" | "completed";
  subItems?: string[];
}

// Research phase enum
type ResearchPhase = "chat" | "researching" | "complete";

interface ResearchStepProps {
  searchQuery: string;
  searchMode: "deep" | "broad";
  onBack: () => void;
}

// Backend API URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ResearchStep({
  searchQuery,
  searchMode,
  onBack,
}: ResearchStepProps) {
  const router = useRouter();
  const { user, username, avatarUrl } = useUser();
  const [isSaving, setIsSaving] = useState(false);

  // State
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      type: "user",
      sender: "You",
      content: searchQuery,
      timestamp: "",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [currentOptions, setCurrentOptions] = useState<ResearchOption[]>([]);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [finalKeywords, setFinalKeywords] = useState<string | null>(null);

  // Research pipeline state
  const [researchPhase, setResearchPhase] = useState<ResearchPhase>("chat");
  const [papers, setPapers] = useState<Paper[]>([]);
  const [researchSteps, setResearchSteps] = useState<ResearchStepItem[]>([
    { id: 1, label: "Searching papers...", status: "pending" },
    { id: 2, label: "Reading papers...", status: "pending" },
    { id: 3, label: "Analyzing insights...", status: "pending" },
    { id: 4, label: "Drafting content...", status: "pending" },
  ]);
  const [readingPaperTitle, setReadingPaperTitle] = useState<string>("");
  const [contentBlueprint, setContentBlueprint] =
    useState<ContentBlueprint | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasFetchedInitial = useRef(false); // Prevent double fetch in Strict Mode

  // Build conversation history for API
  const buildConversation = useCallback((msgs: Message[]) => {
    return msgs.map((msg) => ({
      role: msg.type === "user" ? "user" : "assistant",
      content: msg.content,
    }));
  }, []);

  // Function to call AI API
  const fetchAIResponse = useCallback(
    async (currentMessages: Message[]) => {
      setIsLoading(true);
      setCurrentOptions([]);

      try {
        const conversation = buildConversation(currentMessages);

        const response = await fetch(`${API_URL}/interview/continue`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversation }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || "Failed to get AI response");
        }

        const data: AIResponse = await response.json();

        // Add AI response to messages
        setMessages((prev) => [
          ...prev,
          {
            id: prev.length + 1,
            type: "ai",
            sender: "Farabi",
            content: data.reply_message,
            timestamp: getCurrentTime(),
          },
        ]);

        // If propose mode, show options with slight delay for better UX
        if (data.next_action === "propose" && data.options.length > 0) {
          setTimeout(() => {
            setCurrentOptions(data.options);
          }, 400);
        }

        // If finalize mode, store the final keywords
        if (data.next_action === "finalize" && data.final_keywords) {
          setFinalKeywords(data.final_keywords);
        }
      } catch (error) {
        console.error("Error fetching AI response:", error);
        setMessages((prev) => [
          ...prev,
          {
            id: prev.length + 1,
            type: "ai",
            sender: "Farabi",
            content:
              "Maaf, terjadi kesalahan. Silakan coba lagi atau periksa koneksi backend.",
            timestamp: getCurrentTime(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [buildConversation]
  );

  // Initialize on mount
  useEffect(() => {
    setIsClient(true);

    // Update initial message timestamp
    setMessages((prev) =>
      prev.map((msg, index) =>
        index === 0 && !msg.timestamp
          ? { ...msg, timestamp: getCurrentTime() }
          : msg
      )
    );

    // Fetch initial AI response (only once)
    if (
      !hasFetchedInitial.current &&
      messages.length === 1 &&
      messages[0].type === "user"
    ) {
      hasFetchedInitial.current = true;
      fetchAIResponse(messages);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, currentOptions, finalKeywords, isLoading]);

  // Handle send message
  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const newMessage: Message = {
      id: messages.length + 1,
      type: "user",
      sender: "You",
      content: inputValue,
      timestamp: getCurrentTime(),
    };

    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    setInputValue("");
    setShowCustomInput(false);

    await fetchAIResponse(updatedMessages);
  };

  // Handle option selection
  const handleOptionSelect = async (option: ResearchOption) => {
    const selectionMessage: Message = {
      id: messages.length + 1,
      type: "user",
      sender: "You",
      content: `Saya pilih: ${option.label}`,
      timestamp: getCurrentTime(),
    };

    const updatedMessages = [...messages, selectionMessage];
    setMessages(updatedMessages);
    setCurrentOptions([]);

    // TODO: Proceed to next step with selected option
    // For now, just send to AI
    await fetchAIResponse(updatedMessages);
  };

  // Handle custom input request - keep options visible
  const handleCustomInput = () => {
    setShowCustomInput(true);
    // Don't hide options - user might want to select them later
  };

  // Update a specific research step status
  const updateStepStatus = (
    stepId: number,
    status: "pending" | "in-progress" | "completed",
    subItems?: string[]
  ) => {
    setResearchSteps((prev) =>
      prev.map((step) =>
        step.id === stepId
          ? { ...step, status, subItems: subItems || step.subItems }
          : step
      )
    );
  };

  // Save Content Blueprint to Supabase and redirect to workspace
  const handleSaveToWorkspace = async () => {
    if (!contentBlueprint || !user) {
      console.error("No content blueprint or user not logged in");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`${API_URL}/projects/save-project`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          title: searchQuery,
          query_topic: finalKeywords || searchQuery,
          key_insights: contentBlueprint.key_insights,
          narrative: contentBlueprint.narrative,
          papers: papers.map((p) => ({
            paperId: p.paperId,
            title: p.title,
            abstract: p.abstract,
            authors: p.authors.map((a) => a.name),
            year: p.year,
            citationCount: p.citationCount,
            url: p.url,
            isOpenAccess: false,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to save project");
      }

      const data = await response.json();
      router.push(`/workspace/${data.project_id}`);
    } catch (error: any) {
      console.error("Error saving to workspace:", error.message || error);
      alert(`Gagal menyimpan: ${error.message || "Unknown error"}`);
      setIsSaving(false);
    }
  };

  // Handle "Lanjut Cari Paper" button - start full research pipeline
  const handleStartResearch = async () => {
    if (!finalKeywords) return;

    setResearchPhase("researching");

    try {
      // Step 1: SEARCHING - Call Semantic Scholar API
      updateStepStatus(1, "in-progress");

      const searchResponse = await fetch(`${API_URL}/semantic-scholar/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords: finalKeywords, limit: 15 }),
      });

      if (!searchResponse.ok) throw new Error("Failed to search papers");

      const searchData = await searchResponse.json();
      const fetchedPapers: Paper[] = searchData.papers;
      setPapers(fetchedPapers);
      updateStepStatus(1, "completed", [
        `Found ${fetchedPapers.length} papers`,
      ]);

      // Step 2: READING (Illusion) - Loop through paper titles
      updateStepStatus(2, "in-progress");

      for (const paper of fetchedPapers) {
        setReadingPaperTitle(paper.title);
        await new Promise((resolve) => setTimeout(resolve, 300)); // 300ms delay
      }
      setReadingPaperTitle("");
      updateStepStatus(2, "completed");

      // Step 3: ANALYZING - Send abstracts to AI
      updateStepStatus(3, "in-progress");

      const papersForAnalysis = fetchedPapers
        .filter((p) => p.abstract)
        .slice(0, 10)
        .map((p) => ({
          paperId: p.paperId,
          title: p.title,
          abstract: p.abstract || "",
          authors: p.authors.map((a) => a.name),
          year: p.year,
          url: p.url,
        }));

      const analyzeResponse = await fetch(`${API_URL}/research/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ papers: papersForAnalysis, topic: searchQuery }),
      });

      if (!analyzeResponse.ok) throw new Error("Failed to analyze papers");

      const analyzeData = await analyzeResponse.json();
      const insights: KeyInsight[] = analyzeData.insights;
      updateStepStatus(3, "completed", [
        `Extracted ${insights.length} insights`,
      ]);

      // Step 4: DRAFTING - Generate Content Blueprint
      updateStepStatus(4, "in-progress");

      const scriptResponse = await fetch(
        `${API_URL}/research/generate-script`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            insights,
            papers: papersForAnalysis,
            topic: searchQuery,
          }),
        }
      );

      if (!scriptResponse.ok) throw new Error("Failed to generate script");

      const blueprint: ContentBlueprint = await scriptResponse.json();
      setContentBlueprint(blueprint);
      updateStepStatus(4, "completed");

      // Complete!
      setResearchPhase("complete");
    } catch (error) {
      console.error("Research pipeline error:", error);
      // Reset to chat phase on error
      setResearchPhase("chat");
      setResearchSteps([
        { id: 1, label: "Searching papers...", status: "pending" },
        { id: 2, label: "Reading papers...", status: "pending" },
        { id: 3, label: "Analyzing insights...", status: "pending" },
        { id: 4, label: "Drafting content...", status: "pending" },
      ]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Inject animation styles */}
      <style>{animationStyles}</style>

      <div className="flex flex-col h-[calc(100vh-64px)]">
        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Date Separator */}
          <div className="flex justify-center mb-8">
            <span className="text-xs text-gray-400 uppercase tracking-wider">
              {isClient ? getTodayWithTime() : "Today"}
            </span>
          </div>

          {/* Messages */}
          <div className="max-w-2xl mx-auto space-y-6">
            {isClient &&
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.type === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.type === "ai" ? (
                    <div
                      className="flex gap-3 max-w-lg animate-fade-in-up"
                      style={{
                        animation: "fadeInUp 0.4s ease-out forwards",
                      }}
                    >
                      {/* AI Avatar */}
                      <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-bold">F</span>
                      </div>
                      <div>
                        <p className="text-xs text-green-600 mb-1 font-medium">
                          {message.sender}
                        </p>
                        <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
                          <p className="text-sm text-[#1a1a1a] leading-relaxed whitespace-pre-wrap">
                            {message.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3 max-w-lg items-end">
                      <div className="text-right">
                        <div className="bg-blue-500 text-white rounded-2xl rounded-br-sm px-4 py-2.5">
                          <p className="text-sm leading-relaxed text-left whitespace-pre-wrap">
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
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
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
                      </div>
                    </div>
                  )}
                </div>
              ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex gap-3 max-w-lg">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br bg-green-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">F</span>
                  </div>
                  <div>
                    <p className="text-xs text-green-600 mb-1 font-medium">
                      Farabi
                    </p>
                    <div className="bg-gray-50 rounded-2xl rounded-tl-sm px-4 py-3">
                      <div className="flex gap-1">
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        />
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        />
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Research Options (Propose Mode) */}
            {currentOptions.length > 0 && !isLoading && (
              <div className="flex justify-start">
                <div className="flex gap-3 max-w-lg w-full">
                  <div className="w-8 flex-shrink-0" />{" "}
                  {/* Spacer for alignment */}
                  <div className="flex-1 space-y-3">
                    <p className="text-xs text-gray-500 mb-2">
                      Pilih salah satu opsi atau tulis topik lain:
                    </p>
                    {currentOptions.map((option, index) => (
                      <button
                        key={index}
                        onClick={() => handleOptionSelect(option)}
                        className="w-full text-left p-4 rounded-xl border border-gray-200 hover:border-green-400 hover:bg-green-50 transition-all group"
                      >
                        <p className="font-medium text-gray-800 group-hover:text-green-700">
                          {option.label}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {option.description}
                        </p>
                      </button>
                    ))}
                    {/* Custom Input Button */}
                    <button
                      onClick={handleCustomInput}
                      className="w-full text-center p-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 hover:border-green-400 hover:text-green-600 transition-all"
                    >
                      ✨ Tulis Topik Lain...
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Final Keywords Display */}
            {finalKeywords && !isLoading && researchPhase === "chat" && (
              <div className="flex justify-start">
                <div className="flex gap-3 max-w-lg w-full">
                  <div className="w-8 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-4">
                      <p className="text-xs text-green-600 font-medium mb-2">
                        🔍 Academic Keywords untuk Semantic Scholar:
                      </p>
                      <p className="text-sm font-mono text-green-800 bg-white px-3 py-2 rounded-lg border border-green-100">
                        {finalKeywords}
                      </p>
                      <button
                        onClick={handleStartResearch}
                        className="mt-3 w-full bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
                      >
                        🚀 Lanjut Cari Paper
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Research Progress Panel - Show during researching and complete */}
            {(researchPhase === "researching" ||
              researchPhase === "complete") && (
              <div className="max-w-lg mx-auto my-6">
                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-4">
                    {researchPhase === "researching" ? (
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                    ) : (
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                    )}
                    <span className="text-sm font-medium text-green-600">
                      {researchPhase === "researching"
                        ? "Researching Deeply..."
                        : "✅ Research Complete"}
                    </span>
                  </div>

                  {/* Steps */}
                  <div className="space-y-3">
                    {researchSteps.map((step) => (
                      <div key={step.id} className="flex items-start gap-3">
                        {/* Status Icon */}
                        <div className="flex-shrink-0 mt-0.5">
                          {step.status === "completed" && (
                            <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                              <svg
                                className="w-3 h-3 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={3}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </div>
                          )}
                          {step.status === "in-progress" && (
                            <div className="w-5 h-5 flex items-center justify-center">
                              <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
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
                                ? "text-green-600 font-medium"
                                : "text-gray-400"
                            }`}
                          >
                            {step.label}
                          </p>
                          {step.subItems && (
                            <div className="flex flex-wrap gap-2 mt-1">
                              {step.subItems.map((item, idx) => (
                                <span
                                  key={idx}
                                  className="text-xs text-green-500 font-mono"
                                >
                                  {item}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Reading Paper Title Illusion */}
                  {readingPaperTitle && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">📖 Reading:</p>
                      <p className="text-sm text-gray-700 font-medium truncate">
                        {readingPaperTitle}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Content Blueprint Display - Final Output */}
            {researchPhase === "complete" && contentBlueprint && (
              <div className="max-w-2xl mx-auto my-6 space-y-6">
                {/* Header */}
                <div className="text-center">
                  <h2 className="text-xl font-bold text-gray-800">
                    📋 Content Blueprint
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Kerangka konten berbasis sitasi untuk video Anda
                  </p>
                </div>

                {/* Key Insights */}
                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    🧠 Key Insights & Facts
                  </h3>
                  <div className="space-y-3">
                    {contentBlueprint.key_insights.map((insight, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400"
                      >
                        <p className="text-sm text-gray-700">
                          {insight.insight}
                        </p>
                        <p className="text-xs text-blue-600 mt-1 font-medium">
                          📄 {insight.source}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Narrative Structure */}
                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    🎬 Narrative Structure
                  </h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-amber-50 rounded-lg">
                      <p className="text-xs font-bold text-amber-700 mb-1">
                        🎣 THE HOOK
                      </p>
                      <p className="text-sm text-gray-700">
                        {contentBlueprint.narrative.hook}
                      </p>
                    </div>
                    <div className="p-4 bg-red-50 rounded-lg">
                      <p className="text-xs font-bold text-red-700 mb-1">
                        ❓ THE PROBLEM
                      </p>
                      <p className="text-sm text-gray-700">
                        {contentBlueprint.narrative.problem}
                      </p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <p className="text-xs font-bold text-purple-700 mb-1">
                        🔬 THE SCIENCE
                      </p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {contentBlueprint.narrative.science}
                      </p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-xs font-bold text-green-700 mb-1">
                        💡 THE TAKEAWAY
                      </p>
                      <p className="text-sm text-gray-700">
                        {contentBlueprint.narrative.takeaway}
                      </p>
                    </div>
                  </div>
                </div>

                {/* References - Use papers state */}
                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    📚 Reference List ({papers.length} papers)
                  </h3>
                  <div className="space-y-2">
                    {papers.slice(0, 10).map((paper, idx) => (
                      <div
                        key={paper.paperId || idx}
                        className="p-2 text-sm border-b border-gray-100 last:border-0"
                      >
                        <p className="text-gray-700">
                          {paper.authors
                            .map((a) => a.name)
                            .slice(0, 3)
                            .join(", ")}
                          {paper.authors.length > 3 && " et al."} (
                          {paper.year || "n.d."}). <em>{paper.title}</em>
                        </p>
                        {paper.url && (
                          <a
                            href={paper.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:underline"
                          >
                            🔗 View Paper
                          </a>
                        )}
                      </div>
                    ))}
                    {papers.length === 0 && (
                      <p className="text-gray-400 text-sm">
                        No references available
                      </p>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-center gap-3">
                  {/* Save to Workspace - Primary */}
                  <button
                    onClick={handleSaveToWorkspace}
                    disabled={isSaving || !user}
                    className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 px-6 rounded-lg transition-colors flex items-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      <>💾 Simpan ke Workspace</>
                    )}
                  </button>

                  {/* Start New Research */}
                  <button
                    onClick={() => {
                      setResearchPhase("chat");
                      setContentBlueprint(null);
                      setResearchSteps([
                        {
                          id: 1,
                          label: "Searching papers...",
                          status: "pending",
                        },
                        {
                          id: 2,
                          label: "Reading papers...",
                          status: "pending",
                        },
                        {
                          id: 3,
                          label: "Analyzing insights...",
                          status: "pending",
                        },
                        {
                          id: 4,
                          label: "Drafting content...",
                          status: "pending",
                        },
                      ]);
                    }}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2.5 px-6 rounded-lg transition-colors"
                  >
                    🔄 Riset Baru
                  </button>
                </div>
              </div>
            )}

            {/* Scroll anchor for auto-scroll */}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Bottom Section - Input */}
        <div className="px-6 pb-6">
          <div className="max-w-2xl mx-auto">
            <div
              className={`flex items-end gap-3 bg-gray-50 border border-gray-200 rounded-3xl px-4 py-3 ${
                isLoading ? "opacity-60" : ""
              }`}
            >
              <textarea
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  // Auto-resize textarea
                  e.target.style.height = "auto";
                  e.target.style.height =
                    Math.min(e.target.scrollHeight, 200) + "px";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={isLoading}
                placeholder={
                  isLoading
                    ? "Menunggu respons..."
                    : showCustomInput
                    ? "Tulis topik yang kamu inginkan..."
                    : "Ketik pesanmu..."
                }
                rows={1}
                className="flex-1 bg-transparent text-sm text-[#1a1a1a] placeholder-gray-400 focus:outline-none disabled:cursor-not-allowed resize-none max-h-[200px] leading-relaxed py-1"
                style={{ minHeight: "24px" }}
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !inputValue.trim()}
                className="w-9 h-9 flex-shrink-0 flex items-center justify-center bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <SendIcon />
              </button>
            </div>

            {/* Disclaimer */}
            <p className="text-center text-xs text-gray-400 mt-3">
              Farabi can make mistakes. Please verify important information.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
