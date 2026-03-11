import { T } from "../tokens";
import { LESSONS } from "../data";
import Reveal from "../components/Reveal";
import Card from "../components/Card";
import ProgressBar from "../components/ProgressBar";

export default function Learn() {
  return (
    <div style={{ maxWidth: "700px", margin: "0 auto", padding: "40px 28px 100px" }}>
      <Reveal>
        <div style={{ marginBottom: "28px" }}>
          <h1 style={{ fontSize: "32px", fontWeight: 700, letterSpacing: "-0.8px", color: T.ink }}>Learn</h1>
          <p style={{ color: T.inkSub, fontSize: "15px", marginTop: "5px" }}>Complete lessons to earn XP and level up</p>
        </div>
      </Reveal>
      <Reveal delay={0.06}>
        <Card hover={false} style={{ padding: "24px 28px", marginBottom: "18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ color: T.ink, fontWeight: 600, fontSize: "15px", letterSpacing: "-0.2px" }}>Your progress</span>
            <span style={{ color: T.inkSub, fontSize: "14px" }}>2 / 5 complete</span>
          </div>
          <ProgressBar value={40} />
        </Card>
      </Reveal>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {LESSONS.map((lesson, i) => (
          <Reveal key={i} delay={i * .06 + .1}>
            <Card style={{ padding: "22px 28px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
                <div style={{ width: "44px", height: "44px", borderRadius: "12px", flexShrink: 0, background: lesson.done ? `${T.accent}10` : T.bg, border: `1px solid ${lesson.done ? T.accent + "25" : T.line}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "17px", fontWeight: 700, color: lesson.done ? T.accent : T.inkFaint }}>
                  {lesson.done ? "✓" : i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: T.ink, fontWeight: 600, fontSize: "15px", letterSpacing: "-0.2px" }}>{lesson.title}</div>
                  <div style={{ color: T.inkSub, fontSize: "13px", marginTop: "3px" }}>{lesson.desc}</div>
                </div>
                {lesson.done
                  ? <span style={{ color: T.accent, fontSize: "20px" }}>✓</span>
                  : <span style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.04em", color: T.accent, background: `${T.accent}10`, padding: "4px 10px", borderRadius: "6px" }}>+{lesson.xp} XP</span>
                }
              </div>
            </Card>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
