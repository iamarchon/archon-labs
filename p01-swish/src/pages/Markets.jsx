import { T } from "../tokens";
import Reveal from "../components/Reveal";
import StockSearch from "../components/StockSearch";

export default function Markets({ onTrade, watchlist, onWatch }) {
  return (
    <div style={{ maxWidth: "860px", margin: "0 auto", padding: "40px 28px 100px" }}>
      <Reveal>
        <div style={{ marginBottom: "28px" }}>
          <h1 style={{ fontSize: "32px", fontWeight: 700, letterSpacing: "-0.8px", color: T.ink }}>Markets</h1>
          <p style={{ color: T.inkSub, fontSize: "15px", marginTop: "5px" }}>
            Search any stock — 8,000+ US-listed companies
          </p>
        </div>
      </Reveal>
      <Reveal delay={0.08}>
        <StockSearch onTrade={onTrade} onWatch={onWatch} watchlist={watchlist} />
      </Reveal>
    </div>
  );
}
