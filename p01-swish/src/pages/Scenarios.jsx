import { useState, useEffect, useCallback } from "react";
import { T } from "../tokens";
import Card from "../components/Card";
import Reveal from "../components/Reveal";
import ProgressBar from "../components/ProgressBar";
import ScenarioPlayer from "../components/ScenarioPlayer";
import { SCENARIO_DATA } from "../data/scenarios";

const baseUrl = import.meta.env.DEV ? "http://localhost:3001" : "";

const SCENARIOS = SCENARIO_DATA.map(s => ({
  id: s.id, title: s.title, icon: s.emoji,
  description: s.setup.slice(0, 90) + "...",
  difficulty: s.difficulty, xpReward: s.xp,
}));

const SCENARIO_UNLOCKS = {
  first_paycheck: { type: "always" },
  hot_tip: { type: "scenario", requires: ["first_paycheck"], hint: "Complete 'First Paycheck' scenario" },
  compound_interest: { type: "or", conditions: [{ type: "lesson", lessonId: 1 }, { type: "scenario", requires: ["first_paycheck"] }], hint: "Complete 'What is a Stock?' lesson or 'First Paycheck' scenario" },
  diversification: { type: "and", conditions: [{ type: "lesson", lessonId: 4 }, { type: "scenario", requires: ["hot_tip"] }], hint: "Complete 'What is Diversification?' lesson and 'Hot Tip' scenario" },
  market_crash_2008: { type: "and", conditions: [{ type: "lesson", lessonId: 16 }, { type: "lesson", lessonId: 9 }, { type: "scenario", requires: ["diversification"] }], hint: "Complete 'Bull vs Bear Markets' + 'What is an ETF?' lessons and 'Diversification' scenario" },
  inflation: { type: "and", conditions: [{ type: "lesson", lessonId: 19 }, { type: "scenario", requires: ["market_crash_2008"] }], hint: "Complete 'Understanding Bonds' lesson and 'Market Crash of 2008' scenario" },
  ipo_frenzy: { type: "and", conditions: [{ type: "lesson", lessonId: 11 }, { type: "lesson", lessonId: 18 }, { type: "scenario", requires: ["inflation"] }], hint: "Complete 'Reading Earnings Reports' + 'What is Crypto?' lessons and 'Inflation Buster' scenario" },
  side_hustle: { type: "and", conditions: [{ type: "allScenarios" }, { type: "lesson", lessonId: 20 }], hint: "Complete all other scenarios and 'Building Your First Portfolio' lesson" },
  steady_saver: { type: "always" },
};

const DIFF_COLORS = { Beginner: T.green, Easy: T.green, Intermediate: T.accent, Medium: T.accent, Advanced: "#8b5cf6" };
const DIFF_BGS = { Beginner: T.greenBg, Easy: T.greenBg, Intermediate: "#e8f4fd", Medium: "#e8f4fd", Advanced: "#f3edff" };

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
  const [activeScenario, setActiveScenario] = useState(null);

  const fetchProgress = useCallback(async () => {
    if (!dbUser?.id) { setLoading(false); return; }
    try {
      const [lessonRes, scenarioRes] = await Promise.all([
        fetch(`${baseUrl}/api/lessons/progress?userId=${dbUser.id}`),
        fetch(`${baseUrl}/api/scenarios/progress?userId=${dbUser.id}`),
      ]);
      if (lessonRes.ok) {
        const data = await lessonRes.json();
        const ids = (data.completions || data.completedLessons || []).map(l => typeof l === "object" ? (l.lesson_id ?? l.lessonId) : l);
        setCompletedLessons(new Set(ids));
      }
      if (scenarioRes.ok) {
        const data = await scenarioRes.json();
        const ids = (data.completions || []).map(c => c.scenario_id);
        setCompletedScenarios(new Set(ids));
      }
    } catch { /* graceful fallback */ }
    setLoading(false);
  }, [dbUser?.id]);

  useEffect(() => { fetchProgress(); }, [fetchProgress]);

  const doneCount = completedScenarios.size;

  const handleStart = (sc) => {
    const full = SCENARIO_DATA.find(s => s.id === sc.id);
    if (full) setActiveScenario(full);
  };

  const handleComplete = (scenarioId) => {
    setCompletedScenarios(prev => new Set([...prev, scenarioId]));
    setActiveScenario(null);
    if (onClaimXp) onClaimXp();
    if (fireConfetti) fireConfetti();
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
            const diffColor = DIFF_COLORS[sc.difficulty] || T.accent;
            const diffBg = DIFF_BGS[sc.difficulty] || "#e8f4fd";

            return (
              <Reveal key={sc.id} delay={0.04 + i * 0.03}>
                <Card
                  style={{ padding: "24px 28px", height: "100%", opacity: unlocked ? 1 : 0.55 }}
                  hover={unlocked}
                  onClick={unlocked ? () => (done ? handleStart(sc) : handleStart(sc)) : undefined}
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
                        <span style={{ color: T.inkFaint, fontSize: 11, marginLeft: 4 }}>· Replay</span>
                      </div>
                    ) : unlocked ? (
                      <span style={{ fontSize: 12, fontWeight: 600, color: T.accent }}>Start &rarr;</span>
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

      {activeScenario && (
        <ScenarioPlayer
          scenario={activeScenario}
          dbUser={dbUser}
          onClose={() => setActiveScenario(null)}
          onComplete={handleComplete}
        />
      )}
    </div>
  );
}
