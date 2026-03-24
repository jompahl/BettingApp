"use client";

import { Show, SignOutButton } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export function SiteMenu() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div className="menu-wrap" ref={containerRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Open navigation menu"
        className="menu-button"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span />
        <span />
        <span />
      </button>

      {open ? (
        <div className="menu-panel" role="menu">
          <Link href="/" onClick={() => setOpen(false)} role="menuitem">
            My bets
          </Link>
          <Link href="/hang-bets" onClick={() => setOpen(false)} role="menuitem">
            Häng bets
          </Link>
          <Show when="signed-in">
            <SignOutButton>
              <button className="menu-item-button" onClick={() => setOpen(false)} role="menuitem" type="button">
                Log out
              </button>
            </SignOutButton>
          </Show>
        </div>
      ) : null}
    </div>
  );
}
