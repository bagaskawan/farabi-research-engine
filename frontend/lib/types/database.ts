// Database types for Supabase tables

export interface Project {
  id: string;
  user_id: string;
  title: string;
  query_topic: string | null;
  status: "draft" | "completed";
  created_at: string;
  updated_at: string;
}

export interface WorkbenchContent {
  id: string;
  project_id: string;
  canvas_content: any | null; // BlockNote blocks JSON
  key_insights: string[] | null;
  tone_style: string;
  created_at: string;
}

export interface ResearchPaper {
  id: string;
  project_id: string;
  title: string;
  authors: string[] | null;
  year: number | null;
  citation_count: number | null;
  venue: string | null;
  doi: string | null;
  url: string | null;
  is_open_access: boolean;
  abstract: string | null;
  created_at: string;
}

export interface InterviewLog {
  id: string;
  project_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}
