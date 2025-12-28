export interface Project {
  id: string;
  user_id: string;
  title: string;
  status: "draft" | "completed";
  created_at: string;
}

export interface ResearchPaper {
  id: string;
  project_id: string;
  title: string;
  authors: string[];
  year: number;
  citation_count: number;
  is_open_access: boolean;
  doi: string;
  url: string;
}

export interface ContentDraft {
  id: string;
  project_id: string;
  hook_text: string;
  body_text: string;
  conclusion_text: string;
}
