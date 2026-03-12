import { useState } from "react";
import { T } from "../tokens";

export default function Quiz({ questions, onComplete }) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const q = questions[current];

  const handleSelect = (idx) => {
    if (revealed) return;
    setSelected(idx);
    setRevealed(true);
    if (idx === q.correct) setScore(s => s + 1);
  };

  const handleNext = () => {
    if (current < questions.length - 1) {
      setCurrent(c => c + 1);
      setSelected(null);
      setRevealed(false);
    } else {
      setFinished(true);
      onComplete(score + (selected === q.correct ? 1 : 0));
    }
  };

  if (finished) return null;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div style={{ color: T.inkFaint, fontSize: "12px", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>
          Question {current + 1} of {questions.length}
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          {questions.map((_, i) => (
            <div key={i} style={{
              width: "8px", height: "8px", borderRadius: "50%",
              background: i < current ? T.accent : i === current ? T.ink : T.line,
              transition: "background .2s",
            }} />
          ))}
        </div>
      </div>

      <div style={{ color: T.ink, fontSize: "18px", fontWeight: 700, letterSpacing: "-0.4px", marginBottom: "20px", lineHeight: 1.4 }}>
        {q.question}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
        {q.options.map((opt, i) => {
          let bg = T.white;
          let border = T.line;
          let color = T.ink;
          if (revealed) {
            if (i === q.correct) { bg = T.greenBg; border = T.green; color = T.green; }
            else if (i === selected) { bg = T.redBg; border = T.red; color = T.red; }
          } else if (i === selected) {
            bg = `${T.accent}08`; border = T.accent;
          }
          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              style={{
                display: "flex", alignItems: "center", gap: "12px",
                padding: "14px 18px", borderRadius: "12px",
                background: bg, border: `1.5px solid ${border}`,
                cursor: revealed ? "default" : "pointer",
                transition: "all .18s ease", textAlign: "left",
                fontSize: "14px", fontWeight: 500, color,
              }}
            >
              <span style={{
                width: "26px", height: "26px", borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "12px", fontWeight: 700, flexShrink: 0,
                background: revealed && i === q.correct ? T.green : revealed && i === selected ? T.red : T.bg,
                color: revealed && (i === q.correct || i === selected) ? T.white : T.inkSub,
              }}>
                {revealed && i === q.correct ? "\u2713" : revealed && i === selected ? "\u2717" : String.fromCharCode(65 + i)}
              </span>
              {opt}
            </button>
          );
        })}
      </div>

      {revealed && (
        <button
          onClick={handleNext}
          style={{
            width: "100%", padding: "14px", borderRadius: "12px",
            background: T.accent, color: T.white, border: "none",
            fontSize: "15px", fontWeight: 700, cursor: "pointer",
            transition: "opacity .15s",
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = "0.88"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
        >
          {current < questions.length - 1 ? "Next Question" : "See Results"}
        </button>
      )}
    </div>
  );
}
