"use client";

import { useActionState } from "react";

import { initialActionState } from "@/app/action-state";
import { createChallenge } from "@/app/actions";

type ChallengeFormProps = {
  users: Array<{ email: string; displayName: string; nickname: string | null }>;
};

export function ChallengeForm({ users }: ChallengeFormProps) {
  const [state, action, pending] = useActionState(createChallenge, initialActionState);

  return (
    <form action={action} className="form">
      <div className="field">
        <label htmlFor="opponentQuery">Challenge a friend</label>
        <input
          id="opponentQuery"
          name="opponentQuery"
          type="text"
          list="friend-emails"
          placeholder="friend@example.com or nickname"
          required
        />
        <datalist id="friend-emails">
          {users.map((user) => (
            <option
              key={user.email}
              value={user.nickname ?? user.email}
              label={user.nickname ? `${user.nickname} (${user.email})` : user.email}
            />
          ))}
        </datalist>
      </div>

      <div className="field">
        <label htmlFor="title">What are you betting on?</label>
        <input
          id="title"
          name="title"
          type="text"
          placeholder="Arsenal finishes above Spurs"
          minLength={4}
          maxLength={120}
          required
        />
      </div>

      <div className="field">
        <label htmlFor="stakeSek">Stake in SEK</label>
        <input id="stakeSek" name="stakeSek" type="number" min="1" step="1" placeholder="100" required />
      </div>

      <div className="field">
        <label htmlFor="details">Optional details</label>
        <textarea
          id="details"
          name="details"
          rows={4}
          placeholder="Settle after the final matchday."
          maxLength={400}
        />
      </div>

      {state.status !== "idle" ? (
        <p className={`notice ${state.status === "error" ? "error" : ""}`}>{state.message}</p>
      ) : null}

      <button className="button" type="submit" disabled={pending}>
        {pending ? "Sending challenge..." : "Send challenge"}
      </button>
    </form>
  );
}
