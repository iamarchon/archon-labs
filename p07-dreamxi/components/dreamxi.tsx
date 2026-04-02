"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { TEAMS } from "@/lib/data/teams";
import type { Fixture, LeaderboardEntry, LiveStats, MatchEvent, Player } from "@/types";

export function TeamBadge({ teamCode, large = false }: { teamCode: string; large?: boolean }) {
  const team = TEAMS[teamCode];
  const size = large ? "h-16 w-16" : "h-11 w-11";

  return (
    <div
      className={`${size} overflow-hidden rounded-full border border-white/10 bg-slate-950/80 shadow-[0_10px_30px_rgba(2,6,23,0.45)]`}
      dangerouslySetInnerHTML={{ __html: team?.logo ?? `<div>${teamCode}</div>` }}
    />
  );
}

export function MatchHeaderSticky({ fixture, eyebrow = "Match center" }: { fixture: Fixture; eyebrow?: string }) {
  const home = TEAMS[fixture.home];
  const away = TEAMS[fixture.away];

  return (
    <div className="sticky-shell">
      <div className="sports-panel rounded-[1.75rem] px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-violet-300">{eyebrow}</p>
            <h2 className="mt-2 text-xl font-extrabold tracking-[-0.04em] text-white">{home?.short ?? fixture.home} vs {away?.short ?? fixture.away}</h2>
            <p className="mt-1 text-sm text-slate-400">{fixture.date} • {fixture.time} • {fixture.venue}</p>
          </div>
          <div className="flex flex-col items-end gap-2 text-right">
            <span className="signal-chip signal-chip--hot">Locks soon</span>
            <span className="text-xs font-semibold text-slate-400">High-demand slate</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MatchPill({ fixture }: { fixture: Fixture }) {
  const home = TEAMS[fixture.home];
  const away = TEAMS[fixture.away];

  return (
    <div className="sports-panel rounded-[1.9rem] p-5">
      <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
        <span>{fixture.date}</span>
        <span>{fixture.time}</span>
      </div>
      <div className="mt-4 flex items-center justify-between gap-4">
        <div className="flex flex-1 flex-col items-center gap-2 text-center">
          <TeamBadge teamCode={fixture.home} large />
          <div>
            <p className="text-xl font-extrabold tracking-[-0.04em] text-white">{home?.short ?? fixture.home}</p>
            <p className="text-xs text-slate-400">{home?.city}</p>
          </div>
        </div>
        <div className="rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-sm font-extrabold text-orange-200">VS</div>
        <div className="flex flex-1 flex-col items-center gap-2 text-center">
          <TeamBadge teamCode={fixture.away} large />
          <div>
            <p className="text-xl font-extrabold tracking-[-0.04em] text-white">{away?.short ?? fixture.away}</p>
            <p className="text-xs text-slate-400">{away?.city}</p>
          </div>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <span className="signal-chip signal-chip--hot">Prize pools live</span>
        <span className="signal-chip signal-chip--live">Real-time scoring</span>
        <span className="signal-chip signal-chip--violet">Secure contest entry</span>
      </div>
    </div>
  );
}

export function ContestCard({ fixture }: { fixture: Fixture }) {
  const home = TEAMS[fixture.home];
  const away = TEAMS[fixture.away];
  const entryFee = fixture.id === 2 ? 49 : fixture.id === 3 ? 39 : 29;
  const prizePool = fixture.id === 2 ? "₹25 Lakhs" : fixture.id === 3 ? "₹10 Lakhs" : "₹5 Lakhs";
  const firstPrize = fixture.id === 2 ? "₹2.5 Lakhs" : fixture.id === 3 ? "₹1 Lakh" : "₹50K";
  const totalSpots = fixture.id === 2 ? 134582 : fixture.id === 3 ? 84210 : 56240;
  const spotsLeft = fixture.id === 2 ? 18462 : fixture.id === 3 ? 12908 : 9405;
  const fillPercent = Math.round(((totalSpots - spotsLeft) / totalSpots) * 100);

  return (
    <Link prefetch={false} href={`/play/${fixture.id}`} className="sports-panel block rounded-[1.9rem] p-5 transition hover:-translate-y-0.5 hover:border-orange-500/30">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <span className="signal-chip signal-chip--hot">Mega</span>
          <span className="signal-chip signal-chip--live">{spotsLeft < 15000 ? "Locks soon" : "Open"}</span>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{fixture.date}</p>
          <p className="text-sm font-semibold text-slate-300">{fixture.time}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex flex-1 items-center gap-3">
          <TeamBadge teamCode={fixture.home} />
          <div>
            <p className="text-base font-extrabold tracking-[-0.03em] text-white">{home?.short ?? fixture.home}</p>
            <p className="text-xs text-slate-400">{home?.name}</p>
          </div>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-300">vs</div>
        <div className="flex flex-1 items-center justify-end gap-3 text-right">
          <div>
            <p className="text-base font-extrabold tracking-[-0.03em] text-white">{away?.short ?? fixture.away}</p>
            <p className="text-xs text-slate-400">{away?.name}</p>
          </div>
          <TeamBadge teamCode={fixture.away} />
        </div>
      </div>

      <p className="mt-4 text-sm text-slate-400">{fixture.venue}</p>

      <div className="mt-5 stat-grid">
        <div className="stat-card">
          <p className="stat-label">Prize pool</p>
          <p className="stat-value">{prizePool}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Entry</p>
          <p className="stat-value">₹{entryFee}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">1st prize</p>
          <p className="stat-value">{firstPrize}</p>
        </div>
      </div>

      <div className="mt-5 rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-4">
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="font-semibold text-slate-200">{spotsLeft.toLocaleString()} spots left</span>
          <span className="text-slate-400">{fillPercent}% filled</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${fillPercent}%` }} />
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span>{totalSpots.toLocaleString()} total spots</span>
          <span>Max 20 teams</span>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between rounded-[1.35rem] border border-orange-500/20 bg-orange-500/10 px-4 py-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-200">High demand slate</p>
          <p className="mt-1 text-sm text-orange-50">View contests and join before prices tighten.</p>
        </div>
        <span className="rounded-full bg-orange-500 px-4 py-2 text-sm font-extrabold text-slate-950">View contests</span>
      </div>
    </Link>
  );
}

function getActiveMatchId(pathname: string): string {
  const match = pathname.match(/^\/(play|build|live|leaderboard)\/([^/?#]+)/);
  return match?.[2] ?? "1";
}

export function BottomNav() {
  const pathname = usePathname();
  const activeMatchId = getActiveMatchId(pathname);
  const items = [
    { href: "/contests", label: "Contests" },
    { href: `/play/${activeMatchId}`, label: "Lobby" },
    { href: `/build/${activeMatchId}`, label: "Build" },
    { href: `/live/${activeMatchId}`, label: "Live" },
    { href: `/leaderboard/${activeMatchId}`, label: "Ranks" },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 border-t border-white/8 bg-[#08111f]/95 px-4 py-3 backdrop-blur-xl">
      <div className="grid grid-cols-5 gap-2">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}?`);

          return (
            <Link
              key={item.href}
              prefetch={false}
              href={item.href}
              className={`rounded-[1.1rem] border px-2 py-3 text-center text-[11px] font-extrabold uppercase tracking-[0.12em] transition ${
                isActive
                  ? "border-orange-500/40 bg-orange-500/14 text-orange-100"
                  : "border-white/6 bg-white/[0.03] text-slate-400 hover:border-orange-500/30 hover:text-orange-100"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function PitchView({ players, liveStats, captainId, vcId }: { players: Player[]; liveStats?: LiveStats; captainId?: number | null; vcId?: number | null }) {
  const grouped = useMemo(() => ({
    WK: players.filter((p) => p.role === "WK"),
    BAT: players.filter((p) => p.role === "BAT"),
    AR: players.filter((p) => p.role === "AR"),
    BOWL: players.filter((p) => p.role === "BOWL"),
  }), [players]);

  const lines: Array<keyof typeof grouped> = ["WK", "BAT", "AR", "BOWL"];

  return (
    <div className="sports-panel rounded-[1.9rem] p-4">
      <div className="mb-4 flex items-center justify-between text-sm text-slate-300">
        <span className="font-extrabold text-white">Selected XI</span>
        <span className="signal-chip signal-chip--live">Fantasy view</span>
      </div>
      <div className="space-y-4">
        {lines.map((role) => (
          <div key={role}>
            <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-[0.35em] text-emerald-200/80">{role}</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {grouped[role].length ? grouped[role].map((player) => {
                const stats = liveStats?.[player.id];
                return (
                  <div key={player.id} className="min-w-[92px] rounded-[1.1rem] border border-white/8 bg-white/[0.03] px-3 py-3 text-center">
                    <p className="truncate text-sm font-bold text-slate-100">{player.name}</p>
                    <p className="text-[11px] text-slate-400">{player.team} • {player.cr.toFixed(1)} cr</p>
                    {(captainId === player.id || vcId === player.id) && (
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">{captainId === player.id ? "Captain" : "Vice"}</p>
                    )}
                    {stats && (
                      <p className="mt-1 text-[11px] text-emerald-300">{(stats.runs ?? 0)}R • {(stats.wickets ?? 0)}W</p>
                    )}
                  </div>
                );
              }) : <div className="rounded-[1.1rem] border border-dashed border-white/10 px-4 py-3 text-sm text-slate-500">Select players to build momentum</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PlayerRow({ player, selected, captain, viceCaptain, onToggle, onCaptain, onViceCaptain }: { player: Player; selected: boolean; captain: boolean; viceCaptain: boolean; onToggle: () => void; onCaptain: () => void; onViceCaptain: () => void }) {
  return (
    <div className={`rounded-[1.4rem] border p-4 ${selected ? "border-orange-500/35 bg-orange-500/10" : "border-white/8 bg-white/[0.03]"}`}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-extrabold text-slate-100">{player.name}</p>
            <span className="signal-chip signal-chip--violet">{player.role}</span>
            {captain && <span className="signal-chip signal-chip--hot">C</span>}
            {viceCaptain && <span className="signal-chip signal-chip--live">VC</span>}
          </div>
          <p className="mt-2 text-sm text-slate-400">{player.team} • Sel {player.sel}% • Jersey #{player.jersey}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-extrabold tracking-[-0.03em] text-white">{player.cr.toFixed(1)}</p>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">credits</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={onToggle} className={`rounded-full px-4 py-2 text-sm font-extrabold ${selected ? "bg-orange-500 text-slate-950" : "bg-slate-800 text-slate-200"}`}>
          {selected ? "Selected" : "Add player"}
        </button>
        <button onClick={onCaptain} disabled={!selected} className="rounded-full border border-amber-400/40 px-4 py-2 text-sm font-semibold text-amber-300 disabled:cursor-not-allowed disabled:opacity-40">
          {captain ? "Captain assigned" : "Assign captain"}
        </button>
        <button onClick={onViceCaptain} disabled={!selected} className="rounded-full border border-sky-400/40 px-4 py-2 text-sm font-semibold text-sky-300 disabled:cursor-not-allowed disabled:opacity-40">
          {viceCaptain ? "Vice assigned" : "Assign vice"}
        </button>
      </div>
    </div>
  );
}

export function ScoreHeader({ mode, fixture, score, wickets, over, ball }: { mode: "live" | "leaderboard"; fixture: Fixture; score: number; wickets: number; over: number; ball: number }) {
  return (
    <div className="sports-panel rounded-[1.9rem] p-5">
      <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-400">
        <span className={mode === "live" ? "signal-chip signal-chip--live" : "signal-chip signal-chip--violet"}>{mode === "live" ? "Live match" : "Contest live"}</span>
        <span>{fixture.home} vs {fixture.away}</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-4xl font-extrabold tracking-[-0.05em] text-white">{score}/{wickets}</p>
          <p className="mt-2 text-sm font-semibold text-slate-300">Overs {over}.{ball}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-slate-200">{fixture.date} • {fixture.time}</p>
          <p className="mt-1 text-sm text-slate-400">{fixture.venue}</p>
        </div>
      </div>
    </div>
  );
}

export function BallLog({ events }: { events: MatchEvent[] }) {
  return (
    <div className="sports-panel rounded-[1.9rem] p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-extrabold text-slate-100">Live events</h3>
        <span className="signal-chip signal-chip--live">Latest first</span>
      </div>
      <div className="space-y-3">
        {events.length ? events.map((event) => (
          <div key={event.id} className="rounded-[1.1rem] border border-white/8 bg-white/[0.03] px-4 py-3">
            <p className="text-sm font-semibold text-slate-100">{event.msg}</p>
            <p className="mt-1 text-xs text-slate-500">{event.team} • {new Date(event.timestamp).toLocaleTimeString()}</p>
          </div>
        )) : <p className="rounded-[1.1rem] border border-dashed border-white/10 px-4 py-4 text-sm text-slate-500">Live updates reconnecting… Start simulation to populate the feed.</p>}
      </div>
    </div>
  );
}

export function Leaderboard({ entries }: { entries: LeaderboardEntry[] }) {
  return (
    <div className="sports-panel rounded-[1.9rem] p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-extrabold text-slate-100">Contest leaderboard</h3>
        <span className="signal-chip signal-chip--hot">Winning zone</span>
      </div>
      <div className="space-y-3">
        {entries.map((entry) => (
          <div key={`${entry.name}-${entry.rank}`} className={`flex items-center justify-between rounded-[1.1rem] border px-4 py-3 ${entry.isUser ? "border-orange-500/35 bg-orange-500/10" : "border-white/8 bg-white/[0.03]"}`}>
            <div>
              <p className="font-extrabold text-slate-100">#{entry.rank} • {entry.name}</p>
              <p className="text-sm text-slate-400">Live +{Math.round(entry.live)} • {entry.rank === 1 ? "↑3" : entry.isUser ? "↑7" : "↓1"}</p>
            </div>
            <p className="text-xl font-extrabold tracking-[-0.03em] text-white">{Math.round(entry.pts)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
