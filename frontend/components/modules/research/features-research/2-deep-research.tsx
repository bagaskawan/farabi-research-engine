"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@/hooks/use-user";
import { SendIcon } from "@/components/ui/icons";

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
  academic_keywords: string;
}

// AI Response structure
interface AIResponse {
  analysis: {
    clarity_score: number;
    reasoning: string;
  };
  next_action: "probe" | "propose";
  reply_message: string;
  options: ResearchOption[];
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

        // If propose mode, show options
        if (data.next_action === "propose" && data.options.length > 0) {
          setCurrentOptions(data.options);
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

    // Fetch initial AI response
    if (messages.length === 1 && messages[0].type === "user") {
      fetchAIResponse(messages);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Handle custom input request
  const handleCustomInput = () => {
    setShowCustomInput(true);
    setCurrentOptions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
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
                <div className="flex gap-3 max-w-lg">
                  {/* AI Avatar */}
                  <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">F</span>
                  </div>
                  <div>
                    <p className="text-xs text-teal-600 mb-1 font-medium">
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
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">F</span>
                </div>
                <div>
                  <p className="text-xs text-teal-600 mb-1 font-medium">
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
                      className="w-full text-left p-4 rounded-xl border border-gray-200 hover:border-teal-400 hover:bg-teal-50 transition-all group"
                    >
                      <p className="font-medium text-gray-800 group-hover:text-teal-700">
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
                    className="w-full text-center p-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 hover:border-teal-400 hover:text-teal-600 transition-all"
                  >
                    ✨ Tulis Topik Lain...
                  </button>
                </div>
              </div>
            </div>
          )}
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
  );
}
