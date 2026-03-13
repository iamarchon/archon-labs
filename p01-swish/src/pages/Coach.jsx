import { useState, useEffect, useRef } from "react";
import { T } from "../tokens";
import Reveal from "../components/Reveal";

const STARTER_CHIPS = [
  "Why is my portfolio down?",
  "What should I buy with $50?",
  "Explain P/E ratio",
  "How does DCA work?",
];

export default function Coach() {
  const [messages, setMessages] = useState([
    { role: "coach", text: "Ready to talk markets. Ask me anything — portfolio strategy, how to read a chart, or what a P/E ratio actually means." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showChips, setShowChips] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;
    setShowChips(false);
    const newMessages = [...messages, { role: "user", text: text.trim() }];
    setInput("");
    setMessages(newMessages);
    setLoading(true);
    try {
      const history = newMessages
        .filter(m => m.role !== "coach" || m !== newMessages[0])
        .map(m => ({ role: m.role === "coach" ? "assistant" : "user", content: m.text }));

      const baseUrl = import.meta.env.DEV ? "http://localhost:3001" : "";
      const res = await fetch(`${baseUrl}/api/coach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 300,
          system: "You are a sharp, no-nonsense investing coach for teenagers. Be concise and clear. No emojis.",
          messages: history,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setMessages(m => [...m, { role: "coach", text: data.error?.message || data.error }]);
      } else {
        setMessages(m => [...m, { role: "coach", text: data.content?.[0]?.text || "No response received." }]);
      }
    } catch (err) {
      console.error("Coach fetch failed:", err);
      setMessages(m => [...m, { role: "coach", text: "Could not reach the coach server. Make sure the Express server is running (npm run dev:full)." }]);
    }
    setLoading(false);
  };

  const send = () => sendMessage(input);

  return (
    <div style={{ maxWidth: "700px", margin: "0 auto", padding: "40px 28px 0", display: "flex", flexDirection: "column", height: "calc(100vh - 130px)" }}>
      <Reveal>
        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "28px" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: `${T.accent}10`, border: `1.5px solid ${T.accent}28`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>&#x25D1;</div>
          <div>
            <div style={{ color: T.ink, fontWeight: 700, fontSize: "18px", letterSpacing: "-0.3px" }}>AI Coach</div>
            <div style={{ color: T.green, fontSize: "13px", display: "flex", alignItems: "center", gap: "5px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: T.green, display: "inline-block" }} /> Online
            </div>
          </div>
        </div>
      </Reveal>
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "14px", paddingBottom: "20px" }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", animation: "fadeIn .22s ease" }}>
            <div style={{ maxWidth: "68%", padding: "14px 18px", borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", background: msg.role === "user" ? T.ink : T.white, color: msg.role === "user" ? T.white : T.inkMid, fontSize: "15px", lineHeight: "1.65", letterSpacing: "-0.1px", boxShadow: msg.role === "coach" ? "0 2px 12px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.04)" : "none", fontWeight: msg.role === "user" ? 500 : 400 }}>{msg.text}</div>
          </div>
        ))}
        {showChips && messages.length === 1 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", animation: "fadeIn .3s ease" }}>
            {STARTER_CHIPS.map(chip => (
              <button key={chip} onClick={() => sendMessage(chip)} style={{
                background: T.white, border: `1px solid ${T.line}`, borderRadius: "20px",
                padding: "8px 16px", fontSize: "14px", color: T.ink, cursor: "pointer",
                transition: "all .15s", whiteSpace: "nowrap",
                boxShadow: "0 1px 4px rgba(0,0,0,.04)",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = T.ghost; e.currentTarget.style.background = T.bg; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = T.line; e.currentTarget.style.background = T.white; }}
              >{chip}</button>
            ))}
          </div>
        )}
        {loading && (
          <div style={{ display: "flex", gap: "5px", padding: "14px 18px", background: T.white, borderRadius: "18px 18px 18px 4px", width: "fit-content", boxShadow: "0 2px 12px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.04)" }}>
            {[0, 1, 2].map(i => <div key={i} style={{ width: "7px", height: "7px", borderRadius: "50%", background: T.ghost, animation: `bounce 1.2s ${i * .2}s infinite ease-in-out` }} />)}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div style={{ paddingTop: "16px", paddingBottom: "28px", borderTop: `1px solid ${T.line}`, display: "flex", gap: "10px" }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Ask your coach…"
          style={{ flex: 1, background: T.white, border: `1px solid ${T.line}`, borderRadius: "12px", padding: "13px 18px", color: T.ink, fontSize: "15px", outline: "none", letterSpacing: "-0.1px", transition: "border-color .18s ease", boxShadow: "0 1px 4px rgba(0,0,0,.04)" }}
          onFocus={e => e.target.style.borderColor = T.ghost}
          onBlur={e => e.target.style.borderColor = T.line} />
        <button onClick={send} disabled={loading || !input.trim()} style={{ background: T.accent, border: "none", borderRadius: "12px", padding: "13px 22px", color: T.white, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading || !input.trim() ? .4 : 1, transition: "opacity .18s ease", fontSize: "15px" }}>Send</button>
      </div>
    </div>
  );
}
