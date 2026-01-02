"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/use-user";
import { SendIcon } from "@/components/ui/icons";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api } from "@/lib/api-client";

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

// Format AI message content to properly display numbered lists
const formatMessageContent = (content: string) => {
  // Check if content contains numbered patterns like "1)", "2)", or "1.", "2."
  const numberedPattern = /(\d+\)|\d+\.)\s+/g;

  if (!numberedPattern.test(content)) {
    // No numbered list, return as-is
    return <span>{content}</span>;
  }

  // Split by numbered patterns while keeping the delimiters
  // Pattern: split before "1)" or "1." patterns
  const parts = content.split(/(?=\d+\)|\d+\.)/g);

  // Find the intro text (before the first number)
  const introMatch = content.match(/^(.+?)(?=\d+\)|\d+\.)/);
  const introText = introMatch ? introMatch[1].trim() : "";

  // Get the numbered items
  const numberedItems = parts
    .filter((part) => /^\d+[\)\.]\s/.test(part.trim()))
    .map((part) => part.trim());

  if (numberedItems.length === 0) {
    return <span>{content}</span>;
  }

  return (
    <div className="space-y-2">
      {introText && <p>{introText}</p>}
      <div className="space-y-2 mt-2">
        {numberedItems.map((item, index) => {
          // Extract number and text (without 's' flag for compatibility)
          const match = item.match(/^(\d+)[\)\.]\s*([\s\S]+)$/);
          if (!match) return null;
          const [, num, text] = match;

          return (
            <div key={index} className="flex gap-2">
              <span className="font-semibold text-green-600 flex-shrink-0">
                {num}.
              </span>
              <span>{text.trim()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

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

// Narrative structure for video script (Deep-Dive Mode)
interface NarrativeStructure {
  hook: string;
  introduction: string;
  deep_dive: string;
  conclusion: string;
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
  elapsedTime?: number; // Time in milliseconds
}

// Research phase enum
type ResearchPhase = "chat" | "researching" | "complete";

interface ResearchStepProps {
  searchQuery: string;
  searchMode: "deep" | "broad";
  onBack: () => void;
}

// API client is now imported from @/lib/api-client

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
    { id: 1, label: "Decomposing topic...", status: "pending" },
    { id: 2, label: "Searching papers...", status: "pending" },
    { id: 3, label: "Fetching full content...", status: "pending" },
    { id: 4, label: "Analyzing insights...", status: "pending" },
    { id: 5, label: "Writing research report...", status: "pending" },
    { id: 6, label: "Crafting final script...", status: "pending" },
  ]);
  const [readingPaperTitle, setReadingPaperTitle] = useState<string>("");
  const [contentBlueprint, setContentBlueprint] =
    useState<ContentBlueprint | null>(null);

  // Deep Research specific state
  const [subQueries, setSubQueries] = useState<string[]>([]);
  const [researchReport, setResearchReport] = useState<string>("");
  const [enableDeepDive, setEnableDeepDive] = useState<boolean>(true); // Default: Deep Dive mode
  const [showResearchReport, setShowResearchReport] = useState<boolean>(false); // Collapsible
  const [currentReadingPaper, setCurrentReadingPaper] = useState<string>(""); // Paper being read
  const [totalElapsedTime, setTotalElapsedTime] = useState<number>(0); // Real-time timer

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasFetchedInitial = useRef(false); // Prevent double fetch in Strict Mode
  const timerRef = useRef<NodeJS.Timeout | null>(null); // Timer interval ref
  const researchStartTime = useRef<number>(0); // Research start timestamp

  // Helper: Render text with clickable citations
  // Citations like [Author, 2023] become interactive tooltips
  const renderTextWithCitations = (text: string) => {
    // Match citations like [Author, 2023] or [Smith et al., 2022]
    const citationPattern = /\[([^\]]+(?:,\s*\d{4})?)\]/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = citationPattern.exec(text)) !== null) {
      // Add text before citation
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {text.slice(lastIndex, match.index)}
          </span>
        );
      }

      // Find matching paper for tooltip
      const citationText = match[1];
      const matchingPaper = papers.find(
        (p) =>
          citationText
            .toLowerCase()
            .includes(p.authors[0]?.name?.toLowerCase()?.split(" ")[0] || "") ||
          p.title
            .toLowerCase()
            .includes(citationText.toLowerCase().split(",")[0])
      );

      // Add citation as clickable badge
      parts.push(
        <span
          key={`cite-${match.index}`}
          className="inline-flex items-center px-1.5 py-0.5 mx-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded cursor-help group relative"
          title={matchingPaper ? matchingPaper.title : citationText}
        >
          [{citationText}]
          {matchingPaper && (
            <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 w-64 text-center shadow-lg">
              📄 {matchingPaper.title}
              {matchingPaper.year && (
                <span className="block text-gray-400 mt-1">
                  ({matchingPaper.year})
                </span>
              )}
            </span>
          )}
        </span>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(<span key={`text-end`}>{text.slice(lastIndex)}</span>);
    }

    return parts.length > 0 ? parts : text;
  };

  // Helper component to render markdown with citations
  const MarkdownRenderer = ({ content }: { content: string }) => {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-lg font-bold text-gray-900 mb-2 mt-4">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-bold text-gray-800 mb-2 mt-3">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-bold text-gray-800 mb-1 mt-2">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <div className="text-sm text-gray-700 leading-relaxed mb-3 last:mb-0">
              {React.Children.map(children, (child) => {
                if (typeof child === "string") {
                  return renderTextWithCitations(child);
                }
                return child;
              })}
            </div>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-sm text-gray-700 pl-1">
              {React.Children.map(children, (child) => {
                if (typeof child === "string") {
                  return renderTextWithCitations(child);
                }
                return child;
              })}
            </li>
          ),
          strong: ({ children }) => (
            <span className="font-semibold text-gray-900">{children}</span>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-gray-200 pl-4 py-1 my-3 bg-gray-50 italic text-gray-600">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    );
  };

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

        const data: AIResponse = await api.continueInterview(
          searchQuery,
          conversation
        );

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
  }, [
    messages,
    currentOptions,
    finalKeywords,
    isLoading,
    researchPhase,
    researchSteps,
  ]);

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
      const data = await api.saveProject({
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
      });

      router.push(`/workspace/${data.project_id}`);
    } catch (error: any) {
      console.error("Error saving to workspace:", error.message || error);
      alert(`Gagal menyimpan: ${error.message || "Unknown error"}`);
      setIsSaving(false);
    }
  };

  // Helper to update step with elapsed time
  const completeStep = (
    stepId: number,
    startTime: number,
    subItems?: string[]
  ) => {
    const elapsed = Date.now() - startTime;
    setResearchSteps((prev) =>
      prev.map((step) =>
        step.id === stepId
          ? { ...step, status: "completed", elapsedTime: elapsed, subItems }
          : step
      )
    );
  };

  // Handle "Lanjut Cari Paper" button - start full research pipeline with REAL-TIME progress
  const handleStartResearch = async () => {
    if (!finalKeywords) return;

    setResearchPhase("researching");

    // Start real-time timer
    researchStartTime.current = Date.now();
    setTotalElapsedTime(0);
    timerRef.current = setInterval(() => {
      setTotalElapsedTime(Date.now() - researchStartTime.current);
    }, 100); // Update every 100ms for smooth display

    // Reset all steps
    setResearchSteps([
      { id: 1, label: "Decomposing topic...", status: "pending" },
      { id: 2, label: "Searching papers...", status: "pending" },
      { id: 3, label: "Fetching full content...", status: "pending" },
      { id: 4, label: "Analyzing insights...", status: "pending" },
      { id: 5, label: "Writing research report...", status: "pending" },
      { id: 6, label: "Crafting final script...", status: "pending" },
    ]);

    try {
      // ============================================
      // STAGE 1: DECOMPOSE TOPIC
      // ============================================
      let startTime = Date.now();
      updateStepStatus(1, "in-progress");

      const decomposeData = await api.decomposeTopic(
        searchQuery,
        finalKeywords
      );
      const queries: string[] = decomposeData.sub_queries || [finalKeywords];

      setSubQueries(queries);
      completeStep(1, startTime, queries);

      // ============================================
      // STAGE 2: MULTI-SEARCH (Parallel)
      // ============================================
      startTime = Date.now();
      updateStepStatus(2, "in-progress");

      const searchData = await api.multiSearch(queries, 8);

      // Convert papers to expected format
      const fetchedPapers: Paper[] = searchData.papers.map((p: any) => ({
        paperId: p.paperId,
        title: p.title,
        abstract: p.abstract,
        authors: (p.authors || []).map((name: string) => ({ name })),
        year: p.year,
        citationCount: p.citationCount,
        url: p.url,
      }));
      setPapers(fetchedPapers);

      completeStep(2, startTime, [`${searchData.total_papers} papers found`]);

      // ============================================
      // STAGE 3: FETCH FULL CONTENT (if Deep Dive)
      // ============================================
      startTime = Date.now();
      let papersWithContent: any[] = [];
      let fullTextCount = 0;

      if (enableDeepDive) {
        updateStepStatus(3, "in-progress");

        try {
          // Start the fetch API call (runs in background)
          const fetchPromise = api.fetchContent(searchData.papers, 8);

          // Show paper titles being "read" as ticker animation
          const papersToRead = searchData.papers.slice(0, 8);
          for (let i = 0; i < papersToRead.length; i++) {
            setCurrentReadingPaper(papersToRead[i].title);
            // Dynamic delay: longer for first papers (simulates reading)
            await new Promise((resolve) =>
              setTimeout(resolve, 800 + Math.random() * 400)
            );
          }
          setCurrentReadingPaper(""); // Clear ticker

          // Wait for API to complete
          const fetchData = await fetchPromise;

          papersWithContent = fetchData.papers_with_content;
          fullTextCount = fetchData.full_text_count;

          completeStep(3, startTime, [
            `${fullTextCount} with full text`,
            `${fetchData.abstract_only_count} abstract only`,
          ]);
        } catch (fetchError) {
          // Graceful fallback: use abstracts if full-text fetch fails
          console.warn(
            "Full-text fetch failed, falling back to abstracts:",
            fetchError
          );

          papersWithContent = searchData.papers.map((p: any) => ({
            ...p,
            content_type: "abstract",
            content: p.abstract || "",
            word_count: (p.abstract || "").split(" ").length,
          }));

          setCurrentReadingPaper(""); // Clear ticker
          completeStep(3, startTime, ["⚠️ Fallback: abstracts only"]);
        }
      } else {
        // Skip fetching, use abstracts
        papersWithContent = searchData.papers.map((p: any) => ({
          ...p,
          content_type: "abstract",
          content: p.abstract || "",
          word_count: (p.abstract || "").split(" ").length,
        }));

        setResearchSteps((prev) =>
          prev.map((step) =>
            step.id === 3
              ? {
                  ...step,
                  status: "completed",
                  subItems: ["Skipped (Mode Cepat)"],
                  elapsedTime: 0,
                }
              : step
          )
        );
      }

      // ============================================
      // STAGE 4: ANALYZE INSIGHTS
      // ============================================
      startTime = Date.now();
      updateStepStatus(4, "in-progress");

      const papersForAnalysis = searchData.papers
        .filter((p: any) => p.abstract)
        .slice(0, 10)
        .map((p: any) => ({
          paperId: p.paperId,
          title: p.title,
          abstract: p.abstract || "",
          authors: p.authors || [],
          year: p.year,
          url: p.url,
        }));

      const analyzeData = await api.analyzePapers(
        papersForAnalysis,
        searchQuery
      );
      const insights: KeyInsight[] = analyzeData.insights;

      completeStep(4, startTime, [`${insights.length} insights extracted`]);

      // ============================================
      // STAGE 5: GENERATE RESEARCH REPORT (Narrator)
      // ============================================
      startTime = Date.now();
      updateStepStatus(5, "in-progress");

      const reportData = await api.generateResearchReport(
        searchQuery,
        papersWithContent.slice(0, 10),
        insights
      );

      setResearchReport(reportData.research_report);
      completeStep(5, startTime, [`${reportData.word_count} words`]);

      // ============================================
      // STAGE 6: GENERATE FINAL SCRIPT (Editor)
      // ============================================
      startTime = Date.now();
      updateStepStatus(6, "in-progress");

      // Build references
      const references = papersForAnalysis.slice(0, 10).map((p: any) => ({
        title: p.title,
        authors: (p.authors || []).slice(0, 3).join(", "),
        year: p.year,
        url: p.url,
      }));

      const scriptData = await api.generateScript(
        insights,
        papersForAnalysis,
        searchQuery
      );

      // Build complete blueprint
      const blueprint: ContentBlueprint = {
        key_insights: insights,
        narrative: scriptData.narrative,
        references: references,
      };

      setContentBlueprint(blueprint);

      const scriptWordCount = [
        scriptData.narrative?.hook || "",
        scriptData.narrative?.introduction || "",
        scriptData.narrative?.deep_dive || "",
        scriptData.narrative?.conclusion || "",
      ]
        .join(" ")
        .split(" ").length;

      completeStep(6, startTime, [`${scriptWordCount} words`]);

      // ============================================
      // COMPLETE!
      // ============================================
      // Stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      setResearchPhase("complete");
    } catch (error: any) {
      console.error("Deep research pipeline error:", error);

      // Stop timer on error
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      setResearchPhase("chat");
      setCurrentReadingPaper(""); // Clear any reading state
      setResearchSteps([
        { id: 1, label: "Decomposing topic...", status: "pending" },
        { id: 2, label: "Searching papers...", status: "pending" },
        { id: 3, label: "Fetching full content...", status: "pending" },
        { id: 4, label: "Analyzing insights...", status: "pending" },
        { id: 5, label: "Writing research report...", status: "pending" },
        { id: 6, label: "Crafting final script...", status: "pending" },
      ]);
      alert(`Research failed: ${error.message || "Unknown error"}`);
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
                          <div className="text-sm text-[#1a1a1a] leading-relaxed">
                            {formatMessageContent(message.content)}
                          </div>
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

                      {/* Mode Toggle */}
                      <div className="mt-4 p-3 bg-white rounded-lg border border-gray-100">
                        <p className="text-xs text-gray-500 mb-3 font-medium">
                          Pilih Mode Penelitian:
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEnableDeepDive(false)}
                            className={`flex-1 px-3 py-2 text-xs rounded-lg border transition-all ${
                              !enableDeepDive
                                ? "bg-blue-50 border-blue-300 text-blue-700"
                                : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"
                            }`}
                          >
                            ⚡ Mode Cepat
                            <span className="block text-[10px] mt-1 opacity-70">
                              Abstract only (15-30 detik)
                            </span>
                          </button>
                          <button
                            onClick={() => setEnableDeepDive(true)}
                            className={`flex-1 px-3 py-2 text-xs rounded-lg border transition-all ${
                              enableDeepDive
                                ? "bg-green-50 border-green-300 text-green-700"
                                : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"
                            }`}
                          >
                            📖 Deep Dive
                            <span className="block text-[10px] mt-1 opacity-70">
                              Full text analysis (1-2 menit)
                            </span>
                          </button>
                        </div>
                      </div>

                      <button
                        onClick={handleStartResearch}
                        className="mt-3 w-full bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        🚀{" "}
                        {enableDeepDive
                          ? "Mulai Deep Research"
                          : "Mulai Research Cepat"}
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
                  {/* Header with Timer */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
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
                    {/* Real-time Timer */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-400">⏱️</span>
                      <span
                        className={`font-mono text-sm ${
                          researchPhase === "researching"
                            ? "text-green-600"
                            : "text-gray-600"
                        }`}
                      >
                        {totalElapsedTime >= 60000
                          ? `${Math.floor(totalElapsedTime / 60000)}m ${(
                              (totalElapsedTime % 60000) /
                              1000
                            ).toFixed(1)}s`
                          : `${(totalElapsedTime / 1000).toFixed(1)}s`}
                      </span>
                    </div>
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
                          <div className="flex items-center justify-between">
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
                            {step.status === "completed" &&
                              step.elapsedTime !== undefined && (
                                <span className="text-xs font-mono text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                                  {(step.elapsedTime / 1000).toFixed(1)}s
                                </span>
                              )}
                            {step.status === "in-progress" && (
                              <span className="text-xs font-mono text-green-500 animate-pulse">
                                ...
                              </span>
                            )}
                          </div>
                          {step.subItems && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {step.subItems.map((item, idx) => (
                                <span
                                  key={idx}
                                  className={`text-xs px-2 py-1 rounded-full ${
                                    step.id === 1
                                      ? "bg-green-100 text-green-700 animate-pulse"
                                      : "bg-gray-100 text-gray-600"
                                  }`}
                                  style={{
                                    animation:
                                      step.id === 1 &&
                                      step.status === "in-progress"
                                        ? `fadeInUp 0.3s ease-out ${
                                            idx * 0.15
                                          }s both`
                                        : undefined,
                                  }}
                                >
                                  {step.id === 1 ? `🔍 ${item}` : item}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Reading Paper Title - Glass Box Effect */}
                  {currentReadingPaper && (
                    <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-lg animate-pulse">
                      <p className="text-xs text-blue-600 mb-1 font-medium">
                        📖 Sedang membaca jurnal:
                      </p>
                      <p className="text-sm text-blue-800 font-medium truncate">
                        {currentReadingPaper}
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
                    <span className="text-xs font-normal text-gray-400 ml-2">
                      (Hover sitasi untuk melihat judul paper)
                    </span>
                  </h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-amber-50 rounded-lg">
                      <p className="text-xs font-bold text-amber-700 mb-2">
                        🎣 THE HOOK
                      </p>
                      <MarkdownRenderer
                        content={contentBlueprint.narrative.hook}
                      />
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-xs font-bold text-blue-700 mb-2">
                        📖 INTRODUCTION
                      </p>
                      <MarkdownRenderer
                        content={contentBlueprint.narrative.introduction}
                      />
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <p className="text-xs font-bold text-purple-700 mb-2">
                        🔬 THE DEEP DIVE
                      </p>
                      <MarkdownRenderer
                        content={contentBlueprint.narrative.deep_dive}
                      />
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-xs font-bold text-green-700 mb-2">
                        💡 CONCLUSION & TAKEAWAYS
                      </p>
                      <MarkdownRenderer
                        content={contentBlueprint.narrative.conclusion}
                      />
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

                {/* Raw Research Data - Collapsible Accordion */}
                {researchReport && (
                  <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                    <button
                      onClick={() => setShowResearchReport(!showResearchReport)}
                      className="w-full p-5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                    >
                      <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        📂 View Raw Research Data
                      </h3>
                      <div
                        className={`transform transition-transform ${
                          showResearchReport ? "rotate-180" : ""
                        }`}
                      >
                        <svg
                          className="w-5 h-5 text-gray-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </button>
                    {showResearchReport && (
                      <div className="px-5 pb-5 border-t border-gray-100">
                        <p className="text-xs text-gray-500 mb-3 mt-3">
                          Data riset lengkap dari Narrator Agent (
                          {researchReport.split(" ").length} kata)
                        </p>
                        <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                            {researchReport}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                )}

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
                isLoading || researchPhase === "researching" ? "opacity-60" : ""
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
                disabled={isLoading || researchPhase === "researching"}
                placeholder={
                  researchPhase === "researching"
                    ? "⏳ Deep Research sedang berjalan..."
                    : isLoading
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
                disabled={
                  isLoading ||
                  !inputValue.trim() ||
                  researchPhase === "researching"
                }
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
