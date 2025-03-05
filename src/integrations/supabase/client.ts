
// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://ulqeiwqodhltoibeqzlp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVscWVpd3FvZGhsdG9pYmVxemxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDExNzA5MjgsImV4cCI6MjA1Njc0NjkyOH0.tEcTfAx4nisb_SaHE1GNAEcfLwbLgNJMXHrTw8wpGw0";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBRNd3qMSYy4J6GnRajnM7sQPqKMmtOSRI",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "face-attendance-ed516.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "face-attendance-ed516",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "face-attendance-ed516.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "823123600366",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:823123600366:web:6eaac2a3fa8cf9429dca85"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);
