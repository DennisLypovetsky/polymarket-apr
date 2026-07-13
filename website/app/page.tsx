import { CHROME_URL, GITHUB_URL } from "./site-content";

type PolymarketCardProps = {
  apr: number;
  days: number;
  price: number;
  trade?: boolean;
};

function PolymarketCard({
  apr,
  days,
  price,
  trade = false,
}: PolymarketCardProps) {
  return (
    <article className={`pm-card${trade ? " trading" : ""}`}>
      <div className="pm-top">
        <div className="pm-tabs">
          <span className="pm-tab active">Buy</span>
          <span className="pm-tab">Sell</span>
        </div>
        <div className="pm-mode">
          Limit<span aria-hidden="true" className="chevron" />
        </div>
      </div>
      <div className="pm-divider" />
      <div className="pm-outcomes">
        <div className="pm-outcome yes">
          Yes <strong>{price.toFixed(1)}¢</strong>
        </div>
        <div className="pm-outcome no">
          No <strong>{(100 - price).toFixed(1)}¢</strong>
        </div>
      </div>
      <div className="pm-apr">
        <span>Est. APR</span>
        <span className="apr-value">{apr}%</span>
        <span className="days">{days}D</span>
      </div>
      {trade ? <div className="trade-button">Trade</div> : null}
    </article>
  );
}

export default function Home() {
  return (
    <main>
      <nav className="nav" aria-label="Primary">
        <div className="brand">
          <img src="/icon.png" alt="" />
          Polymarket APR
        </div>
        <a className="github" href={GITHUB_URL}>
          GitHub ↗
        </a>
      </nav>

      <section className="screen" aria-label="Install Polymarket APR">
        <div className="copy">
          <h1>
            <strong>compare</strong>
            <span>markets</span>
            <small>by estimated APR</small>
          </h1>
          <a className="chrome" href={CHROME_URL}>
            Add to Chrome
          </a>
        </div>
        <div className="shot-wrap">
          <img
            className="shot"
            src="/screenshot.png"
            alt="Polymarket APR shown inside the Polymarket trade panel"
          />
        </div>
      </section>

      <section className="screen" aria-label="Compare similar markets">
        <div className="copy compact">
          <h1>
            <strong>same price</strong>
            <span>different return</span>
          </h1>
        </div>
        <div
          className="ticket-stack"
          aria-label="Two similar Polymarket positions"
        >
          <PolymarketCard price={97.4} apr={57} days={17} />
          <PolymarketCard price={97.4} apr={31} days={31} />
        </div>
      </section>

      <section className="screen" aria-label="Compare Polymarket with DeFi">
        <div className="copy compact">
          <h1>
            <strong>compare</strong>
            <span>Polymarket</span>
            <small>with DeFi</small>
          </h1>
        </div>
        <div
          className="comparison-panels"
          aria-label="Stablecoin vault and Polymarket comparison"
        >
          <article className="vault-card">
            <div className="vault-head">
              <div className="coin">$</div>
              <div className="vault-title">
                <strong>USDC vault</strong>
                <span>stablecoin yield</span>
              </div>
            </div>
            <div className="vault-body">
              <div className="vault-label">Supply APR</div>
              <div className="vault-rate">
                9.7% <span>APR</span>
              </div>
              <div className="deposit">Deposit USDC</div>
            </div>
          </article>
          <PolymarketCard price={96.3} apr={17} days={83} trade />
        </div>
      </section>

      <section
        className="screen final-screen"
        aria-label="Add Polymarket APR to Chrome"
      >
        <div className="final-content">
          <h1>
            <strong>just APR</strong>
            <span>nothing else</span>
          </h1>
          <div className="final-apr">
            <span>Est. APR</span>
            <span className="apr-value">53%</span>
            <span className="days">7D</span>
          </div>
          <a className="chrome" href={CHROME_URL}>
            Add to Chrome
          </a>
        </div>
      </section>
    </main>
  );
}
