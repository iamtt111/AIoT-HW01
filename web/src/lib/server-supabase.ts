export type ServerSupabaseConfig = {
  url: string;
  secretKey: string;
};

export function serverSupabaseConfig(): ServerSupabaseConfig {
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    throw new Error("Server-side Supabase URL and secret key are not configured");
  }
  return { url: url.replace(/\/$/, ""), secretKey };
}
