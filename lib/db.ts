import { neon } from "@neondatabase/serverless";

let initialized = false;

export function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL);
}

function getSqlClient() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("Missing DATABASE_URL environment variable.");
  }

  return neon(databaseUrl);
}

export async function sql<T = unknown[]>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<T> {
  const client = getSqlClient();

  return client(strings, ...values) as T;
}

export async function ensureDatabase() {
  if (!hasDatabaseUrl()) {
    return false;
  }

  if (initialized) {
    return true;
  }

  await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto;`;
  await sql`
    CREATE TABLE IF NOT EXISTS app_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      clerk_user_id TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      nickname TEXT,
      image_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await sql`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS nickname TEXT;`;
  await sql`
    CREATE TABLE IF NOT EXISTS bets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      challenger_user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      challenged_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
      challenged_email TEXT NOT NULL,
      title TEXT NOT NULL,
      details TEXT,
      stake_sek NUMERIC(10, 2) NOT NULL CHECK (stake_sek > 0),
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
      winner_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
      accepted_at TIMESTAMPTZ,
      settled_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await sql`ALTER TABLE bets ADD COLUMN IF NOT EXISTS winner_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL;`;
  await sql`ALTER TABLE bets ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ;`;
  await sql`CREATE INDEX IF NOT EXISTS bets_status_created_at_idx ON bets(status, created_at DESC);`;
  await sql`CREATE INDEX IF NOT EXISTS bets_challenged_email_idx ON bets(challenged_email);`;
  await sql`CREATE INDEX IF NOT EXISTS bets_challenged_user_id_idx ON bets(challenged_user_id);`;

  initialized = true;

  return true;
}
