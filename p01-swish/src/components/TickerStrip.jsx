import { T } from "../tokens";

const MARKET_HOLIDAYS_2026 = [
  { date: "2026-01-01", name: "New Year's Day" },
  { date: "2026-01-19", name: "MLK Day" },
  { date: "2026-02-16", name: "Presidents' Day" },
  { date: "2026-04-03", name: "Good Friday" },
  { date: "2026-05-25", name: "Memorial Day" },
  { date: "2026-07-03", name: "Independence Day" },
  { date: "2026-09-07", name: "Labor Day" },
  { date: "2026-11-26", name: "Thanksgiving" },
  { date: "2026-11-27", name: "Day after Thanksgiving" },
  { date: "2026-12-25", name: "Christmas Day" },
];

function getETNow() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
}

function getHoliday() {
  const et = getETNow();
  const today = `${et.getFullYear()}-${String(et.getMonth() + 1).padStart(2, "0")}-${String(et.getDate()).padStart(2, "0")}`;
  return MARKET_HOLIDAYS_2026.find(h => h.date === today) || null;
}

function isMarketOpen() {
  const et = getETNow();
  const day = et.getDay();
  if (day === 0 || day === 6) return false;
  const mins = et.getHours() * 60 + et.getMinutes();
  return mins >= 570 && mins < 960; // 9:30am – 4:00pm
}

function getNextOpenLabel() {
  const et = getETNow();
  const day = et.getDay();
  const mins = et.getHours() * 60 + et.getMinutes();

  // Weekday before market open
  if (day >= 1 && day <= 5 && mins < 570 && !getHoliday()) return "today";
  // Weekday after market close
  if (day >= 1 && day <= 5 && mins >= 960 && !getHoliday()) {
    // Check if tomorrow is a holiday or weekend
    if (day === 5) return "Monday";
    return "tomorrow";
  }
  // Weekend or holiday — find next trading day
  const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const d = new Date(et);
  for (let i = 1; i <= 7; i++) {
    d.setDate(d.getDate() + 1);
    const dDay = d.getDay();
    if (dDay === 0 || dDay === 6) continue;
    const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (MARKET_HOLIDAYS_2026.find(h => h.date === dStr)) continue;
    return names[dDay];
  }
  return "next trading day";
}

function getClosedMessage() {
  const holiday = getHoliday();
  const et = getETNow();
  const day = et.getDay();
  const nextOpen = getNextOpenLabel();
  const opensAt = `Opens ${nextOpen} at 9:30am ET`;

  if (holiday) return `Markets closed \u00B7 ${holiday.name} \u00B7 ${opensAt}`;
  if (day === 0 || day === 6) return `Markets closed \u00B7 ${opensAt}`;
  return `Markets closed \u00B7 ${opensAt}`;
}

export default function TickerStrip({ stocks }) {
  const open = isMarketOpen() && !getHoliday();

  if (!open) {
    return (
      <div style={{ height: "33px", display: "flex", alignItems: "center", justifyContent: "center", background: T.white, borderBottom: `1px solid ${T.line}` }}>
        <span style={{ color: T.inkFaint, fontSize: "12px", fontWeight: 500 }}>
          {getClosedMessage()}
        </span>
      </div>
    );
  }

  const doubled = [...stocks, ...stocks];
  return (
    <div style={{ overflow: "hidden", height: "33px", display: "flex", alignItems: "center", background: T.white, borderBottom: `1px solid ${T.line}` }}>
      <div style={{ display: "flex", gap: "48px", whiteSpace: "nowrap", animation: "ticker 84s linear infinite" }}>
        {doubled.map((s, i) => (
          <span key={i} style={{ display: "inline-flex", gap: "10px", alignItems: "center", fontSize: "11.5px" }}>
            <span style={{ color: T.inkFaint, fontWeight: 500 }}>{s.ticker}</span>
            <span style={{ color: T.ink, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>${(s.price ?? 0).toFixed(2)}</span>
            <span style={{ color: (s.changePct ?? 0) >= 0 ? T.green : T.red, fontWeight: 500 }}>
              {(s.changePct ?? 0) >= 0 ? "▲" : "▼"} {Math.abs(s.changePct ?? 0).toFixed(2)}%
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
