export type Role = "BAT" | "BOWL" | "AR" | "WK";

export interface Team {
  name: string;
  short: string;
  c1: string;   // primary color hex
  c2: string;   // accent color hex
  city: string;
  logo: string; // inline SVG string
}

export interface Player {
  id: number;
  jersey: number;
  name: string;       // short display name e.g. "V. Kohli"
  full: string;       // full name e.g. "Virat Kohli"
  team: string;       // team short code e.g. "RCB"
  role: Role;
  cr: number;         // fantasy credit e.g. 11.0
  sel: number;        // selection % e.g. 72
  ovr: boolean;       // is overseas player
}

export interface Fixture {
  id: number;
  home: string;       // team short code
  away: string;       // team short code
  date: string;       // e.g. "Mar 28"
  time: string;       // e.g. "7:30 PM"
  venue: string;
  result: string | null; // null = upcoming
}

export interface PlayerStats {
  runs?: number;
  wickets?: number;
  fours?: number;
  sixes?: number;
  dots?: number;
  maidens?: number;
  catches?: number;
}

export interface LiveStats {
  [playerId: number]: PlayerStats;
}

export interface MatchEvent {
  id: string;
  msg: string;
  team: string;       // for border color
  timestamp: number;
}

export interface LeaderboardEntry {
  name: string;
  pts: number;
  live: number;
  rank: number;
  isUser: boolean;
}

export interface League {
  id: string;
  name: string;
  members: number;
  prize: string;
  joined: boolean;
  rank: number | null;
  mega: boolean;
}

export interface TeamBuilderState {
  selected: number[];       // player IDs
  captain: number | null;
  vc: number | null;
  credits: number;
  remaining: number;
  isValid: boolean;
  togglePlayer: (id: number, players: Player[]) => void;
  toggleCaptain: (id: number) => void;
  toggleVC: (id: number) => void;
  reset: () => void;
}

export interface LiveMatchState {
  liveStats: LiveStats;
  matchLog: MatchEvent[];
  over: number;
  ball: number;
  homeScore: number;
  homeWickets: number;
  running: boolean;
  matchDone: boolean;
  leaderboard: LeaderboardEntry[];
  updateStat: (playerId: number, stat: Partial<PlayerStats>) => void;
  addEvent: (event: MatchEvent) => void;
  setScore: (score: number, wickets: number) => void;
  advanceBall: () => void;
  setLeaderboard: (lb: LeaderboardEntry[]) => void;
  setRunning: (v: boolean) => void;
  setMatchDone: (v: boolean) => void;
  reset: () => void;
}
