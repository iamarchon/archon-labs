import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { T } from "../tokens";

const base = import.meta.env.DEV ? "http://localhost:3001" : "";

function collectDebugContext() {
  return {
    url: window.location.href,
    page: document.title,
    timestamp: new Date().toISOString(),
    userId: window?.Clerk?.user?.id || "not signed in",
    userEmail: window?.Clerk?.user?.primaryEmailAddress?.emailAddress || "unknown",
    userName: window?.Clerk?.user?.fullName || "unknown",
    sessionId: window?.Clerk?.session?.id || "no session",
    sessionStatus: window?.Clerk?.session?.status || "unknown",
    userAgent: navigator.userAgent,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    devicePixelRatio: window.devicePixelRatio,
    platform: navigator.platform,
    language: navigator.language,
    appVersion: document.querySelector('script[src*="index"]')?.src?.match(/index-(\w+)\.js/)?.[1] || "unknown",
    recentErrors: window.__recentErrors || [],
    recentFailedRequests: window.__failedRequests || [],
    pageLoadTime: Math.round(performance.now()),
  };
}

export default function FeedbackModal({ onClose }) {
  const [type, setType] = useState("Bug");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | success | error

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleSend = async () => {
    if (!message.trim()) return;
    setStatus("sending");
    try {
      const res = await fetch(`${base}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          message: message.trim(),
          email: email.trim(),
          debugContext: collectDebugContext(),
        }),
      });
      setStatus(res.ok ? "success" : "error");
    } catch {
      setStatus("error");
    }
  };

  const linkStyle = { color: T.inkFaint, textDecoration: "underline" };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 1100,
          background: "rgba(0,0,0,0.35)",
          animation: "fadeIn .18s ease",
        }}
      />

      {/* Modal */}
      <div style={{
        position: "fixed", top: "50%", left: "50%", zIndex: 1101,
        transform: "translate(-50%, -50%)",
        width: "min(480px, calc(100vw - 32px))",
        background: T.white, borderRadius: "20px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)",
        animation: "modalIn .22s cubic-bezier(0.34,1.56,0.64,1)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "24px 24px 0" }}>
          <div>
            <div style={{ fontSize: "17px", fontWeight: 700, letterSpacing: "-0.4px", color: T.ink }}>
              Report a bug or share feedback
            </div>
            <div style={{ fontSize: "13px", color: T.inkSub, marginTop: "4px" }}>
              We read every message. Takes 30 seconds.
            </div>
          </div>
          <button onClick={onClose} style={{
            background: T.bg, border: "none", cursor: "pointer",
            width: "30px", height: "30px", borderRadius: "50%", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center", marginLeft: "12px",
          }}>
            <X size={16} strokeWidth={1.5} color={T.inkSub} />
          </button>
        </div>

        {status === "success" ? (
          <div style={{ padding: "36px 24px", textAlign: "center" }}>
            <div style={{ fontSize: "28px", marginBottom: "10px" }}>✅</div>
            <div style={{ fontSize: "15px", fontWeight: 600, color: T.ink }}>Thanks! We'll look into it.</div>
            <button onClick={onClose} style={{
              marginTop: "20px", padding: "10px 24px", borderRadius: "10px",
              background: T.accent, border: "none", color: T.white,
              fontWeight: 600, fontSize: "14px", cursor: "pointer", fontFamily: "inherit",
            }}>Close</button>
          </div>
        ) : (
          <div style={{ padding: "20px 24px 24px" }}>
            {/* Type radio */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: T.inkFaint, marginBottom: "8px" }}>Type</div>
              <div style={{ display: "flex", gap: "20px" }}>
                {["Bug", "Feedback", "Question"].map(t => (
                  <label key={t} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "14px", color: T.ink }}>
                    <input
                      type="radio"
                      name="type"
                      value={t}
                      checked={type === t}
                      onChange={() => setType(t)}
                      style={{ accentColor: T.accent }}
                    />
                    {t}
                  </label>
                ))}
              </div>
            </div>

            {/* Message */}
            <div style={{ marginBottom: "14px" }}>
              <div style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: T.inkFaint, marginBottom: "6px" }}>What happened?</div>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={4}
                placeholder="Describe what you saw or what went wrong..."
                style={{
                  width: "100%", padding: "10px 12px", borderRadius: "10px",
                  border: `1px solid ${T.line}`, fontSize: "14px", fontFamily: "inherit",
                  color: T.ink, background: T.white, resize: "vertical",
                  outline: "none", lineHeight: 1.55, boxSizing: "border-box",
                }}
                onFocus={e => e.target.style.borderColor = `${T.accent}60`}
                onBlur={e => e.target.style.borderColor = T.line}
              />
            </div>

            {/* Email */}
            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: T.inkFaint, marginBottom: "6px" }}>Your email (optional)</div>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="so we can follow up"
                style={{
                  width: "100%", padding: "10px 12px", borderRadius: "10px",
                  border: `1px solid ${T.line}`, fontSize: "14px", fontFamily: "inherit",
                  color: T.ink, background: T.white, outline: "none", boxSizing: "border-box",
                }}
                onFocus={e => e.target.style.borderColor = `${T.accent}60`}
                onBlur={e => e.target.style.borderColor = T.line}
              />
            </div>

            {status === "error" && (
              <div style={{ fontSize: "13px", color: T.red, marginBottom: "12px" }}>
                Something went wrong — email <a href="mailto:iamarchon@proton.me" style={linkStyle}>iamarchon@proton.me</a>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button onClick={onClose} style={{
                padding: "10px 20px", borderRadius: "10px",
                border: `1px solid ${T.line}`, background: T.bg,
                fontSize: "14px", fontWeight: 500, color: T.inkSub,
                cursor: "pointer", fontFamily: "inherit",
              }}>Cancel</button>
              <button
                onClick={handleSend}
                disabled={!message.trim() || status === "sending"}
                style={{
                  padding: "10px 22px", borderRadius: "10px", border: "none",
                  background: T.accent, color: T.white,
                  fontSize: "14px", fontWeight: 600, cursor: status === "sending" ? "default" : "pointer",
                  opacity: (!message.trim() || status === "sending") ? 0.5 : 1,
                  fontFamily: "inherit", transition: "opacity .15s ease",
                  display: "flex", alignItems: "center", gap: "8px",
                }}
              >
                {status === "sending" ? (
                  <>
                    <div style={{ width: "13px", height: "13px", borderRadius: "50%", border: "2px solid rgba(255,255,255,.4)", borderTopColor: "#fff", animation: "spin .7s linear infinite" }} />
                    Sending…
                  </>
                ) : "Send"}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
