import { useState } from "react";
import { T } from "../tokens";

const baseUrl = import.meta.env.DEV ? "http://localhost:3001" : "";

export default function RoleSelect({ userId, onSelect }) {
  const [saving, setSaving] = useState(false);

  const pick = async (role) => {
    setSaving(true);
    try {
      await fetch(`${baseUrl}/api/user/role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
    } catch { /* proceed anyway — default is student */ }
    onSelect(role);
  };

  const roles = [
    { role: "student", label: "I'm a Student", emoji: "\uD83C\uDF92", desc: "Learn investing, compete with friends, earn XP" },
    { role: "teacher", label: "I'm a Teacher", emoji: "\uD83D\uDC69\u200D\uD83C\uDFEB", desc: "Manage your class, track student progress" },
  ];

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: T.bg, padding: "40px 24px" }}>
      <div style={{ maxWidth: "640px", width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: "28px", fontWeight: 700, letterSpacing: "-0.8px", color: T.ink, marginBottom: "6px" }}>
          swish<span style={{ color: T.accent }}>.</span>
        </div>
        <div style={{ color: T.inkSub, fontSize: "16px", marginBottom: "40px" }}>
          How will you be using Swish?
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          {roles.map(r => (
            <button
              key={r.role}
              onClick={() => pick(r.role)}
              disabled={saving}
              style={{
                background: T.white, border: "none", borderRadius: "20px",
                padding: "40px 28px", cursor: saving ? "default" : "pointer",
                boxShadow: "0 2px 12px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)",
                transition: "all .22s ease", textAlign: "center",
                opacity: saving ? 0.6 : 1,
              }}
              onMouseEnter={e => {
                if (!saving) {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.05)";
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)";
              }}
            >
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>{r.emoji}</div>
              <div style={{ color: T.ink, fontSize: "18px", fontWeight: 700, letterSpacing: "-0.4px", marginBottom: "8px" }}>
                {r.label}
              </div>
              <div style={{ color: T.inkSub, fontSize: "14px", lineHeight: 1.5 }}>{r.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
