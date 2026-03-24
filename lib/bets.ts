import { auth, clerkClient } from "@clerk/nextjs/server";

import { ensureDatabase, hasDatabaseUrl, sql } from "@/lib/db";

export type BetRecord = {
  id: string;
  title: string;
  details: string | null;
  stakeSek: number;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
  acceptedAt: string | null;
  challengerName: string;
  challengedName: string;
  challengedEmail: string;
  challengerClerkId: string;
  challengedClerkId: string | null;
  winnerName: string | null;
  settledAt: string | null;
};

export type OverviewData = {
  databaseReady: boolean;
  currentUser: {
    nickname: string | null;
    displayName: string;
  } | null;
  acceptedBets: BetRecord[];
  incomingChallenges: BetRecord[];
  outgoingChallenges: BetRecord[];
  users: Array<{ email: string; displayName: string; nickname: string | null }>;
};

export type HangBetsData = {
  databaseReady: boolean;
  bets: BetRecord[];
};

type ClerkUserRecord = {
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  imageUrl?: string;
  emailAddresses: Array<{
    emailAddress: string;
    id: string;
  }>;
  primaryEmailAddressId: string | null;
};

function buildDisplayName(user: ClerkUserRecord | null) {
  if (!user) {
    return null;
  }

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  const primaryEmail = user.emailAddresses.find(
    (emailAddress) => emailAddress.id === user.primaryEmailAddressId
  )?.emailAddress;

  return fullName || user.username || primaryEmail || "Anonymous bettor";
}

export async function syncSignedInUser() {
  const databaseReady = await ensureDatabase();

  if (!databaseReady) {
    return null;
  }

  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const client = await clerkClient();
  const clerkUser = (await client.users.getUser(userId)) as ClerkUserRecord;
  const primaryEmail = clerkUser.emailAddresses.find(
    (emailAddress) => emailAddress.id === clerkUser.primaryEmailAddressId
  )?.emailAddress;

  if (!primaryEmail) {
    throw new Error("A verified email is required to use this app.");
  }

  const email = primaryEmail.toLowerCase();
  const displayName = buildDisplayName(clerkUser);
  const imageUrl = clerkUser.imageUrl ?? null;

  const [appUser] = await sql<{
    id: string;
    email: string;
    display_name: string;
    nickname: string | null;
  }[]>`
    INSERT INTO app_users (clerk_user_id, email, display_name, nickname, image_url)
    VALUES (${userId}, ${email}, ${displayName}, NULL, ${imageUrl})
    ON CONFLICT (email)
    DO UPDATE SET
      clerk_user_id = EXCLUDED.clerk_user_id,
      email = EXCLUDED.email,
      display_name = EXCLUDED.display_name,
      image_url = EXCLUDED.image_url
    RETURNING id, email, display_name, nickname;
  `;

  await sql`
    UPDATE bets
    SET challenged_user_id = ${appUser.id}
    WHERE challenged_email = ${email}
      AND challenged_user_id IS NULL;
  `;

  return appUser;
}

function mapBet(row: Record<string, unknown>): BetRecord {
  return {
    id: String(row.id),
    title: String(row.title),
    details: row.details ? String(row.details) : null,
    stakeSek: Number(row.stake_sek),
    status: row.status as BetRecord["status"],
    createdAt: String(row.created_at),
    acceptedAt: row.accepted_at ? String(row.accepted_at) : null,
    challengerName: String(row.challenger_name),
    challengedName: String(row.challenged_name),
    challengedEmail: String(row.challenged_email),
    challengerClerkId: String(row.challenger_clerk_id),
    challengedClerkId: row.challenged_clerk_id ? String(row.challenged_clerk_id) : null,
    winnerName: row.winner_name ? String(row.winner_name) : null,
    settledAt: row.settled_at ? String(row.settled_at) : null
  };
}

export async function getOverviewData(): Promise<OverviewData> {
  const databaseReady = await ensureDatabase();

  if (!databaseReady || !hasDatabaseUrl()) {
    return {
      databaseReady: false,
      currentUser: null,
      acceptedBets: [],
      incomingChallenges: [],
      outgoingChallenges: [],
      users: []
    };
  }

  const { userId } = await auth();
  const appUser = await syncSignedInUser();

  const acceptedRows = appUser
    ? await sql<Record<string, unknown>[]>`
        SELECT
          b.*,
          COALESCE(challenger.nickname, challenger.display_name) AS challenger_name,
          challenger.clerk_user_id AS challenger_clerk_id,
          COALESCE(challenged.nickname, challenged.display_name, b.challenged_email) AS challenged_name,
          challenged.clerk_user_id AS challenged_clerk_id,
          COALESCE(winner.nickname, winner.display_name) AS winner_name
        FROM bets b
        INNER JOIN app_users challenger ON challenger.id = b.challenger_user_id
        LEFT JOIN app_users challenged ON challenged.id = b.challenged_user_id
        LEFT JOIN app_users winner ON winner.id = b.winner_user_id
        WHERE b.status = 'accepted'
          AND (
            b.challenger_user_id = ${appUser.id}
            OR b.challenged_user_id = ${appUser.id}
          )
        ORDER BY b.accepted_at DESC NULLS LAST, b.created_at DESC;
      `
    : await sql<Record<string, unknown>[]>`
        SELECT
          b.*,
          COALESCE(challenger.nickname, challenger.display_name) AS challenger_name,
          challenger.clerk_user_id AS challenger_clerk_id,
          COALESCE(challenged.nickname, challenged.display_name, b.challenged_email) AS challenged_name,
          challenged.clerk_user_id AS challenged_clerk_id,
          COALESCE(winner.nickname, winner.display_name) AS winner_name
        FROM bets b
        INNER JOIN app_users challenger ON challenger.id = b.challenger_user_id
        LEFT JOIN app_users challenged ON challenged.id = b.challenged_user_id
        LEFT JOIN app_users winner ON winner.id = b.winner_user_id
        WHERE b.status = 'accepted'
        ORDER BY b.accepted_at DESC NULLS LAST, b.created_at DESC;
      `;

  const users = appUser
    ? await sql<{ email: string; display_name: string; nickname: string | null }[]>`
        SELECT email, display_name, nickname
        FROM app_users
        WHERE id <> ${appUser.id}
        ORDER BY COALESCE(nickname, display_name) ASC;
      `
    : await sql<{ email: string; display_name: string; nickname: string | null }[]>`
        SELECT email, display_name, nickname
        FROM app_users
        ORDER BY COALESCE(nickname, display_name) ASC;
      `;

  if (!appUser) {
    return {
      databaseReady: true,
      currentUser: null,
      acceptedBets: acceptedRows.map(mapBet),
      incomingChallenges: [],
      outgoingChallenges: [],
      users: users.map((user) => ({
        email: user.email,
        displayName: user.nickname ?? user.display_name,
        nickname: user.nickname
      }))
    };
  }

  const pendingRows = await sql<Record<string, unknown>[]>`
    SELECT
      b.*,
      COALESCE(challenger.nickname, challenger.display_name) AS challenger_name,
      challenger.clerk_user_id AS challenger_clerk_id,
      COALESCE(challenged.nickname, challenged.display_name, b.challenged_email) AS challenged_name,
      challenged.clerk_user_id AS challenged_clerk_id,
      COALESCE(winner.nickname, winner.display_name) AS winner_name
    FROM bets b
    INNER JOIN app_users challenger ON challenger.id = b.challenger_user_id
    LEFT JOIN app_users challenged ON challenged.id = b.challenged_user_id
    LEFT JOIN app_users winner ON winner.id = b.winner_user_id
    WHERE b.status = 'pending'
      AND (
        b.challenger_user_id = ${appUser.id}
        OR b.challenged_user_id = ${appUser.id}
        OR b.challenged_email = ${appUser.email}
      )
    ORDER BY b.created_at DESC;
  `;

  return {
    databaseReady: true,
    currentUser: {
      nickname: appUser.nickname,
      displayName: appUser.nickname ?? appUser.display_name
    },
    acceptedBets: acceptedRows.map(mapBet),
    incomingChallenges: pendingRows
      .map(mapBet)
      .filter((bet) => bet.challengedEmail.toLowerCase() === appUser.email.toLowerCase()),
    outgoingChallenges: pendingRows
      .map(mapBet)
      .filter((bet) => bet.challengerClerkId === userId),
    users: users.map((user) => ({
      email: user.email,
      displayName: user.nickname ?? user.display_name,
      nickname: user.nickname
    }))
  };
}

export async function getHangBetsData(): Promise<HangBetsData> {
  const databaseReady = await ensureDatabase();

  if (!databaseReady || !hasDatabaseUrl()) {
    return {
      databaseReady: false,
      bets: []
    };
  }

  await syncSignedInUser();

  const allBets = await sql<Record<string, unknown>[]>`
    SELECT
      b.*,
      COALESCE(challenger.nickname, challenger.display_name) AS challenger_name,
      challenger.clerk_user_id AS challenger_clerk_id,
      COALESCE(challenged.nickname, challenged.display_name, b.challenged_email) AS challenged_name,
      challenged.clerk_user_id AS challenged_clerk_id,
      COALESCE(winner.nickname, winner.display_name) AS winner_name
    FROM bets b
    INNER JOIN app_users challenger ON challenger.id = b.challenger_user_id
    LEFT JOIN app_users challenged ON challenged.id = b.challenged_user_id
    LEFT JOIN app_users winner ON winner.id = b.winner_user_id
    WHERE b.status = 'accepted'
    ORDER BY b.accepted_at DESC NULLS LAST, b.created_at DESC;
  `;

  return {
    databaseReady: true,
    bets: allBets.map(mapBet)
  };
}
