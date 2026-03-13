import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { MessageCircle, X } from "lucide-react";
import { T } from "../tokens";

const baseUrl = import.meta.env.DEV ? "http://localhost:3001" : "";

const STARTER_CHIPS = [
  "Why is my portfolio down?",
  "What should I buy with $50?",
  "Explain P/E ratio",
  "How does DCA work?",
];

export default function FloatingCoach() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "coach", text: "Ready to talk markets. Ask me anything — portfolio strategy, how to read a chart, or what a P/E ratio actually means." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showChips, setShowChips] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, open]);

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [open]);

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
    } catch {
      setMessages(m => [...m, { role: "coach", text: "Could not reach the coach server." }]);
    }
    setLoading(false);
  };

  const send = () => sendMessage(input);

  if (location.pathname === "/coach") return null;

  return (
    <>
      {/* Floating bubble — mobile only */}
      <button
        className="floating-coach-bubble"
        onClick={() => setOpen(true)}
        style={{
          display: "none", position: "fixed", bottom: "88px", right: "16px",
          zIndex: 50, width: "52px", height: "52px", borderRadius: "50%",
          background: T.accent, border: "none", cursor: "pointer",
          alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 20px rgba(0,113,227,0.35)",
          transition: "transform .15s ease, box-shadow .15s ease",
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.08)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
      >
        <MessageCircle size={24} strokeWidth={1.5} color="#ffffff" />
      </button>

      {/* Sheet overlay — mobile only */}
      {open && (
        <div className="floating-coach-sheet" style={{ display: "none" }}>
          {/* Backdrop */}
          <div
            onClick={() => setOpen(false)}
            style={{
              position: "fixed", inset: 0, zIndex: 200,
              background: "rgba(0,0,0,0.3)",
              animation: "fadeIn .2s ease",
            }}
          />

          {/* Sheet */}
          <div style={{
            position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 201,
            height: "75vh",
            background: T.white,
            borderRadius: "20px 20px 0 0",
            boxShadow: "0 -8px 40px rgba(0,0,0,0.15)",
            display: "flex", flexDirection: "column",
            animation: "sheetSlideUp .28s cubic-bezier(0.34,1.56,0.64,1)",
          }}>
            {/* Header */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "16px 20px", borderBottom: `1px solid ${T.line}`, flexShrink: 0,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ color: T.ink, fontWeight: 700, fontSize: "16px", letterSpacing: "-0.3px" }}>AI Coach</div>
                <span style={{
                  fontSize: "10px", fontWeight: 500, color: T.inkFaint,
                  background: T.bg, padding: "2px 8px", borderRadius: "4px",
                  border: `1px solid ${T.line}`,
                }}>
                  Powered by AI
                </span>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: T.bg, border: "none", cursor: "pointer",
                  width: "32px", height: "32px", borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <X size={18} strokeWidth={1.5} color={T.inkSub} />
              </button>
            </div>

            {/* Messages */}
            <div style={{
              flex: 1, overflowY: "auto", padding: "16px 20px",
              display: "flex", flexDirection: "column", gap: "14px",
            }}>
              {messages.map((msg, i) => (
                <div key={i} style={{
                  display: "flex",
                  justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                  animation: "fadeIn .22s ease",
                }}>
                  <div style={{
                    maxWidth: "80%", padding: "12px 16px",
                    borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                    background: msg.role === "user" ? T.ink : T.bg,
                    color: msg.role === "user" ? T.white : T.inkMid,
                    fontSize: "14px", lineHeight: "1.6", letterSpacing: "-0.1px",
                    fontWeight: msg.role === "user" ? 500 : 400,
                  }}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {showChips && messages.length === 1 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", animation: "fadeIn .3s ease" }}>
                  {STARTER_CHIPS.map(chip => (
                    <button key={chip} onClick={() => sendMessage(chip)} style={{
                      background: T.white, border: `1px solid ${T.line}`, borderRadius: "20px",
                      padding: "7px 14px", fontSize: "13px", color: T.ink, cursor: "pointer",
                      transition: "all .15s", whiteSpace: "nowrap",
                    }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = T.ghost; e.currentTarget.style.background = T.bg; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = T.line; e.currentTarget.style.background = T.white; }}
                    >{chip}</button>
                  ))}
                </div>
              )}
              {loading && (
                <div style={{
                  display: "flex", gap: "5px", padding: "12px 16px",
                  background: T.bg, borderRadius: "16px 16px 16px 4px",
                  width: "fit-content",
                }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: "6px", height: "6px", borderRadius: "50%",
                      background: T.ghost,
                      animation: `bounce 1.2s ${i * 0.2}s infinite ease-in-out`,
                    }} />
                  ))}
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{
              padding: "12px 16px", paddingBottom: "max(12px, env(safe-area-inset-bottom))",
              borderTop: `1px solid ${T.line}`,
              display: "flex", gap: "10px", flexShrink: 0,
            }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && send()}
                placeholder="Ask your coach..."
                style={{
                  flex: 1, background: T.bg, border: `1px solid ${T.line}`,
                  borderRadius: "12px", padding: "12px 16px",
                  color: T.ink, fontSize: "15px", outline: "none",
                  letterSpacing: "-0.1px",
                }}
                onFocus={e => e.target.style.borderColor = T.ghost}
                onBlur={e => e.target.style.borderColor = T.line}
              />
              <button
                onClick={send}
                disabled={loading || !input.trim()}
                style={{
                  background: T.accent, border: "none", borderRadius: "12px",
                  padding: "12px 20px", color: T.white, fontWeight: 600,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading || !input.trim() ? 0.4 : 1,
                  transition: "opacity .18s ease", fontSize: "15px",
                }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
