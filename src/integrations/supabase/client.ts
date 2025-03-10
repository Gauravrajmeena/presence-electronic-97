
// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Use environment variables if available, otherwise fall back to hardcoded values
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://lfrplfkmbhlmheqaqyjc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmcnBsZmttYmhsbWhlcWFxeWpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE1ODM2NDgsImV4cCI6MjA1NzE1OTY0OH0.XXEPKtT5wbmvYNFI_hTKaNjC9SahXzvCrUEt_1hb7Qs";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Add a simple health check function to verify connection
export const checkSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('attendance_records').select('id').limit(1);
    return { connected: !error, data, error };
  } catch (err) {
    console.error('Supabase connection error:', err);
    return { connected: false, error: err };
  }
};
