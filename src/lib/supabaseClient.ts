import { createClient } from '@supabase/supabase-js';

// Use env when available; fall back to provided project values to avoid runtime crashes during dev
const url =
  (process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined) ||
  'https://zzanzsajjyqeeocnypvt.supabase.co';
const anon =
  (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6YW56c2FqanlxZWVvY255cHZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5NTIzNDUsImV4cCI6MjA3OTUyODM0NX0.6R95q2fnWcSACq5YPZ2CZmmOehe_CUxYg7LNmAVLTJ0';

// Note: For production, move values to .env.local. These fallbacks prevent "supabaseUrl is required" during local dev.

export const supabase = createClient(url ?? '', anon ?? '');


