import { useState } from "react";
import { T } from "../tokens";

const STEPS = [
  {
    title: "Welcome to Swish!",
    body: "You start with $10,000 in virtual cash. Use it to buy and sell real stocks — no real money involved.",
    icon: "👋",
  },
  {
    title: "Your AI Coach Has Your Back",
    body: "Swish is powered by AI. Get plain-English news summaries, a personal coach to answer any money question, smart insights, and Auto-Invest plans that invest for you on a schedule.",
    icon: "🤖",
  },
  {
    title: "Make Your First Trade",
    body: "Head to Markets, pick a stock you know, and buy a few shares. You'll earn +100 XP for your first trade!",
    icon: "📈",
  },
  {
    title: "Level Up & Compete",
    body: "Complete challenges, finish lessons, and climb the leaderboard. Join a league to compete with friends.",
    icon: "🏆",
  },
];

export default function TutorialOverlay({ onDone }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      localStorage.setItem("swish_tutorial_done", "1");
      onDone();
    } else {
      setStep(step + 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem("swish_tutorial_done", "1");
    onDone();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 300,
      background: "rgba(0,0,0,.45)",
      backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      animation: "fadeIn .2s ease",
    }}>
      <div style={{
        background: T.white, borderRadius: "24px", padding: "48px 40px 36px",
        width: "420px", maxWidth: "90vw", textAlign: "center",
        boxShadow: "0 40px 80px rgba(0,0,0,.18)",
        animation: "sheetUp .3s cubic-bezier(.34,1.56,.64,1)",
      }}>
        <div style={{ fontSize: "48px", marginBottom: "20px" }}>{current.icon}</div>
        <h2 style={{ fontSize: "24px", fontWeight: 700, letterSpacing: "-0.6px", color: T.ink, marginBottom: "12px" }}>
          {current.title}
        </h2>
        <p style={{ color: T.inkSub, fontSize: "15px", lineHeight: 1.6, marginBottom: "32px" }}>
          {current.body}
        </p>

        {/* Step dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginBottom: "24px" }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              width: i === step ? "20px" : "6px", height: "6px",
              borderRadius: "3px",
              background: i === step ? T.accent : T.ghost,
              transition: "all .2s ease",
            }} />
          ))}
        </div>

        <button onClick={handleNext} style={{
          width: "100%", padding: "14px", borderRadius: "12px", border: "none",
          cursor: "pointer", background: T.accent, color: T.white,
          fontWeight: 600, fontSize: "15px", transition: "opacity .15s",
          marginBottom: "12px",
        }}
          onMouseEnter={e => e.currentTarget.style.opacity = ".88"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
        >
          {isLast ? "Let's go!" : "Next"}
        </button>

        {!isLast && (
          <button onClick={handleSkip} style={{
            background: "none", border: "none", cursor: "pointer",
            color: T.inkFaint, fontSize: "13px", fontWeight: 500,
          }}>Skip tutorial</button>
        )}
      </div>
    </div>
  );
}
