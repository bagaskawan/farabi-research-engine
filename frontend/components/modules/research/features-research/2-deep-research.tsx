"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  const { username, avatarUrl } = useUser();

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
            {messages.map((message) => (
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
                      <div className="bg-blue-500 text-white rounded-2xl rounded-br-sm px-4 py-3">
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
            {finalKeywords && !isLoading && (
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
                      <button className="mt-3 w-full bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors">
                        🚀 Lanjut Cari Paper
                      </button>
                    </div>
                  </div>
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
              className={`flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-full px-5 py-3 ${
                isLoading ? "opacity-60" : ""
              }`}
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                placeholder={
                  isLoading
                    ? "Menunggu respons..."
                    : showCustomInput
                    ? "Tulis topik yang kamu inginkan..."
                    : "Ketik pesanmu..."
                }
                className="flex-1 bg-transparent text-sm text-[#1a1a1a] placeholder-gray-400 focus:outline-none disabled:cursor-not-allowed"
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !inputValue.trim()}
                className="w-9 h-9 flex items-center justify-center bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <SendIcon />
              </button>
            </div>

            {/* Disclaimer */}
            <p className="text-center text-xs text-gray-400 mt-3">
              Farabi dapat membuat kesalahan. Periksa informasi penting.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
