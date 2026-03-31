"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LIVE_MATCH_ID = 2;

const tabs = [
  { label: "Contests", icon: "🏆", href: "/contests" },
  { label: "Play", icon: "▶", href: `/play/${LIVE_MATCH_ID}` },
  { label: "Build XI", icon: "⚒", href: `/build/${LIVE_MATCH_ID}` },
  { label: "Live", icon: "📡", href: `/live/${LIVE_MATCH_ID}` },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: 480,
        background: "#0d1120",
        borderTop: "1px solid #1e293b",
        display: "flex",
        zIndex: 50,
      }}
    >
      {tabs.map((tab) => {
        const isActive = pathname.startsWith(tab.href.split("/").slice(0, 2).join("/"));
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "10px 4px 8px",
              textDecoration: "none",
              color: isActive ? "#a78bfa" : "#64748b",
              fontSize: 10,
              fontFamily: "var(--font-manrope, Arial)",
              fontWeight: isActive ? 700 : 500,
              gap: 2,
              borderTop: isActive ? "2px solid #a78bfa" : "2px solid transparent",
              transition: "color 0.15s",
            }}
          >
            <span style={{ fontSize: 18 }}>{tab.icon}</span>
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
