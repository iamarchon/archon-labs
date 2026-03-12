import { useState, useEffect, useRef } from "react";
import { T } from "../tokens";

const baseUrl = import.meta.env.DEV ? "http://localhost:3001" : "";

/* ── Animated score counter ── */
function AnimatedScore({ value, max }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.max(1, Math.ceil(value / 30));
    const id = setInterval(() => {
      start = Math.min(start + step, value);
      setDisplay(start);
      if (start >= value) clearInterval(id);
    }, 30);
    return () => clearInterval(id);
  }, [value]);
  return (
    <span style={{ fontVariantNumeric: "tabular-nums" }}>
      {display} / {max}
    </span>
  );
}

/* ── Points flash ── */
function PointsFlash({ points, visible }) {
  if (!visible) return null;
  const isPos = points > 0;
  return (
    <div style={{
      position: "fixed", top: "40%", left: "50%", transform: "translate(-50%,-50%)",
      fontSize: 48, fontWeight: 800, letterSpacing: "-2px",
      color: isPos ? T.green : points < 0 ? T.red : T.inkFaint,
      opacity: 0, animation: "pointsFlash 900ms ease forwards",
      pointerEvents: "none", zIndex: 10002,
      fontFamily: "DM Sans, sans-serif",
    }}>
      {isPos ? "+" : ""}{points} pts
    </div>
  );
}

/* ── Main player ── */
export default function ScenarioPlayer({ scenario, onClose, onComplete, dbUser }) {
  const [phase, setPhase] = useState("setup");       // setup | decision | consequence | results
  const [step, setStep] = useState(0);                // current decision index
  const [selected, setSelected] = useState(null);     // selected choice index
  const [score, setScore] = useState(0);
  const [showFlash, setShowFlash] = useState(false);
  const [flashPts, setFlashPts] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef(null);

  const decisions = scenario.decisions;
  const maxPoints = decisions.reduce((s, d) => s + Math.max(...d.choices.map(c => c.points)), 0);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const triggerTransition = (cb) => {
    setFadeIn(false);
    setTimeout(() => { cb(); setFadeIn(true); }, 220);
  };

  const handleChoice = (choiceIdx) => {
    if (selected !== null) return;
    setSelected(choiceIdx);
    const choice = decisions[step].choices[choiceIdx];
    const pts = choice.points;
    setScore(s => s + pts);
    setFlashPts(pts);
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 900);
    setPhase("consequence");
  };

  const handleNext = () => {
    const nextStep = step + 1;
    if (nextStep < decisions.length) {
      triggerTransition(() => {
        setStep(nextStep);
        setSelected(null);
        setPhase("decision");
      });
    } else {
      triggerTransition(() => setPhase("results"));
    }
  };

  const handleBegin = () => {
    triggerTransition(() => setPhase("decision"));
  };

  const handleFinish = async () => {
    if (saving) return;
    setSaving(true);
    const pct = maxPoints > 0 ? score / maxPoints : 0;
    const xpEarned = pct > 0.6 ? scenario.xp : Math.round(scenario.xp * 0.5);
    try {
      if (dbUser?.id) {
        await fetch(`${baseUrl}/api/scenarios/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: dbUser.id,
            scenarioId: scenario.id,
            score,
            maxScore: maxPoints,
            xpEarned,
          }),
        });
      }
    } catch { /* best effort */ }
    onComplete(scenario.id, score, maxPoints);
  };

  const choice = selected !== null ? decisions[step]?.choices[selected] : null;
  const pct = maxPoints > 0 ? score / maxPoints : 0;
  const xpEarned = pct > 0.6 ? scenario.xp : Math.round(scenario.xp * 0.5);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 10000,
      background: "rgba(0,0,0,0.55)",
      backdropFilter: "blur(12px) saturate(140%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "DM Sans, sans-serif",
    }}>
      {/* Inject keyframes */}
      <style>{`
        @keyframes pointsFlash {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.6); }
          30% { opacity: 1; transform: translate(-50%, -50%) scale(1.15); }
          70% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -70%) scale(0.95); }
        }
        @keyframes scenFadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <PointsFlash points={flashPts} visible={showFlash} />

      <div ref={scrollRef} style={{
        background: T.white, borderRadius: 24, width: "100%", maxWidth: 560,
        maxHeight: "90vh", overflowY: "auto", position: "relative",
        boxShadow: "0 24px 80px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.06)",
        opacity: fadeIn ? 1 : 0,
        transform: fadeIn ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 220ms ease, transform 220ms ease",
      }}>
        {/* Close button */}
        <button onClick={onClose} style={{
          position: "absolute", top: 16, right: 16, zIndex: 2,
          background: "none", border: "none", cursor: "pointer",
          fontSize: 20, color: T.inkFaint, lineHeight: 1,
          width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
          borderRadius: 8, transition: "background 150ms",
        }} onMouseEnter={e => e.target.style.background = T.bg}
           onMouseLeave={e => e.target.style.background = "none"}>
          ✕
        </button>

        {/* ── SETUP SCREEN ── */}
        {phase === "setup" && (
          <div style={{ padding: "52px 40px 40px", animation: "scenFadeIn 500ms ease" }}>
            <div style={{ fontSize: 56, textAlign: "center", marginBottom: 20 }}>{scenario.emoji}</div>
            <h2 style={{
              fontSize: 28, fontWeight: 700, color: T.ink, textAlign: "center",
              letterSpacing: "-0.8px", margin: "0 0 8px",
            }}>{scenario.title}</h2>
            <div style={{
              display: "flex", justifyContent: "center", gap: 12, marginBottom: 24,
            }}>
              <span style={{
                fontSize: 11, fontWeight: 600, color: T.inkFaint,
                textTransform: "uppercase", letterSpacing: "0.05em",
              }}>{scenario.difficulty}</span>
              <span style={{ color: T.line }}>·</span>
              <span style={{
                fontSize: 11, fontWeight: 600, color: T.accent,
                textTransform: "uppercase", letterSpacing: "0.05em",
              }}>+{scenario.xp} XP</span>
            </div>
            <p style={{
              fontSize: 16, lineHeight: 1.7, color: T.inkMid, textAlign: "center",
              margin: "0 auto 36px", maxWidth: 440,
            }}>{scenario.setup}</p>
            <button onClick={handleBegin} style={{
              display: "block", margin: "0 auto", padding: "14px 48px",
              background: T.accent, color: T.white, border: "none",
              borderRadius: 14, fontSize: 16, fontWeight: 600,
              cursor: "pointer", transition: "opacity 150ms",
              fontFamily: "DM Sans, sans-serif",
            }} onMouseEnter={e => e.target.style.opacity = 0.88}
               onMouseLeave={e => e.target.style.opacity = 1}>
              Begin
            </button>
          </div>
        )}

        {/* ── DECISION / CONSEQUENCE SCREEN ── */}
        {(phase === "decision" || phase === "consequence") && (
          <div style={{ padding: "40px 36px 36px", animation: "scenFadeIn 400ms ease" }}>
            {/* Progress dots */}
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 28 }}>
              {decisions.map((_, i) => (
                <div key={i} style={{
                  width: i === step ? 24 : 8, height: 8, borderRadius: 4,
                  background: i < step ? T.green : i === step ? T.accent : T.line,
                  transition: "all 300ms ease",
                }} />
              ))}
            </div>

            <div style={{
              fontSize: 11, fontWeight: 600, color: T.inkFaint,
              textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12,
            }}>Decision {step + 1} of {decisions.length}</div>

            <p style={{
              fontSize: 16, lineHeight: 1.7, color: T.ink, marginBottom: 28,
              fontWeight: 500,
            }}>{decisions[step].situation}</p>

            {/* Reveal text (for compound interest penny reveal) */}
            {phase === "consequence" && decisions[step].reveal && (
              <div style={{
                background: "#fffbe6", border: "1px solid #f5d050",
                borderRadius: 12, padding: "16px 20px", marginBottom: 20,
                fontSize: 14, lineHeight: 1.6, color: T.inkMid, fontWeight: 500,
              }}>
                {decisions[step].reveal}
              </div>
            )}

            {/* Choices */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
              {decisions[step].choices.map((c, ci) => {
                const isSelected = selected === ci;
                const isRevealed = selected !== null;
                const isBest = c.best && isRevealed;
                const isWrong = isRevealed && isSelected && !c.best;

                let bg = T.white;
                let border = `1px solid ${T.line}`;
                if (isBest) { bg = T.greenBg; border = `1.5px solid ${T.green}40`; }
                else if (isWrong) { bg = T.redBg; border = `1.5px solid ${T.red}30`; }
                else if (isSelected) { bg = T.bg; }

                return (
                  <button key={ci} onClick={() => handleChoice(ci)} disabled={isRevealed} style={{
                    display: "flex", alignItems: "flex-start", gap: 14,
                    padding: "16px 20px", borderRadius: 14, background: bg,
                    border, cursor: isRevealed ? "default" : "pointer",
                    textAlign: "left", transition: "all 200ms ease",
                    opacity: isRevealed && !isSelected && !isBest ? 0.5 : 1,
                    fontFamily: "DM Sans, sans-serif",
                    transform: isSelected && !isRevealed ? "scale(0.98)" : "scale(1)",
                  }}>
                    <span style={{
                      flexShrink: 0, width: 28, height: 28, borderRadius: 8,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, fontWeight: 700,
                      background: isBest ? `${T.green}18` : isWrong ? `${T.red}15` : T.bg,
                      color: isBest ? T.green : isWrong ? T.red : T.inkMid,
                    }}>{c.label}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: 14, fontWeight: 600, color: T.ink, marginBottom: 2,
                        lineHeight: 1.4,
                      }}>{c.text}</div>
                      {isRevealed && (isSelected || isBest) && (
                        <div style={{
                          fontSize: 13, color: isBest ? T.green : T.inkSub,
                          lineHeight: 1.55, marginTop: 6,
                          animation: "scenFadeIn 350ms ease",
                        }}>
                          {c.consequence}
                          <span style={{
                            display: "inline-block", marginLeft: 8,
                            fontWeight: 700, fontSize: 12,
                            color: c.points > 0 ? T.green : c.points < 0 ? T.red : T.inkFaint,
                          }}>
                            {c.points > 0 ? "+" : ""}{c.points} pts
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Next button */}
            {phase === "consequence" && (
              <div style={{ display: "flex", justifyContent: "flex-end", animation: "scenFadeIn 300ms ease" }}>
                <button onClick={handleNext} style={{
                  padding: "12px 36px", background: T.accent, color: T.white,
                  border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600,
                  cursor: "pointer", transition: "opacity 150ms",
                  fontFamily: "DM Sans, sans-serif",
                }} onMouseEnter={e => e.target.style.opacity = 0.88}
                   onMouseLeave={e => e.target.style.opacity = 1}>
                  {step + 1 < decisions.length ? "Next" : "See Results"}
                </button>
              </div>
            )}

            {/* Running score */}
            <div style={{
              marginTop: 16, paddingTop: 14, borderTop: `1px solid ${T.line}`,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span style={{ fontSize: 12, color: T.inkFaint, fontWeight: 500 }}>Score</span>
              <span style={{
                fontSize: 14, fontWeight: 700, color: T.ink,
                fontVariantNumeric: "tabular-nums",
              }}>{score} pts</span>
            </div>
          </div>
        )}

        {/* ── RESULTS SCREEN ── */}
        {phase === "results" && (
          <div style={{ padding: "48px 40px 40px", animation: "scenFadeIn 500ms ease" }}>
            <div style={{ fontSize: 48, textAlign: "center", marginBottom: 16 }}>
              {pct >= 0.8 ? "\u{1F3C6}" : pct >= 0.5 ? "\u{1F4AA}" : "\u{1F4DA}"}
            </div>
            <h2 style={{
              fontSize: 26, fontWeight: 700, color: T.ink, textAlign: "center",
              letterSpacing: "-0.6px", margin: "0 0 6px",
            }}>
              {pct >= 0.8 ? "Excellent!" : pct >= 0.5 ? "Good Job!" : "Keep Learning!"}
            </h2>
            <p style={{ fontSize: 14, color: T.inkSub, textAlign: "center", marginBottom: 28 }}>
              {scenario.title} — Complete
            </p>

            {/* Score card */}
            <div style={{
              background: T.bg, borderRadius: 16, padding: "24px 28px",
              marginBottom: 24, textAlign: "center",
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.inkFaint, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                Your Score
              </div>
              <div style={{ fontSize: 36, fontWeight: 800, color: T.ink, letterSpacing: "-1.5px" }}>
                <AnimatedScore value={Math.max(0, score)} max={maxPoints} />
              </div>
              <div style={{
                fontSize: 13, fontWeight: 600, marginTop: 8,
                color: pct > 0.6 ? T.green : T.amber,
              }}>
                +{xpEarned} XP earned
                {pct <= 0.6 && <span style={{ color: T.inkFaint, fontWeight: 400 }}> (half — score above 60% for full XP)</span>}
              </div>
            </div>

            {/* Lesson */}
            <div style={{
              background: T.white, border: `1px solid ${T.line}`,
              borderRadius: 14, padding: "20px 24px", marginBottom: 16,
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.accent, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                What you learned
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.65, color: T.inkMid, margin: 0 }}>
                {scenario.resultLesson}
              </p>
            </div>

            {/* Memorable fact */}
            <div style={{
              background: "#fffbe6", border: "1px solid #f5d050",
              borderRadius: 14, padding: "20px 24px", marginBottom: 32,
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.amber, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                Did you know?
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.65, color: T.inkMid, margin: 0, fontWeight: 500 }}>
                {scenario.resultFact}
              </p>
            </div>

            {/* Final boss badge */}
            {scenario.isFinalBoss && pct >= 0.6 && (
              <div style={{
                textAlign: "center", marginBottom: 24,
                padding: "20px", background: "linear-gradient(135deg, #f3edff 0%, #e8f4fd 100%)",
                borderRadius: 14,
              }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>{"\u{1F4BC}"}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#7c3aed", letterSpacing: "-0.3px" }}>
                  Financial Mastermind
                </div>
                <div style={{ fontSize: 12, color: T.inkSub, marginTop: 4 }}>
                  You completed all 8 scenarios. You're ahead of 90% of adults.
                </div>
              </div>
            )}

            <button onClick={handleFinish} disabled={saving} style={{
              display: "block", width: "100%", padding: "15px",
              background: T.accent, color: T.white, border: "none",
              borderRadius: 14, fontSize: 16, fontWeight: 600,
              cursor: saving ? "default" : "pointer",
              opacity: saving ? 0.7 : 1,
              transition: "opacity 150ms",
              fontFamily: "DM Sans, sans-serif",
            }} onMouseEnter={e => { if (!saving) e.target.style.opacity = 0.88; }}
               onMouseLeave={e => e.target.style.opacity = saving ? 0.7 : 1}>
              {saving ? "Saving..." : "Back to Scenarios"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
