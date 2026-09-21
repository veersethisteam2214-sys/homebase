declare namespace Cloudflare {
  interface Env {
    SUPABASE_URL?: string;
    HOMEBASE_BRIDGE_SECRET?: string;
    HOMEBASE_OWNER_EMAIL?: string;
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}
