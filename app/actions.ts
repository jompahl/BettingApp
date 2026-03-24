"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionState } from "@/app/action-state";
import { syncSignedInUser } from "@/lib/bets";
import { ensureDatabase, hasDatabaseUrl, sql } from "@/lib/db";

const challengeSchema = z.object({
  opponentQuery: z.string().trim().min(2, "Enter a friend's email or nickname."),
  title: z.string().min(4, "Add a short description of the bet.").max(120),
  details: z.string().max(400).optional(),
  stakeSek: z.coerce.number().positive("Stake must be more than 0 SEK.").max(100000)
});

const nicknameSchema = z.object({
  nickname: z
    .string()
    .trim()
    .min(2, "Nickname must be at least 2 characters.")
    .max(24, "Nickname must be 24 characters or less.")
});

export async function createChallenge(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  if (!hasDatabaseUrl()) {
    return {
      status: "error",
      message: "Add your Neon DATABASE_URL before creating bets."
    };
  }

  await ensureDatabase();

  const { userId } = await auth();

  if (!userId) {
    return {
      status: "error",
      message: "You need to sign in before creating a challenge."
    };
  }

  const viewer = await syncSignedInUser();

  if (!viewer) {
    return {
      status: "error",
      message: "We could not load your account."
    };
  }

  const parsed = challengeSchema.safeParse({
    opponentQuery: formData.get("opponentQuery"),
    title: formData.get("title"),
    details: formData.get("details"),
    stakeSek: formData.get("stakeSek")
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Please check the form and try again."
    };
  }

  const opponentQuery = parsed.data.opponentQuery.toLowerCase();

  if (opponentQuery === viewer.email.toLowerCase()) {
    return {
      status: "error",
      message: "You cannot challenge yourself."
    };
  }

  const matches = await sql<
    {
      id: string;
      email: string;
      display_name: string;
      nickname: string | null;
    }[]
  >`
    SELECT id, email, display_name, nickname
    FROM app_users
    WHERE LOWER(email) = ${opponentQuery}
       OR LOWER(COALESCE(nickname, '')) = ${opponentQuery}
    ORDER BY CASE WHEN LOWER(email) = ${opponentQuery} THEN 0 ELSE 1 END, created_at ASC
    LIMIT 2;
  `;

  if (matches.length === 0) {
    return {
      status: "error",
      message: "Use the email or nickname of a signed-up user."
    };
  }

  if (matches.length > 1 && matches.every((match) => (match.nickname ?? "").toLowerCase() === opponentQuery)) {
    return {
      status: "error",
      message: "That nickname matches multiple users. Use an email instead."
    };
  }

  const [opponent] = matches;

  if (opponent.id === viewer.id) {
    return {
      status: "error",
      message: "You cannot challenge yourself."
    };
  }

  await sql`
    INSERT INTO bets (
      challenger_user_id,
      challenged_user_id,
      challenged_email,
      title,
      details,
      stake_sek
    )
    VALUES (
      ${viewer.id},
      ${opponent.id},
      ${opponent.email},
      ${parsed.data.title.trim()},
      ${parsed.data.details?.trim() || null},
      ${parsed.data.stakeSek}
    );
  `;

  revalidatePath("/");

  return {
    status: "success",
    message: `Challenge sent to ${opponent.nickname ?? opponent.display_name}. It will show up in the main overview after they accept it.`
  };
}

export async function updateNickname(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  if (!hasDatabaseUrl()) {
    return {
      status: "error",
      message: "Add your Neon DATABASE_URL before saving a nickname."
    };
  }

  await ensureDatabase();

  const viewer = await syncSignedInUser();

  if (!viewer) {
    return {
      status: "error",
      message: "You need to sign in before saving a nickname."
    };
  }

  const parsed = nicknameSchema.safeParse({
    nickname: formData.get("nickname")
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Please check the nickname and try again."
    };
  }

  const nickname = parsed.data.nickname;

  const [existingNickname] = await sql<{ id: string }[]>`
    SELECT id
    FROM app_users
    WHERE LOWER(nickname) = LOWER(${nickname})
      AND id <> ${viewer.id}
    LIMIT 1;
  `;

  if (existingNickname) {
    return {
      status: "error",
      message: "That nickname is already taken. Pick another one."
    };
  }

  await sql`
    UPDATE app_users
    SET nickname = ${nickname}
    WHERE id = ${viewer.id};
  `;

  revalidatePath("/");

  return {
    status: "success",
    message: `Nickname saved as ${nickname}.`
  };
}

const acceptSchema = z.object({
  betId: z.string().uuid()
});

export async function acceptChallenge(formData: FormData) {
  if (!hasDatabaseUrl()) {
    return;
  }

  await ensureDatabase();

  const { userId } = await auth();

  if (!userId) {
    return;
  }

  const viewer = await syncSignedInUser();

  if (!viewer) {
    return;
  }

  const parsed = acceptSchema.safeParse({
    betId: formData.get("betId")
  });

  if (!parsed.success) {
    return;
  }

  await sql`
    UPDATE bets
    SET
      status = 'accepted',
      challenged_user_id = ${viewer.id},
      accepted_at = NOW()
    WHERE id = ${parsed.data.betId}
      AND status = 'pending'
      AND challenged_email = ${viewer.email};
  `;

  revalidatePath("/");
}
