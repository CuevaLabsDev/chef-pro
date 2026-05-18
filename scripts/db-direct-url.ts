/**
 * Build a direct (non-session-pooler) Postgres URL for one-off migrations/seeds.
 * Session pooler (port 5432) exhausts quickly when many serverless instances connect.
 */
export function getDirectDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is not set");

  if (process.env.DIRECT_DATABASE_URL) {
    return process.env.DIRECT_DATABASE_URL;
  }

  const parsed = new URL(raw.replace(/^postgresql:/, "http:"));
  const password = decodeURIComponent(parsed.password);
  const projectRef = parsed.username.includes(".")
    ? parsed.username.split(".")[1]
    : parsed.hostname.split(".")[0].replace("db.", "");

  return `postgresql://postgres:${encodeURIComponent(password)}@db.${projectRef}.supabase.co:5432/postgres`;
}
