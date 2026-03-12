import { useState, useEffect, useCallback } from "react";
import { T } from "../tokens";
import Card from "../components/Card";
import Reveal from "../components/Reveal";
import ProgressBar from "../components/ProgressBar";

const baseUrl = import.meta.env.DEV ? "http://localhost:3001" : "";

const SCENARIOS = [
  { id: "first_paycheck", title: "First Paycheck", description: "You just got your first paycheck — $500. How do you invest it?", difficulty: "Beginner", xpReward: 50, icon: "\u{1F4B0}" },
  { id: "hot_tip", title: "Hot Tip", description: "Your friend says a stock is about to 'moon.' Do you go all in?", difficulty: "Beginner", xpReward: 75, icon: "\u{1F525}" },
  { id: "compound_interest", title: "The Power of Compounding", description: "See how $100/month grows over 30 years with compound interest.", difficulty: "Beginner", xpReward: 60, icon: "\u{1F4C8}" },
  { id: "diversification", title: "Don't Put All Eggs in One Basket", description: "Compare a diversified portfolio vs putting everything in one stock.", difficulty: "Intermediate", xpReward: 100, icon: "\u{1F95A}" },
  { id: "market_crash_2008", title: "Market Crash of 2008", description: "Experience the 2008 financial crisis. Would you sell, hold, or buy more?", difficulty: "Intermediate", xpReward: 125, icon: "\u{1F4C9}" },
  { id: "inflation", title: "Inflation Buster", description: "Your savings lose 3% per year to inflation. How do you fight back?", difficulty: "Intermediate", xpReward: 100, icon: "\u{1F388}" },
  { id: "ipo_frenzy", title: "IPO Frenzy", description: "A hot new company is going public. Buy on day one or wait?", difficulty: "Advanced", xpReward: 150, icon: "\u{1F680}" },
  { id: "side_hustle", title: "Side Hustle Portfolio", description: "You have $10,000 from a side hustle. Build the perfect portfolio.", difficulty: "Advanced", xpReward: 200, icon: "\u{1F3AF}" },
];

const SCENARIO_UNLOCKS = {
  first_paycheck: { type: "always" },
  hot_tip: { type: "scenario", requires: ["first_paycheck"], hint: "Complete 'First Paycheck' scenario" },
  compound_interest: { type: "or", conditions: [{ type: "lesson", lessonId: 1 }, { type: "scenario", requires: ["first_paycheck"] }], hint: "Complete 'What is a Stock?' lesson or 'First Paycheck' scenario" },
  diversification: { type: "and", conditions: [{ type: "lesson", lessonId: 4 }, { type: "scenario", requires: ["hot_tip"] }], hint: "Complete 'What is Diversification?' lesson and 'Hot Tip' scenario" },
  market_crash_2008: { type: "and", conditions: [{ type: "lesson", lessonId: 16 }, { type: "lesson", lessonId: 9 }, { type: "scenario", requires: ["diversification"] }], hint: "Complete 'Bull vs Bear Markets' + 'What is an ETF?' lessons and 'Diversification' scenario" },
  inflation: { type: "and", conditions: [{ type: "lesson", lessonId: 19 }, { type: "scenario", requires: ["market_crash_2008"] }], hint: "Complete 'Understanding Bonds' lesson and 'Market Crash of 2008' scenario" },
  ipo_frenzy: { type: "and", conditions: [{ type: "lesson", lessonId: 11 }, { type: "lesson", lessonId: 18 }, { type: "scenario", requires: ["inflation"] }], hint: "Complete 'Reading Earnings Reports' + 'What is Crypto?' lessons and 'Inflation Buster' scenario" },
  side_hustle: { type: "and", conditions: [{ type: "allScenarios" }, { type: "lesson", lessonId: 20 }], hint: "Complete all other scenarios and 'Building Your First Portfolio' lesson" },
};

const DIFF_COLORS = { Beginner: T.green, Intermediate: T.accent, Advanced: "#8b5cf6" };
const DIFF_BGS = { Beginner: T.greenBg, Intermediate: "#e8f4fd", Advanced: "#f3edff" };

function checkCondition(cond, completedScenarios, completedLessons) {
  if (cond.type === "always") return true;
  if (cond.type === "scenario") return cond.requires.every(s => completedScenarios.has(s));
  if (cond.type === "lesson") return completedLessons.has(cond.lessonId);
  if (cond.type === "allScenarios") return SCENARIOS.filter(s => s.id !== "side_hustle").every(s => completedScenarios.has(s.id));
  if (cond.type === "and") return cond.conditions.every(c => checkCondition(c, completedScenarios, completedLessons));
  if (cond.type === "or") return cond.conditions.some(c => checkCondition(c, completedScenarios, completedLessons));
  return false;
}

export default function Scenarios({ dbUser, onClaimXp, fireConfetti }) {
  const [completedScenarios, setCompletedScenarios] = useState(new Set());
  const [completedLessons, setCompletedLessons] = useState(new Set());
  const [loading, setLoading] = useState(true);

  const fetchProgress = useCallback(async () => {
    if (!dbUser?.id) { setLoading(false); return; }
    try {
      const res = await fetch(`${baseUrl}/api/lessons/progress?userId=${dbUser.id}`);
      if (res.ok) {
        const data = await res.json();
        const ids = (data.completedLessons || []).map(l => typeof l === "object" ? l.lessonId : l);
        setCompletedLessons(new Set(ids));
      }
    } catch { /* graceful fallback */ }
    setLoading(false);
  }, [dbUser?.id]);

  useEffect(() => { fetchProgress(); }, [fetchProgress]);

  const doneCount = completedScenarios.size;

  const handleStart = (scenario) => {
    alert(`Scenario "${scenario.title}" coming soon! This will be an interactive investment simulation.`);
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 28px 100px" }}>
      <Reveal>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-1.2px", color: T.ink, margin: 0 }}>Scenarios</h1>
          <p style={{ color: T.inkSub, fontSize: 15, marginTop: 6, marginBottom: 0 }}>Test your investing instincts with real-world simulations</p>
        </div>
      </Reveal>

      <Reveal delay={0.04}>
        <Card style={{ padding: "20px 28px", marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: T.inkMid }}>Scenario Progress</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.accent, fontVariantNumeric: "tabular-nums" }}>{doneCount} / {SCENARIOS.length}</span>
          </div>
          <ProgressBar value={(doneCount / SCENARIOS.length) * 100} color={T.accent} height={7} />
        </Card>
      </Reveal>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: T.inkFaint, fontSize: 14 }}>Loading scenarios...</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {SCENARIOS.map((sc, i) => {
            const unlock = SCENARIO_UNLOCKS[sc.id];
            const unlocked = checkCondition(unlock, completedScenarios, completedLessons);
            const done = completedScenarios.has(sc.id);
            const diffColor = DIFF_COLORS[sc.difficulty];
            const diffBg = DIFF_BGS[sc.difficulty];

            return (
              <Reveal key={sc.id} delay={0.04 + i * 0.03}>
                <Card
                  style={{ padding: "24px 28px", height: "100%", opacity: unlocked ? 1 : 0.55 }}
                  hover={unlocked && !done}
                  onClick={unlocked && !done ? () => handleStart(sc) : undefined}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <span style={{ fontSize: 28 }}>{sc.icon}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: diffBg, color: diffColor, textTransform: "uppercase", letterSpacing: "0.04em" }}>{sc.difficulty}</span>
                  </div>

                  <div style={{ fontSize: 17, fontWeight: 700, color: T.ink, letterSpacing: "-0.4px", marginBottom: 4 }}>{sc.title}</div>
                  <div style={{ fontSize: 13, color: T.inkSub, marginBottom: 16, lineHeight: 1.5 }}>{sc.description}</div>

                  {!unlocked && unlock.hint && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: T.inkFaint, marginBottom: 14 }}>
                      <span style={{ fontSize: 13 }}>&#128274;</span>
                      <span>{unlock.hint}</span>
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    {done ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ color: T.green, fontSize: 14 }}>&#10003;</span>
                        <span style={{ color: T.green, fontSize: 12, fontWeight: 600 }}>Completed</span>
                      </div>
                    ) : unlocked ? (
                      <span style={{ fontSize: 12, fontWeight: 600, color: T.accent }}>Start</span>
                    ) : (
                      <span style={{ fontSize: 12, fontWeight: 600, color: T.ghost }}>Locked</span>
                    )}
                    <div style={{ fontSize: 12, fontWeight: 600, color: diffColor, background: `${diffColor}12`, padding: "4px 10px", borderRadius: 6 }}>
                      +{sc.xpReward} XP
                    </div>
                  </div>
                </Card>
              </Reveal>
            );
          })}
        </div>
      )}
    </div>
  );
}
