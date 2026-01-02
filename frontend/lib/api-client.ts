// lib/api-client.ts
// Centralized API client for communicating with the FastAPI backend

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Generic fetch wrapper with error handling and logging
 */
export async function fetchFromBackend(
  endpoint: string,
  method: string,
  body?: any
) {
  const headers = {
    "Content-Type": "application/json",
  };

  // DEBUG: Log the full URL in browser console
  const fullUrl = `${BACKEND_URL}${endpoint}`;
  console.log(`[API Call] Fetching: ${fullUrl} (${method})`);

  const response = await fetch(fullUrl, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || errorData.error || "Failed to fetch from backend"
    );
  }

  return response.json();
}

/**
 * Centralized API methods for the application
 */
export const api = {
  // ===========================================================================
  // Health & Root
  // ===========================================================================
  healthCheck: () => fetchFromBackend("/health", "GET"),

  // ===========================================================================
  // Interview Router (/interview)
  // ===========================================================================
  continueInterview: (interest: string, conversation: any[]) =>
    fetchFromBackend("/interview/continue", "POST", {
      interest,
      conversation,
    }),

  // ===========================================================================
  // Semantic Scholar Router (/semantic-scholar)
  // ===========================================================================
  searchPapers: (keywords: string, limit: number = 15) =>
    fetchFromBackend("/semantic-scholar/search", "POST", { keywords, limit }),

  // ===========================================================================
  // Research Pipeline Router (/research)
  // ===========================================================================

  // Analyze papers and extract key insights
  analyzePapers: (papers: any[], topic: string) =>
    fetchFromBackend("/research/analyze", "POST", { papers, topic }),

  // Generate content blueprint/script from insights
  generateScript: (insights: any[], papers: any[], topic: string) =>
    fetchFromBackend("/research/generate-script", "POST", {
      insights,
      papers,
      topic,
    }),

  // Search with smart fallback (broadens search if few results)
  searchWithFallback: (keywords: string, limit: number = 10) =>
    fetchFromBackend("/research/search-fallback", "POST", { keywords, limit }),

  // --- Staged Deep Research Endpoints (Real-Time Progress) ---

  // Stage 1: Decompose topic into sub-queries
  decomposeTopic: (topic: string, keywords: string) =>
    fetchFromBackend("/research/decompose", "POST", { topic, keywords }),

  // Stage 2: Parallel search across all sub-queries
  multiSearch: (sub_queries: string[], limit_per_query: number = 8) =>
    fetchFromBackend("/research/multi-search", "POST", {
      sub_queries,
      limit_per_query,
    }),

  // Stage 3: Fetch full content from papers (if available)
  fetchContent: (papers: any[], max_papers: number = 8) =>
    fetchFromBackend("/research/fetch-content", "POST", { papers, max_papers }),

  // Stage 4: Synthesize content from papers
  synthesizeContent: (
    papers_with_content: any[],
    topic: string,
    key_insights: any[]
  ) =>
    fetchFromBackend("/research/synthesize", "POST", {
      papers_with_content,
      topic,
      key_insights,
    }),

  // Stage 5: Generate research report (Narrator)
  generateResearchReport: (
    topic: string,
    papers_with_content: any[],
    insights: any[]
  ) =>
    fetchFromBackend("/research/generate-report", "POST", {
      topic,
      papers_with_content,
      insights,
    }),

  // ===========================================================================
  // Projects Router (/projects)
  // ===========================================================================

  // Save Content Blueprint and papers to Supabase
  saveProject: (data: {
    user_id: string;
    title: string;
    query_topic: string;
    key_insights: any[];
    narrative: {
      hook: string;
      introduction: string;
      deep_dive: string;
      conclusion: string;
    };
    papers: any[];
  }) => fetchFromBackend("/projects/save-project", "POST", data),

  // ===========================================================================
  // AI Completion (Next.js API Route - for BlockNote AI)
  // ===========================================================================
  generateAICompletion: async (context: string, prompt?: string) => {
    const response = await fetch("/api/ai/editor-completion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context, prompt }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to generate AI completion");
    }

    return response.json();
  },
};

export default api;
