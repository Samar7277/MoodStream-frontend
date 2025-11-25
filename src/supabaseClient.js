import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://qbnvbvssuflaxuybkexl.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFibnZidnNzdWZsYXh1eWJrZXhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3OTk3OTMsImV4cCI6MjA3OTM3NTc5M30.H2TQeS3vKE-3ILRMqMPvz93dtU81WmHL9gqNmbK3qJk";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

