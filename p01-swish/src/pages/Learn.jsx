import { useState, useEffect, useCallback } from "react";
import { T } from "../tokens";
import { LESSONS } from "../data/lessons";
import Reveal from "../components/Reveal";
import Card from "../components/Card";
import ProgressBar from "../components/ProgressBar";
import Quiz from "../components/Quiz";

const baseUrl = import.meta.env.DEV ? "http://localhost:3001" : "";

const CAT_COLORS = { Beginner: T.green, Intermediate: T.accent, Advanced: "#8b5cf6" };
const CATS = ["All", "Beginner", "Intermediate", "Advanced"];

export default function Learn({ dbUser, refreshUser, fireConfetti }) {
  const [completions, setCompletions] = useState([]);
  const [category, setCategory] = useState("All");
  const [activeLesson, setActiveLesson] = useState(null);
  const [quizMode, setQuizMode] = useState(false);
  const [quizResult, setQuizResult] = useState(null);

  const fetchProgress = useCallback(async () => {
    if (!dbUser?.id) return;
    try {
      const res = await fetch(`${baseUrl}/api/lessons/progress?userId=${dbUser.id}`);
      const data = await res.json();
      setCompletions(data.completions || []);
    } catch { /* ignore */ }
  }, [dbUser?.id]);

  useEffect(() => { fetchProgress(); }, [fetchProgress]);

  const completedIds = new Set(completions.map(c => c.lesson_id));
  const filtered = category === "All" ? LESSONS : LESSONS.filter(l => l.category === category);
  const completedCount = completions.length;
  const xpToLevel = (dbUser?.xp ?? 0);
  const userLevel = xpToLevel >= 2000 ? "Legend" : xpToLevel >= 750 ? "Platinum" : xpToLevel >= 300 ? "Gold" : xpToLevel >= 100 ? "Silver" : "Bronze";

  const handleQuizComplete = async (score) => {
    const passed = score >= 2;
    setQuizResult({ score, total: activeLesson.quiz.length, passed });

    if (passed && dbUser?.id && !completedIds.has(activeLesson.id)) {
      try {
        await fetch(`${baseUrl}/api/lessons/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: dbUser.id, lessonId: activeLesson.id, score }),
        });
        if (fireConfetti) fireConfetti("trade");
        if (refreshUser) await refreshUser();
        await fetchProgress();
      } catch { /* ignore */ }
    }
  };

  // Lesson detail view
  if (activeLesson) {
    const isCompleted = completedIds.has(activeLesson.id);
    const catColor = CAT_COLORS[activeLesson.category];

    if (quizResult) {
      return (
        <div style={{ maxWidth: "640px", margin: "0 auto", padding: "40px 28px 100px" }}>
          <Card hover={false} style={{ padding: "48px 40px", textAlign: "center" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>{quizResult.passed ? "\uD83C\uDF89" : "\uD83D\uDCDA"}</div>
            <div style={{ fontSize: "28px", fontWeight: 700, letterSpacing: "-0.8px", color: T.ink, marginBottom: "8px" }}>
              {quizResult.passed ? "Great job!" : "Keep learning!"}
            </div>
            <div style={{ fontSize: "18px", color: T.inkSub, marginBottom: "24px" }}>
              You scored {quizResult.score}/{quizResult.total}
            </div>
            {quizResult.passed && !isCompleted && (
              <div style={{ fontSize: "16px", fontWeight: 700, color: T.green, marginBottom: "24px" }}>
                +{activeLesson.xpReward} XP earned!
              </div>
            )}
            {quizResult.passed ? (
              <button
                onClick={() => { setActiveLesson(null); setQuizMode(false); setQuizResult(null); }}
                style={{ padding: "14px 32px", borderRadius: "12px", background: T.accent, color: T.white, border: "none", fontSize: "15px", fontWeight: 700, cursor: "pointer" }}
              >Back to Lessons</button>
            ) : (
              <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                <button
                  onClick={() => { setQuizMode(false); setQuizResult(null); }}
                  style={{ padding: "14px 24px", borderRadius: "12px", background: T.bg, color: T.ink, border: "none", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}
                >Review Lesson</button>
                <button
                  onClick={() => { setQuizResult(null); }}
                  style={{ padding: "14px 24px", borderRadius: "12px", background: T.accent, color: T.white, border: "none", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}
                >Try Again</button>
              </div>
            )}
          </Card>
        </div>
      );
    }

    if (quizMode) {
      return (
        <div style={{ maxWidth: "640px", margin: "0 auto", padding: "40px 28px 100px" }}>
          <button
            onClick={() => { setQuizMode(false); }}
            style={{ background: "none", border: "none", cursor: "pointer", color: T.accent, fontSize: "14px", fontWeight: 500, marginBottom: "20px", padding: 0 }}
          >&larr; Back to lesson</button>
          <Card hover={false} style={{ padding: "36px 32px" }}>
            <div style={{ color: T.inkFaint, fontSize: "11px", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: "6px" }}>
              Quiz — {activeLesson.title}
            </div>
            <Quiz questions={activeLesson.quiz} onComplete={handleQuizComplete} />
          </Card>
        </div>
      );
    }

    return (
      <div style={{ maxWidth: "700px", margin: "0 auto", padding: "40px 28px 100px" }}>
        <button
          onClick={() => { setActiveLesson(null); }}
          style={{ background: "none", border: "none", cursor: "pointer", color: T.accent, fontSize: "14px", fontWeight: 500, marginBottom: "20px", padding: 0 }}
        >&larr; Back to lessons</button>
        <Reveal>
          <Card hover={false} style={{ padding: "40px 36px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
              <span style={{ fontSize: "11px", fontWeight: 600, color: catColor, background: `${catColor}12`, padding: "3px 10px", borderRadius: "6px" }}>
                {activeLesson.category}
              </span>
              <span style={{ color: T.inkFaint, fontSize: "12px" }}>{activeLesson.duration}</span>
              {isCompleted && <span style={{ color: T.green, fontSize: "12px", fontWeight: 600 }}>Completed</span>}
            </div>
            <h1 style={{ fontSize: "28px", fontWeight: 700, letterSpacing: "-0.8px", color: T.ink, marginBottom: "24px", lineHeight: 1.2 }}>
              {activeLesson.title}
            </h1>
            <div style={{ color: T.inkSub, fontSize: "15px", lineHeight: 1.75, whiteSpace: "pre-line" }}>
              {activeLesson.content}
            </div>
            <div style={{ marginTop: "32px", paddingTop: "24px", borderTop: `1px solid ${T.line}`, display: "flex", justifyContent: "center" }}>
              <button
                onClick={() => setQuizMode(true)}
                style={{
                  padding: "14px 32px", borderRadius: "12px",
                  background: isCompleted ? T.bg : T.accent,
                  color: isCompleted ? T.ink : T.white,
                  border: "none", fontSize: "15px", fontWeight: 700,
                  cursor: "pointer", transition: "opacity .15s",
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = "0.88"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}
              >
                {isCompleted ? "Retake Quiz" : "Take Quiz"}
              </button>
            </div>
          </Card>
        </Reveal>
      </div>
    );
  }

  // Lesson grid
  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "40px 28px 100px" }}>
      <Reveal>
        <div style={{ marginBottom: "28px" }}>
          <h1 style={{ fontSize: "32px", fontWeight: 700, letterSpacing: "-0.8px", color: T.ink }}>Learn & Earn</h1>
          <p style={{ color: T.inkSub, fontSize: "15px", marginTop: "5px" }}>Complete lessons. Earn XP. Level up.</p>
        </div>
      </Reveal>

      <Reveal delay={0.04}>
        <Card hover={false} style={{ padding: "24px 28px", marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ color: T.ink, fontWeight: 600, fontSize: "15px" }}>Your progress</span>
            <span style={{ color: T.inkSub, fontSize: "14px", fontVariantNumeric: "tabular-nums" }}>
              {completedCount} / {LESSONS.length} complete
            </span>
          </div>
          <ProgressBar value={(completedCount / LESSONS.length) * 100} />
        </Card>
      </Reveal>

      <Reveal delay={0.06}>
        <div style={{ display: "flex", gap: "6px", marginBottom: "20px" }}>
          {CATS.map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              style={{
                background: category === c ? T.ink : T.white,
                color: category === c ? T.white : T.inkSub,
                border: `1px solid ${category === c ? T.ink : T.line}`,
                borderRadius: "20px", padding: "6px 14px",
                fontSize: "12px", fontWeight: category === c ? 600 : 400,
                cursor: "pointer", transition: "all .18s ease",
              }}
            >{c}</button>
          ))}
        </div>
      </Reveal>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px" }}>
        {filtered.map((lesson, i) => {
          const isCompleted = completedIds.has(lesson.id);
          const catColor = CAT_COLORS[lesson.category];
          const isLocked = lesson.category === "Advanced" && userLevel === "Bronze";

          return (
            <Reveal key={lesson.id} delay={i * 0.04 + 0.08}>
              <Card
                style={{
                  padding: "24px 22px", cursor: isLocked ? "default" : "pointer",
                  opacity: isLocked ? 0.5 : 1,
                  position: "relative",
                }}
                onClick={() => { if (!isLocked) setActiveLesson(lesson); }}
              >
                {isCompleted && (
                  <div style={{
                    position: "absolute", top: "14px", right: "14px",
                    width: "22px", height: "22px", borderRadius: "50%",
                    background: T.green, display: "flex", alignItems: "center",
                    justifyContent: "center", color: T.white, fontSize: "12px", fontWeight: 700,
                  }}>{"\u2713"}</div>
                )}
                {isLocked && (
                  <div style={{
                    position: "absolute", top: "14px", right: "14px",
                    fontSize: "16px",
                  }}>{"\uD83D\uDD12"}</div>
                )}
                <span style={{
                  fontSize: "10px", fontWeight: 600, color: catColor,
                  background: `${catColor}12`, padding: "2px 8px",
                  borderRadius: "5px", display: "inline-block", marginBottom: "12px",
                }}>{lesson.category}</span>
                <div style={{ color: T.ink, fontSize: "15px", fontWeight: 700, letterSpacing: "-0.2px", marginBottom: "8px", lineHeight: 1.3 }}>
                  {lesson.title}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ color: T.inkFaint, fontSize: "12px" }}>{lesson.duration}</span>
                  <span style={{
                    fontSize: "10px", fontWeight: 600, color: T.accent,
                    background: `${T.accent}10`, padding: "2px 8px", borderRadius: "4px",
                  }}>+{lesson.xpReward} XP</span>
                </div>
              </Card>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}
