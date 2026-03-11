import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { UserButton } from "@clerk/react";
import { T } from "../tokens";

const NAV = [
  { to: "/",            label: "Dashboard"   },
  { to: "/markets",     label: "Markets"     },
  { to: "/portfolio",   label: "Portfolio"   },
  { to: "/learn",       label: "Learn"       },
  { to: "/leaderboard", label: "Leaderboard" },
  { to: "/coach",       label: "Coach"       },
];

export default function TopNav({ xp = 0, level = "Bronze" }) {
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
      <div style={{ maxWidth: "1020px", margin: "0 auto", height: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px" }}>
        <NavLink to="/" style={{ fontSize: "17px", fontWeight: 700, letterSpacing: "-0.4px", color: T.ink, textDecoration: "none", userSelect: "none" }}>
          swish<span style={{ color: T.accent }}>.</span>
        </NavLink>
        <nav style={{ display: "flex", alignItems: "center" }}>
          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
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
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ fontSize: "12px", color: T.inkSub, background: T.bg, padding: "5px 13px", borderRadius: "20px", fontWeight: 500 }}>
            {xp.toLocaleString()} XP · {level}
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>
    </header>
  );
}
