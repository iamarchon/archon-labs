import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { T } from "../tokens";
import { timeAgo } from "../hooks/useNotifications";

export default function NotificationBell({ notifications, unreadCount, onMarkAllRead }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const toggle = () => {
    setOpen(prev => {
      const willOpen = !prev;
      if (willOpen && unreadCount > 0) {
        // Optimistic: mark all read immediately on open
        onMarkAllRead();
      }
      return willOpen;
    });
  };

  const handleClick = (notif) => {
    if (notif.link) {
      setOpen(false);
      navigate(notif.link);
    }
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Bell button */}
      <button onClick={toggle} style={{
        background: "none", border: "none", cursor: "pointer",
        position: "relative", padding: "4px", lineHeight: 1,
        fontSize: "18px", color: T.inkSub, transition: "color .15s",
      }}
        onMouseEnter={e => e.currentTarget.style.color = T.ink}
        onMouseLeave={e => e.currentTarget.style.color = T.inkSub}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span style={{
            position: "absolute", top: "0px", right: "-2px",
            background: T.red, color: T.white,
            fontSize: "9px", fontWeight: 700,
            minWidth: "16px", height: "16px",
            borderRadius: "8px", display: "flex",
            alignItems: "center", justifyContent: "center",
            padding: "0 4px", lineHeight: 1,
            border: "2px solid white",
            animation: "scaleIn .2s ease",
          }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: "-8px",
          width: "340px", maxHeight: "400px",
          background: T.white, borderRadius: "14px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.05)",
          zIndex: 200, overflow: "hidden",
          animation: "sheetUp .2s ease",
        }}>
          {/* Header */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "16px 18px 12px", borderBottom: `1px solid ${T.line}`,
          }}>
            <span style={{ fontSize: "15px", fontWeight: 700, color: T.ink, letterSpacing: "-0.3px" }}>Notifications</span>
            {/* Badge clears automatically when dropdown opens */}
          </div>

          {/* List */}
          <div style={{ maxHeight: "348px", overflowY: "auto" }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "32px 18px", textAlign: "center", color: T.inkFaint, fontSize: "13px" }}>
                No notifications yet
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  style={{
                    display: "flex", gap: "12px", padding: "12px 18px",
                    cursor: notif.link ? "pointer" : "default",
                    background: notif.read ? "transparent" : `${T.accent}06`,
                    borderLeft: notif.read ? "3px solid transparent" : `3px solid ${T.accent}`,
                    transition: "background .15s",
                  }}
                  onMouseEnter={e => { if (notif.link) e.currentTarget.style.background = T.bg; }}
                  onMouseLeave={e => { e.currentTarget.style.background = notif.read ? "transparent" : `${T.accent}06`; }}
                >
                  <span style={{ fontSize: "18px", lineHeight: 1, flexShrink: 0, marginTop: "1px" }}>{notif.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: "13px", color: T.ink,
                      fontWeight: notif.read ? 400 : 600,
                      lineHeight: 1.4,
                    }}>
                      {notif.text}
                    </div>
                    <div style={{ fontSize: "11px", color: T.inkFaint, marginTop: "3px" }}>
                      {timeAgo(notif.createdAt)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
