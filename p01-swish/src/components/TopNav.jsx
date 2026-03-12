import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { UserButton } from "@clerk/react";
import { T } from "../tokens";
import NotificationBell from "./NotificationBell";

const STUDENT_NAV = [
  { to: "/",            label: "Dashboard"   },
  { to: "/markets",     label: "Markets"     },
  { to: "/learn",       label: "Learn"       },
  { to: "/scenarios",   label: "Scenarios"   },
  { to: "/leaderboard", label: "Leaderboard" },
  { to: "/coach",       label: "Coach"       },
];

const TEACHER_NAV = [
  { to: "/teacher",    label: "Dashboard"  },
  { to: "/learn",      label: "Curriculum" },
  { to: "/scenarios",  label: "Scenarios"  },
  { to: "/coach",      label: "Coach"      },
];

export default function TopNav({ notifications = [], unreadCount = 0, onMarkAllRead, role }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 6);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <header style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      height: "52px",
      background: scrolled ? "rgba(255,255,255,.88)" : "rgba(255,255,255,.76)",
      backdropFilter: "saturate(180%) blur(20px)",
      WebkitBackdropFilter: "saturate(180%) blur(20px)",
      borderBottom: `1px solid ${scrolled ? T.line : "transparent"}`,
      transition: "border-color .3s ease, background .3s ease",
    }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", height: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px" }}>
        <NavLink to={role === "teacher" ? "/teacher" : "/"} style={{ fontSize: "17px", fontWeight: 700, letterSpacing: "-0.4px", color: T.ink, textDecoration: "none", userSelect: "none" }}>
          swish<span style={{ color: T.accent }}>.</span>
        </NavLink>
        <nav style={{ display: "flex", alignItems: "center" }}>
          {(role === "teacher" ? TEACHER_NAV : STUDENT_NAV).map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/" || item.to === "/teacher"}
              style={({ isActive }) => ({
                background: "none", border: "none", cursor: "pointer",
                padding: "6px 13px", borderRadius: "8px", position: "relative",
                color: isActive ? T.ink : T.inkSub,
                fontSize: "13px", fontWeight: isActive ? 600 : 400,
                transition: "color .18s ease",
                textDecoration: "none",
              })}
            >
              {({ isActive }) => (
                <>
                  {item.label}
                  {isActive && (
                    <span style={{ position: "absolute", bottom: "-1px", left: "50%", transform: "translateX(-50%)", width: "16px", height: "2px", background: T.accent, borderRadius: "2px" }} />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <NotificationBell notifications={notifications} unreadCount={unreadCount} onMarkAllRead={onMarkAllRead} />
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>
    </header>
  );
}
