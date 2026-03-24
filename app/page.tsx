import { Show, SignInButton, SignUpButton } from "@clerk/nextjs";

import { acceptChallenge } from "@/app/actions";
import { AcceptButton } from "@/components/accept-button";
import { NewBetModal } from "@/components/new-bet-modal";
import { NicknameForm } from "@/components/nickname-form";
import { getOverviewData } from "@/lib/bets";

function currency(value: number) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("sv-SE", {
    dateStyle: "medium"
  }).format(new Date(value));
}

export default async function HomePage() {
  const data = await getOverviewData();

  return (
    <main className="grid" style={{ gap: 24 }}>
      <section className="hero">
        <div className="grid" style={{ gap: 14 }}>
          <span className="eyebrow">Overview Page</span>
          <h1 className="title">See only the accepted bets you are part of.</h1>
          <p className="subtitle" style={{ maxWidth: 700, fontSize: "1.05rem" }}>
            This page is now your personal overview. It only lists accepted bets where you are one of the two people
            involved, while pending challenges stay in the side panel.
          </p>
        </div>

        <div className="stats">
          <div className="stat">
            <span className="muted">Accepted bets</span>
            <strong>{data.acceptedBets.length}</strong>
          </div>
          <div className="stat">
            <span className="muted">Open challenges</span>
            <strong>{data.incomingChallenges.length + data.outgoingChallenges.length}</strong>
          </div>
          <div className="stat">
            <span className="muted">Registered friends</span>
            <strong>{data.users.length}</strong>
          </div>
        </div>

        {!data.databaseReady ? (
          <p className="notice">
            Neon is not connected yet. Add your <code>DATABASE_URL</code> to <code>.env.local</code> and the bets
            overview will start persisting data.
          </p>
        ) : null}

        <Show when="signed-out">
          <div className="inline-actions">
            <SignUpButton mode="modal">
              <button className="button" type="button">
                Sign up with Google or email
              </button>
            </SignUpButton>
            <SignInButton mode="modal">
              <button className="button secondary" type="button">
                Sign in to challenge someone
              </button>
            </SignInButton>
          </div>
        </Show>
      </section>

      <div className="grid grid-overview">
        <section className="panel">
          <div className="bet-row">
            <div>
              <h2>Accepted bets</h2>
              <p className="subtitle">Only your accepted challenges appear here.</p>
            </div>
            <span className="tag accepted">{data.acceptedBets.length} live</span>
          </div>

          <div className="card-list">
            {data.acceptedBets.length === 0 ? (
              <div className="empty">No accepted bets involving you yet. Accept a challenge or create one to get started.</div>
            ) : (
              data.acceptedBets.map((bet) => (
                <article className="bet-card" key={bet.id}>
                  <div className="bet-row">
                    <div className="bet-users">
                      {bet.challengerName} vs {bet.challengedName}
                    </div>
                    <div className="bet-amount">{currency(bet.stakeSek)}</div>
                  </div>
                  <h3 className="bet-title">{bet.title}</h3>
                  {bet.details ? <p className="subtitle">{bet.details}</p> : null}
                  <span className="tag accepted">Accepted {formatDate(bet.acceptedAt ?? bet.createdAt)}</span>
                </article>
              ))
            )}
          </div>

          <Show when="signed-in">
            <div style={{ marginTop: 18 }}>
              <NewBetModal databaseReady={data.databaseReady} users={data.users} />
            </div>
          </Show>
        </section>

        <aside className="grid" style={{ gap: 20 }}>
          <Show when="signed-in">
            {data.databaseReady && !data.currentUser?.nickname ? (
              <section className="panel">
                <h2>Choose your nickname</h2>
                <p className="subtitle">
                  Pick the name your friends should see on bets. Until you do, we use your Clerk profile name.
                </p>
                <NicknameForm currentValue={data.currentUser?.nickname} />
              </section>
            ) : null}

            <section className="panel">
              <h2>Pending challenges</h2>
              <div className="split">
                <div className="grid" style={{ gap: 12 }}>
                  <h3>Incoming</h3>
                  {data.incomingChallenges.length === 0 ? (
                    <div className="empty">Nothing waiting for your answer right now.</div>
                  ) : (
                    data.incomingChallenges.map((bet) => (
                      <article className="bet-card" key={bet.id}>
                        <div className="bet-row">
                          <div className="bet-users">{bet.challengerName}</div>
                          <div className="bet-amount">{currency(bet.stakeSek)}</div>
                        </div>
                        <h3 className="bet-title">{bet.title}</h3>
                        {bet.details ? <p className="subtitle">{bet.details}</p> : null}
                        <form action={acceptChallenge} className="inline-actions" style={{ marginTop: 14 }}>
                          <input name="betId" type="hidden" value={bet.id} />
                          <AcceptButton />
                        </form>
                      </article>
                    ))
                  )}
                </div>

                <div className="grid" style={{ gap: 12 }}>
                  <h3>Outgoing</h3>
                  {data.outgoingChallenges.length === 0 ? (
                    <div className="empty">Your sent challenges will show here until a friend accepts.</div>
                  ) : (
                    data.outgoingChallenges.map((bet) => (
                      <article className="bet-card" key={bet.id}>
                        <div className="bet-row">
                          <div className="bet-users">To {bet.challengedName}</div>
                          <div className="bet-amount">{currency(bet.stakeSek)}</div>
                        </div>
                        <h3 className="bet-title">{bet.title}</h3>
                        <span className="tag pending">Awaiting acceptance</span>
                      </article>
                    ))
                  )}
                </div>
              </div>
            </section>
          </Show>

          <Show when="signed-out">
            <section className="panel">
              <h2>How this works</h2>
              <div className="card-list">
                <div className="bet-card">
                  <strong>1. Sign in securely</strong>
                  <p className="subtitle">Use Google or create an account with Clerk so each bettor is verified.</p>
                </div>
                <div className="bet-card">
                  <strong>2. Challenge a friend</strong>
                  <p className="subtitle">Set the stake in SEK and define exactly what the bet is about.</p>
                </div>
                <div className="bet-card">
                  <strong>3. Wait for acceptance</strong>
                  <p className="subtitle">The bet only becomes visible in the shared overview after the other person accepts.</p>
                </div>
              </div>
            </section>
          </Show>
        </aside>
      </div>
    </main>
  );
}
