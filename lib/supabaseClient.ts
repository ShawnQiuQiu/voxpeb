import { createClient } from '@supabase/supabase-js';

// Fallback to placeholder values if environment variables are missing.
// This prevents the app from crashing immediately on load with "supabaseUrl is required".
// Note: Authentication and database features will not work until valid keys are provided in .env
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);