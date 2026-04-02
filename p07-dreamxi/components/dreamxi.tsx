"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { TEAMS } from "@/lib/data/teams";
import type { Fixture, LeaderboardEntry, LiveStats, MatchEvent, Player } from "@/types";

export function TeamBadge({ teamCode, large = false }: { teamCode: string; large?: boolean }) {
  const team = TEAMS[teamCode];
  const size = large ? "h-14 w-14" : "h-10 w-10";

  return (
    <div
      className={`${size} overflow-hidden rounded-full border border-slate-700/80 bg-slate-950/70 shadow-lg`}
      dangerouslySetInnerHTML={{ __html: team?.logo ?? `<div>${teamCode}</div>` }}
    />
  );
}

export function MatchPill({ fixture }: { fixture: Fixture }) {
  const home = TEAMS[fixture.home];
  const away = TEAMS[fixture.away];

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
      <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-400">
        <span>{fixture.date}</span>
        <span>{fixture.time}</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-1 flex-col items-center gap-2 text-center">
          <TeamBadge teamCode={fixture.home} large />
          <div>
            <p className="text-lg font-semibold text-slate-100">{home?.short ?? fixture.home}</p>
            <p className="text-xs text-slate-400">{home?.city}</p>
          </div>
        </div>
        <div className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-sm font-semibold text-violet-300">VS</div>
        <div className="flex flex-1 flex-col items-center gap-2 text-center">
          <TeamBadge teamCode={fixture.away} large />
          <div>
            <p className="text-lg font-semibold text-slate-100">{away?.short ?? fixture.away}</p>
            <p className="text-xs text-slate-400">{away?.city}</p>
          </div>
        </div>
      </div>
      <div className="mt-4 rounded-2xl border border-slate-800/80 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
        <p className="font-medium text-slate-200">{fixture.venue}</p>
      </div>
    </div>
  );
}

export function ContestCard({ fixture }: { fixture: Fixture }) {
  const home = TEAMS[fixture.home];
  const away = TEAMS[fixture.away];

  return (
    <Link prefetch={false} href={`/play/${fixture.id}`} className="block rounded-3xl border border-slate-800 bg-[linear-gradient(180deg,rgba(17,24,39,0.95),rgba(8,11,18,0.95))] p-5 transition hover:border-violet-500/40 hover:bg-slate-950/95">
      <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-400">
        <span>{fixture.date}</span>
        <span>{fixture.time}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex flex-1 items-center gap-3">
          <TeamBadge teamCode={fixture.home} />
          <div>
            <p className="font-semibold text-slate-100">{home?.short ?? fixture.home}</p>
            <p className="text-xs text-slate-400">{home?.name}</p>
          </div>
        </div>
        <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-300">VS</span>
        <div className="flex flex-1 items-center justify-end gap-3 text-right">
          <div>
            <p className="font-semibold text-slate-100">{away?.short ?? fixture.away}</p>
            <p className="text-xs text-slate-400">{away?.name}</p>
          </div>
          <TeamBadge teamCode={fixture.away} />
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-400">{fixture.venue}</p>
      <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
        <span>Open contests</span>
        <span className="font-semibold text-violet-300">Tap to enter</span>
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
    <nav className="fixed bottom-0 left-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 border-t border-slate-800 bg-slate-950/95 px-4 py-3 backdrop-blur-xl">
      <div className="grid grid-cols-5 gap-2">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}?`);

          return (
            <Link
              key={item.href}
              prefetch={false}
              href={item.href}
              className={`rounded-2xl border px-2 py-3 text-center text-xs font-semibold transition ${
                isActive
                  ? "border-violet-500/50 bg-violet-500/10 text-violet-300"
                  : "border-slate-800 bg-slate-900/80 text-slate-300 hover:border-violet-500/40 hover:text-violet-300"
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
    <div className="rounded-[2rem] border border-emerald-500/20 bg-[radial-gradient(circle_at_top,rgba(74,222,128,0.18),rgba(15,23,42,0.96))] p-4 shadow-[0_20px_80px_rgba(16,185,129,0.15)]">
      <div className="mb-4 flex items-center justify-between text-sm text-slate-300">
        <span className="font-semibold text-slate-100">Pitch View</span>
        <span className="text-xs uppercase tracking-[0.2em] text-emerald-300">Fantasy XI</span>
      </div>
      <div className="space-y-4">
        {lines.map((role) => (
          <div key={role}>
            <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-[0.35em] text-emerald-200/80">{role}</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {grouped[role].length ? grouped[role].map((player) => {
                const stats = liveStats?.[player.id];
                return (
                  <div key={player.id} className="min-w-[84px] rounded-2xl border border-emerald-300/20 bg-slate-950/55 px-3 py-2 text-center">
                    <p className="truncate text-sm font-semibold text-slate-100">{player.name}</p>
                    <p className="text-[11px] text-slate-400">{player.team} • {player.cr.toFixed(1)} cr</p>
                    {(captainId === player.id || vcId === player.id) && (
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">{captainId === player.id ? "Captain" : "Vice-Captain"}</p>
                    )}
                    {stats && (
                      <p className="mt-1 text-[11px] text-emerald-300">
                        {(stats.runs ?? 0)}R • {(stats.wickets ?? 0)}W
                      </p>
                    )}
                  </div>
                );
              }) : <div className="rounded-2xl border border-dashed border-slate-700 px-4 py-3 text-sm text-slate-500">No players selected</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PlayerRow({ player, selected, captain, viceCaptain, onToggle, onCaptain, onViceCaptain }: { player: Player; selected: boolean; captain: boolean; viceCaptain: boolean; onToggle: () => void; onCaptain: () => void; onViceCaptain: () => void }) {
  return (
    <div className={`rounded-3xl border p-4 ${selected ? "border-violet-500/50 bg-violet-500/10" : "border-slate-800 bg-slate-950/60"}`}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-slate-100">{player.name}</p>
          <p className="text-sm text-slate-400">{player.team} • {player.role} • Sel {player.sel}%</p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-slate-200">{player.cr.toFixed(1)} cr</p>
          <p className="text-xs text-slate-500">#{player.jersey}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={onToggle} className={`rounded-full px-4 py-2 text-sm font-semibold ${selected ? "bg-violet-500 text-slate-950" : "bg-slate-800 text-slate-200"}`}>
          {selected ? "Remove" : "Select"}
        </button>
        <button onClick={onCaptain} disabled={!selected} className="rounded-full border border-amber-400/40 px-4 py-2 text-sm font-semibold text-amber-300 disabled:cursor-not-allowed disabled:opacity-40">
          {captain ? "Captain ✓" : "Make C"}
        </button>
        <button onClick={onViceCaptain} disabled={!selected} className="rounded-full border border-sky-400/40 px-4 py-2 text-sm font-semibold text-sky-300 disabled:cursor-not-allowed disabled:opacity-40">
          {viceCaptain ? "Vice-Captain ✓" : "Make VC"}
        </button>
      </div>
    </div>
  );
}

export function ScoreHeader({ mode, fixture, score, wickets, over, ball }: { mode: "live" | "leaderboard"; fixture: Fixture; score: number; wickets: number; over: number; ball: number }) {
  return (
    <div className="rounded-[2rem] border border-slate-800 bg-[linear-gradient(135deg,rgba(239,68,68,0.14),rgba(15,23,42,0.94))] p-5">
      <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-400">
        <span>{mode === "live" ? "Live match" : "Leaderboard"}</span>
        <span>{fixture.home} vs {fixture.away}</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-3xl font-bold text-slate-100">{score}/{wickets}</p>
          <p className="mt-1 text-sm text-slate-400">Overs {over}.{ball}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-300">{fixture.date} • {fixture.time}</p>
          <p className="mt-1 text-sm text-slate-400">{fixture.venue}</p>
        </div>
      </div>
    </div>
  );
}

export function BallLog({ events }: { events: MatchEvent[] }) {
  return (
    <div className="rounded-[2rem] border border-slate-800 bg-slate-950/60 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-100">Ball-by-ball feed</h3>
        <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Latest first</span>
      </div>
      <div className="space-y-3">
        {events.length ? events.map((event) => (
          <div key={event.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3">
            <p className="text-sm font-medium text-slate-100">{event.msg}</p>
            <p className="mt-1 text-xs text-slate-500">{event.team} • {new Date(event.timestamp).toLocaleTimeString()}</p>
          </div>
        )) : <p className="text-sm text-slate-500">Start the simulation to see live events.</p>}
      </div>
    </div>
  );
}

export function Leaderboard({ entries }: { entries: LeaderboardEntry[] }) {
  return (
    <div className="rounded-[2rem] border border-slate-800 bg-slate-950/60 p-4">
      <h3 className="mb-4 text-lg font-semibold text-slate-100">Contest leaderboard</h3>
      <div className="space-y-3">
        {entries.map((entry) => (
          <div key={`${entry.name}-${entry.rank}`} className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${entry.isUser ? "border-violet-500/50 bg-violet-500/10" : "border-slate-800 bg-slate-900/70"}`}>
            <div>
              <p className="font-semibold text-slate-100">#{entry.rank} • {entry.name}</p>
              <p className="text-sm text-slate-400">Live +{Math.round(entry.live)}</p>
            </div>
            <p className="text-lg font-bold text-slate-100">{Math.round(entry.pts)} pts</p>
          </div>
        ))}
      </div>
    </div>
  );
}
