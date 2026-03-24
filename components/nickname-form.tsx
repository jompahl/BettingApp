"use client";

import { useActionState } from "react";

import { initialActionState } from "@/app/action-state";
import { updateNickname } from "@/app/actions";

type NicknameFormProps = {
  currentValue?: string | null;
};

export function NicknameForm({ currentValue }: NicknameFormProps) {
  const [state, action, pending] = useActionState(updateNickname, initialActionState);

  return (
    <form action={action} className="form">
      <div className="field">
        <label htmlFor="nickname">Nickname</label>
        <input
          id="nickname"
          name="nickname"
          type="text"
          placeholder="Johnno"
          defaultValue={currentValue ?? ""}
          minLength={2}
          maxLength={24}
          required
        />
      </div>

      {state.status !== "idle" ? (
        <p className={`notice ${state.status === "error" ? "error" : ""}`}>{state.message}</p>
      ) : null}

      <button className="button secondary" type="submit" disabled={pending}>
        {pending ? "Saving..." : currentValue ? "Update nickname" : "Save nickname"}
      </button>
    </form>
  );
}
