import type { Metadata } from "next";
import { ClerkProvider, Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

import { SiteMenu } from "@/components/site-menu";

import "./globals.css";

export const metadata: Metadata = {
  title: "Bet Mates",
  description: "Challenge friends, accept bets, and track active wagers in SEK."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ClerkProvider>
          <div className="shell">
            <header className="topbar">
              <div className="nav-cluster">
                <SiteMenu />

                <div className="inline-actions">
                  <Show when="signed-out">
                    <SignInButton mode="modal">
                      <button className="button secondary" type="button">
                        Sign in
                      </button>
                    </SignInButton>
                    <SignUpButton mode="modal">
                      <button className="button" type="button">
                        Create account
                      </button>
                    </SignUpButton>
                  </Show>

                  <Show when="signed-in">
                    <UserButton />
                  </Show>
                </div>
              </div>
            </header>

            {children}
          </div>
        </ClerkProvider>
      </body>
    </html>
  );
}
