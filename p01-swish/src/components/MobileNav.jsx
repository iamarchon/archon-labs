import { NavLink } from "react-router-dom";
import { Home, TrendingUp, RefreshCw, Gamepad2, BookOpen } from "lucide-react";
import { T } from "../tokens";

const NAV_ITEMS = [
  { to: "/", label: "Home", Icon: Home, id: "mnav-home" },
  { to: "/markets", label: "Markets", Icon: TrendingUp, id: "mnav-markets" },
  { to: "/auto-invest", label: "Auto", Icon: RefreshCw, id: "mnav-auto" },
  { to: "/scenarios", label: "Play", Icon: Gamepad2, id: "mnav-scenarios" },
  { to: "/learn", label: "Learn", Icon: BookOpen, id: "mnav-learn" },
];

export default function MobileNav({ role, tourHighlight }) {
  if (role === "teacher") return null;

  return (
    <nav className="mobile-nav" style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
      height: "64px",
      background: "rgba(255,255,255,.92)",
      backdropFilter: "saturate(180%) blur(20px)",
      WebkitBackdropFilter: "saturate(180%) blur(20px)",
      borderTop: `1px solid ${T.line}`,
      display: "none", alignItems: "center", justifyContent: "space-around",
      padding: "0 8px",
    }}>
      {NAV_ITEMS.map(item => {
        const highlighted = tourHighlight === item.id;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            id={item.id}
            end={item.to === "/"}
            style={({ isActive }) => ({
              display: "flex", flexDirection: "column", alignItems: "center",
              gap: "2px", textDecoration: "none", padding: "6px 12px",
              color: isActive ? T.accent : T.inkFaint,
              transition: "color .15s ease, box-shadow .2s ease",
              borderRadius: "8px",
              ...(highlighted ? {
                boxShadow: "0 0 0 3px #0071e3, 0 0 12px rgba(0,113,227,0.4)",
                zIndex: 10005,
                position: "relative",
              } : {}),
            })}
          >
            {({ isActive }) => (
              <>
                <item.Icon size={22} strokeWidth={1.5} color={highlighted ? T.accent : isActive ? T.accent : T.inkFaint} />
                <span style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.02em" }}>{item.label}</span>
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
