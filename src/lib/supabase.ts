import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

export type Flow = {
  id: string;
  user_id: string;
  name: string;
  data: {
    nodes: Array<{ id: string; data: { label: string }; position: { x: number; y: number }; type?: string }>;
    edges: Array<{ id: string; source: string; target: string }>;
  };
  created_at: string;
  updated_at: string;
};
