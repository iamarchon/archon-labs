// worker/lib/cricapi.ts

export interface ParsedMatch {
  cricapiMatchId: string;
  homeTeam: string;
  awayTeam: string;
  matchDate: Date;
}

export function parseUpcomingMatches(raw: unknown): ParsedMatch[] {
  if (!raw || typeof raw !== 'object') return [];
  const data = (raw as Record<string, unknown>).data;
  if (!Array.isArray(data)) return [];

  return data
    .filter((m: unknown) => m && typeof m === 'object')
    .map((m: unknown) => {
      const match = m as Record<string, unknown>;
      const name = String(match.name ?? '');
      const parts = name.split(' vs ');
      return {
        cricapiMatchId: String(match.id ?? ''),
        homeTeam: parts[0]?.trim() ?? 'TBA',
        awayTeam: parts[1]?.trim() ?? 'TBA',
        matchDate: new Date(String(match.dateTimeGMT ?? '')),
      };
    })
    .filter(m => m.cricapiMatchId && !isNaN(m.matchDate.getTime()));
}

export function parseMatchResult(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = (raw as Record<string, unknown>).data as Record<string, unknown>;
  if (!data) return null;
  const winner = String(data.matchWinner ?? '');
  return winner && winner.length > 0 ? winner : null;
}

const BASE = 'https://api.cricapi.com/v1';
const IPL_SERIES_ID = '87c62aac-bc3c-4738-ab93-19da0690488f';

export function parseSeriesMatches(raw: unknown): ParsedMatch[] {
  if (!raw || typeof raw !== 'object') return [];
  const data = (raw as Record<string, unknown>).data as Record<string, unknown>;
  if (!data) return [];
  const matchList = data.matchList;
  if (!Array.isArray(matchList)) return [];

  return matchList
    .filter((m: unknown) => m && typeof m === 'object')
    .map((m: unknown) => {
      const match = m as Record<string, unknown>;
      const name = String(match.name ?? '');
      const parts = name.split(' vs ');
      return {
        cricapiMatchId: String(match.id ?? ''),
        homeTeam: parts[0]?.trim() ?? 'TBA',
        awayTeam: parts[1]?.split(',')[0]?.trim() ?? 'TBA',
        matchDate: new Date(String(match.date ?? '') + 'T00:00:00Z'),
      };
    })
    .filter(m => m.cricapiMatchId && !isNaN(m.matchDate.getTime()));
}

export async function fetchUpcomingMatches(apiKey: string): Promise<ParsedMatch[]> {
  const res = await fetch(`${BASE}/series_info?apikey=${apiKey}&id=${IPL_SERIES_ID}`);
  const json = await res.json();
  return parseSeriesMatches(json);
}

export async function fetchMatchResult(apiKey: string, matchId: string): Promise<string | null> {
  const res = await fetch(`${BASE}/match_info?apikey=${apiKey}&id=${matchId}`);
  const json = await res.json();
  return parseMatchResult(json);
}
