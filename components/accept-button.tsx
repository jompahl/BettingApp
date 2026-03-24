"use client";

import { useFormStatus } from "react-dom";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className="button" type="submit" disabled={pending}>
      {pending ? "Accepting..." : "Accept bet"}
    </button>
  );
}

export function AcceptButton() {
  return <SubmitButton />;
}
