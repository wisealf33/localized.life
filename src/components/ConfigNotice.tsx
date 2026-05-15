import { isSupabaseConfigured } from "@/lib/supabase";

export function ConfigNotice() {
  if (isSupabaseConfigured) return null;

  return (
    <div className="notice">
      Supabase is not configured yet. Add the values from <code>.env.example</code> to <code>.env.local</code>,
      then run the SQL in <code>supabase/schema.sql</code>.
    </div>
  );
}
