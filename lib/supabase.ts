import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  },
});

export type Memo = {
  id: string;
  name: string;
  created_at: string;
  priority?: 'low' | 'medium' | 'high';
  deadline?: string | null;
  tags?: string[];
  suggested_time?: string;
  type?: 'task' | 'diary';
  sort_order?: number;
};

export type Task = {
  id: string;
  memo_id: string;
  content: string;
  image_url: string | null;
  completed: boolean;
  created_at: string;
  priority?: 'low' | 'medium' | 'high';
  environment?: 'home' | 'office' | 'cafe' | 'other';
  custom_environment?: string | null;
  mood?: 'happy' | 'neutral' | 'sad' | null;
  custom_mood?: string | null;
  completed_at?: string | null;
  tags?: string[];
  sort_order?: number;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  reminder_time?: string | null;
  reminder_enabled?: boolean;
};

export type DiaryEntry = {
  id: string;
  memo_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  environment?: 'home' | 'office' | 'cafe' | 'other';
  custom_environment?: string | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  mood?: 'happy' | 'neutral' | 'sad' | null;
  custom_mood?: string | null;
  tags?: string[];
  weather?: string | null;
  sort_order?: number;
  reminder_time?: string | null;
  reminder_enabled?: boolean;
  image_urls?: string[] | null;
};

export type Reminder = {
  id: string;
  memo_id?: string;
  task_id?: string;
  reminder_time: string;
  reminder_type: 'one_time' | 'daily' | 'weekly';
  is_sent: boolean;
  created_at: string;
};

export type Report = {
  id: string;
  memo_id?: string | null;
  report_type: 'weekly' | 'monthly' | 'yearly';
  period_key?: string | null;
  period_start: string;
  period_end: string;
  summary: string;
  completion_rate: number;
  total_tasks: number;
  completed_tasks: number;
  total_diary_entries: number;
  characteristics?: string | null;
  hobbies?: string[] | null;
  encouragement?: string | null;
  suggestions?: string | null;
  full_report?: Record<string, any> | null;
  created_at: string;
};
