"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { ChallengeForm } from "@/components/challenge-form";

type NewBetModalProps = {
  users: Array<{ email: string; displayName: string; nickname: string | null }>;
  databaseReady: boolean;
};

export function NewBetModal({ users, databaseReady }: NewBetModalProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  const modal =
    open && mounted
      ? createPortal(
          <div className="modal-backdrop" role="presentation" onClick={() => setOpen(false)}>
            <div
              aria-modal="true"
              className="modal-card panel"
              role="dialog"
              aria-labelledby="new-bet-title"
              onClick={(event) => event.stopPropagation()}
            >
              <button className="button secondary modal-close modal-close-corner" type="button" onClick={() => setOpen(false)}>
                Close
              </button>

              <div className="modal-header-copy">
                <div>
                  <h2 id="new-bet-title">New challenge</h2>
                  <p className="subtitle">
                    Challenge someone by email. The bet only enters the overview after they accept it.
                  </p>
                </div>
              </div>

              {databaseReady ? (
                <ChallengeForm users={users} />
              ) : (
                <div className="empty">Connect Neon first to create and track real bets.</div>
              )}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button className="button make-bet-button" type="button" onClick={() => setOpen(true)} disabled={!databaseReady}>
        Make a new bet
      </button>
      {modal}
    </>
  );
}
