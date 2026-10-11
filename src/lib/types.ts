export type Role = "admin" | "rater";

export interface User {
  id: string;
  name: string;
  name_key: string | null;
  role: Role;
  is_anonymous: number;
  last_model_id: string | null;
  created_at: string;
  last_seen_at: string;
}

export interface Model {
  id: string;
  sku: string | null;
  name: string;
  brand: string | null;
  category: string | null;
  notes: string | null;
  active: number;
  created_at: string;
}

export interface ModelImage {
  id: string;
  model_id: string | null;
  original_name: string | null;
  filename: string;
  sort_order: number;
  created_at: string;
}

export interface Rating {
  id: string;
  user_id: string;
  model_id: string;
  score: number;
  created_at: string;
  updated_at: string;
}
