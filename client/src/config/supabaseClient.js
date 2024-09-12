import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''; // Ensure this is set in the environment
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''; // Ensure this is set in the environment

// Initialize Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);