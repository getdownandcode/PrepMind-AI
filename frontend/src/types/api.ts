// Mirrors backend Pydantic schemas.
export type UUID = string;
export type Difficulty = "easy" | "medium" | "hard" | "expert";

export interface User {
  id: UUID;
  email: string;
  full_name: string | null;
  target_role: string | null;
  experience_level: "intern" | "junior" | "mid" | "senior" | null;
  target_company: string | null;
  readiness_score: number;
  created_at: string;
}

export interface AuthResponse {
  user?: User;
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
}

export interface Question {
  id: UUID;
  turn_index: number;
  topic: string;
  difficulty: Difficulty;
  prompt: string;
}

export interface Evaluation {
  correctness_score: number;
  clarity_score: number;
  depth_score: number;
  confidence_score: number;
  feedback: string;
  ideal_answer: string;
  rubric: { strengths: string[]; gaps: string[] };
  suggested_followup?: string | null;
}

export interface SubmitAnswerResponse {
  evaluation: Evaluation;
  next_question: Question | null;
  rationale: string;
  is_complete: boolean;
}

export interface StartInterviewResponse {
  interview_id: UUID;
  question: Question;
  rationale: string;
}
