import { getHangBetsData } from "@/lib/bets";

function currency(value: number) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) {
    return "Leader";
  }

  return new Intl.DateTimeFormat("sv-SE", {
    dateStyle: "medium"
  }).format(new Date(value));
}

export default async function HangBetsPage() {
  const data = await getHangBetsData();

  return (
    <main className="grid" style={{ gap: 24 }}>
      <section className="hero">
        <div className="grid" style={{ gap: 14 }}>
          <span className="eyebrow">Häng bets</span>
          <h1 className="title">Every bet across the whole group.</h1>
          <p className="subtitle" style={{ maxWidth: 760, fontSize: "1.05rem" }}>
            This page shows the accepted bets for everyone in the häng, with winner information kept visible for when
            bets start getting settled.
          </p>
        </div>
      </section>

      <section className="panel">
        <div className="bet-row">
          <div>
            <h2>All bets</h2>
            <p className="subtitle">Accepted bets for every user.</p>
          </div>
          <span className="tag">{data.bets.length} total</span>
        </div>

        {!data.databaseReady ? (
          <div className="empty">Connect Neon first to load the shared häng table.</div>
        ) : data.bets.length === 0 ? (
          <div className="empty">No bets have been created yet.</div>
        ) : (
          <div className="grid" style={{ gap: 18, marginTop: 18 }}>
            <div className="table-wrap desktop-only">
              <table className="bets-table">
                <thead>
                  <tr>
                    <th>Bet</th>
                    <th>Between</th>
                    <th>Stake</th>
                    <th>Winner</th>
                    <th>Leader</th>
                  </tr>
                </thead>
                <tbody>
                  {data.bets.map((bet) => (
                    <tr key={bet.id}>
                      <td>{bet.title}</td>
                      <td>
                        {bet.challengerName} vs {bet.challengedName}
                      </td>
                      <td>{currency(bet.stakeSek)}</td>
                      <td>{bet.winnerName ?? "Not decided"}</td>
                      <td>{formatDate(bet.settledAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mobile-bet-list mobile-only">
              {data.bets.map((bet) => (
                <article className="mobile-bet-card" key={bet.id}>
                  <div className="bet-row">
                    <div>
                      <div className="bet-users">
                        {bet.challengerName} vs {bet.challengedName}
                      </div>
                      <h3 className="bet-title">{bet.title}</h3>
                    </div>
                    <div className="bet-amount">{currency(bet.stakeSek)}</div>
                  </div>

                  <div className="mobile-bet-meta">
                    <div className="mobile-bet-item">
                      <span className="mobile-bet-label">Winner</span>
                      <span>{bet.winnerName ?? "Not decided"}</span>
                    </div>
                    <div className="mobile-bet-item">
                      <span className="mobile-bet-label">Leader</span>
                      <span>{formatDate(bet.settledAt)}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Leader</h2>
        <div className="empty">Leader</div>
      </section>
    </main>
  );
}
