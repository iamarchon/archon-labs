// lib/data/teams.ts
// All 10 IPL 2026 teams with colors and inline SVG logos
// NOTE: Logos are inline SVGs — no external image dependencies

import type { Team } from "@/types";

export const TEAMS: Record<string, Team> = {
  RCB: {
    name: "Royal Challengers Bengaluru", short: "RCB",
    c1: "#C8102E", c2: "#FFD700", city: "Bengaluru",
    logo: `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="19" fill="#C8102E" stroke="#FFD700" stroke-width="1.5"/><text x="20" y="14" text-anchor="middle" fill="#FFD700" font-size="6.5" font-weight="900" font-family="Arial">ROYAL</text><text x="20" y="24" text-anchor="middle" fill="#FFD700" font-size="11" font-weight="900" font-family="Arial">RCB</text><text x="20" y="32" text-anchor="middle" fill="#FFD700" font-size="5" font-weight="700" font-family="Arial">CHALLENGERS</text></svg>`,
  },
  MI: {
    name: "Mumbai Indians", short: "MI",
    c1: "#004BA0", c2: "#D4AF37", city: "Mumbai",
    logo: `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="19" fill="#004BA0" stroke="#D4AF37" stroke-width="1.5"/><text x="20" y="17" text-anchor="middle" fill="#D4AF37" font-size="14" font-weight="900" font-family="Arial">MI</text><text x="20" y="27" text-anchor="middle" fill="#D4AF37" font-size="5.5" font-weight="700" font-family="Arial">MUMBAI</text><text x="20" y="33" text-anchor="middle" fill="#D4AF37" font-size="5.5" font-weight="700" font-family="Arial">INDIANS</text></svg>`,
  },
  CSK: {
    name: "Chennai Super Kings", short: "CSK",
    c1: "#F9CD05", c2: "#004BA0", city: "Chennai",
    logo: `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="19" fill="#F9CD05" stroke="#004BA0" stroke-width="1.5"/><text x="20" y="17" text-anchor="middle" fill="#004BA0" font-size="11" font-weight="900" font-family="Arial">CSK</text><text x="20" y="27" text-anchor="middle" fill="#004BA0" font-size="5.5" font-weight="700" font-family="Arial">SUPER</text><text x="20" y="33" text-anchor="middle" fill="#004BA0" font-size="5.5" font-weight="700" font-family="Arial">KINGS</text></svg>`,
  },
  KKR: {
    name: "Kolkata Knight Riders", short: "KKR",
    c1: "#3A225D", c2: "#B3A123", city: "Kolkata",
    logo: `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="19" fill="#3A225D" stroke="#B3A123" stroke-width="1.5"/><text x="20" y="17" text-anchor="middle" fill="#B3A123" font-size="11" font-weight="900" font-family="Arial">KKR</text><text x="20" y="27" text-anchor="middle" fill="#B3A123" font-size="5.5" font-weight="700" font-family="Arial">KNIGHT</text><text x="20" y="33" text-anchor="middle" fill="#B3A123" font-size="5.5" font-weight="700" font-family="Arial">RIDERS</text></svg>`,
  },
  SRH: {
    name: "Sunrisers Hyderabad", short: "SRH",
    c1: "#FF6B00", c2: "#FFFFFF", city: "Hyderabad",
    logo: `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="19" fill="#FF6B00" stroke="#111" stroke-width="1.5"/><text x="20" y="17" text-anchor="middle" fill="#fff" font-size="11" font-weight="900" font-family="Arial">SRH</text><text x="20" y="27" text-anchor="middle" fill="#fff" font-size="5.5" font-weight="700" font-family="Arial">SUNRISERS</text><text x="20" y="33" text-anchor="middle" fill="#fff" font-size="5.5" font-weight="700" font-family="Arial">HYDERABAD</text></svg>`,
  },
  GT: {
    name: "Gujarat Titans", short: "GT",
    c1: "#1C4E9D", c2: "#00BFFF", city: "Ahmedabad",
    logo: `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="19" fill="#1C4E9D" stroke="#00BFFF" stroke-width="1.5"/><text x="20" y="17" text-anchor="middle" fill="#00BFFF" font-size="14" font-weight="900" font-family="Arial">GT</text><text x="20" y="27" text-anchor="middle" fill="#00BFFF" font-size="5.5" font-weight="700" font-family="Arial">GUJARAT</text><text x="20" y="33" text-anchor="middle" fill="#00BFFF" font-size="5.5" font-weight="700" font-family="Arial">TITANS</text></svg>`,
  },
  DC: {
    name: "Delhi Capitals", short: "DC",
    c1: "#004C97", c2: "#EF1C25", city: "Delhi",
    logo: `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="19" fill="#004C97" stroke="#EF1C25" stroke-width="1.5"/><text x="20" y="17" text-anchor="middle" fill="#EF1C25" font-size="14" font-weight="900" font-family="Arial">DC</text><text x="20" y="27" text-anchor="middle" fill="#fff" font-size="5.5" font-weight="700" font-family="Arial">DELHI</text><text x="20" y="33" text-anchor="middle" fill="#fff" font-size="5.5" font-weight="700" font-family="Arial">CAPITALS</text></svg>`,
  },
  PBKS: {
    name: "Punjab Kings", short: "PBKS",
    c1: "#ED1B24", c2: "#A8A9AD", city: "Chandigarh",
    logo: `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="19" fill="#ED1B24" stroke="#A8A9AD" stroke-width="1.5"/><text x="20" y="15" text-anchor="middle" fill="#fff" font-size="9" font-weight="900" font-family="Arial">PBKS</text><text x="20" y="25" text-anchor="middle" fill="#fff" font-size="5.5" font-weight="700" font-family="Arial">PUNJAB</text><text x="20" y="33" text-anchor="middle" fill="#fff" font-size="5.5" font-weight="700" font-family="Arial">KINGS</text></svg>`,
  },
  RR: {
    name: "Rajasthan Royals", short: "RR",
    c1: "#E01588", c2: "#FFD700", city: "Jaipur",
    logo: `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="19" fill="#E01588" stroke="#FFD700" stroke-width="1.5"/><text x="20" y="17" text-anchor="middle" fill="#FFD700" font-size="14" font-weight="900" font-family="Arial">RR</text><text x="20" y="27" text-anchor="middle" fill="#fff" font-size="5.5" font-weight="700" font-family="Arial">RAJASTHAN</text><text x="20" y="33" text-anchor="middle" fill="#fff" font-size="5.5" font-weight="700" font-family="Arial">ROYALS</text></svg>`,
  },
  LSG: {
    name: "Lucknow Super Giants", short: "LSG",
    c1: "#A72366", c2: "#FBCD38", city: "Lucknow",
    logo: `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="19" fill="#A72366" stroke="#FBCD38" stroke-width="1.5"/><text x="20" y="17" text-anchor="middle" fill="#FBCD38" font-size="11" font-weight="900" font-family="Arial">LSG</text><text x="20" y="27" text-anchor="middle" fill="#fff" font-size="5.5" font-weight="700" font-family="Arial">LUCKNOW</text><text x="20" y="33" text-anchor="middle" fill="#fff" font-size="5" font-weight="700" font-family="Arial">SUPER GIANTS</text></svg>`,
  },
};


// ─────────────────────────────────────────────────────────────────────────────
// lib/data/fixtures.ts
// IPL 2026 first 20 fixtures — official BCCI schedule
// ─────────────────────────────────────────────────────────────────────────────

import type { Fixture } from "@/types";

export const FIXTURES: Fixture[] = [
  { id: 1,  home: "RCB",  away: "SRH",  date: "Mar 28", time: "7:30 PM", venue: "M. Chinnaswamy Stadium, Bengaluru",         result: "RCB won by 6 wkts" },
  { id: 2,  home: "MI",   away: "KKR",  date: "Mar 29", time: "7:30 PM", venue: "Wankhede Stadium, Mumbai",                   result: null },
  { id: 3,  home: "RR",   away: "CSK",  date: "Mar 30", time: "7:30 PM", venue: "Barsapara Cricket Stadium, Guwahati",        result: null },
  { id: 4,  home: "PBKS", away: "GT",   date: "Mar 31", time: "7:30 PM", venue: "Maharaja Yadavindra Singh Stadium, Chandigarh", result: null },
  { id: 5,  home: "LSG",  away: "DC",   date: "Apr 1",  time: "7:30 PM", venue: "Ekana Cricket Stadium, Lucknow",             result: null },
  { id: 6,  home: "KKR",  away: "SRH",  date: "Apr 2",  time: "7:30 PM", venue: "Eden Gardens, Kolkata",                      result: null },
  { id: 7,  home: "CSK",  away: "PBKS", date: "Apr 3",  time: "7:30 PM", venue: "MA Chidambaram Stadium, Chennai",            result: null },
  { id: 8,  home: "DC",   away: "MI",   date: "Apr 4",  time: "3:30 PM", venue: "Arun Jaitley Stadium, Delhi",                result: null },
  { id: 9,  home: "GT",   away: "RR",   date: "Apr 4",  time: "7:30 PM", venue: "Narendra Modi Stadium, Ahmedabad",           result: null },
  { id: 10, home: "SRH",  away: "LSG",  date: "Apr 5",  time: "3:30 PM", venue: "Rajiv Gandhi International Stadium, Hyderabad", result: null },
  { id: 11, home: "RCB",  away: "CSK",  date: "Apr 5",  time: "7:30 PM", venue: "M. Chinnaswamy Stadium, Bengaluru",         result: null },
  { id: 12, home: "KKR",  away: "PBKS", date: "Apr 6",  time: "7:30 PM", venue: "Eden Gardens, Kolkata",                      result: null },
  { id: 13, home: "RR",   away: "MI",   date: "Apr 7",  time: "7:30 PM", venue: "Barsapara Cricket Stadium, Guwahati",        result: null },
  { id: 14, home: "DC",   away: "GT",   date: "Apr 8",  time: "7:30 PM", venue: "Arun Jaitley Stadium, Delhi",                result: null },
  { id: 15, home: "KKR",  away: "LSG",  date: "Apr 9",  time: "7:30 PM", venue: "Eden Gardens, Kolkata",                      result: null },
  { id: 16, home: "RR",   away: "RCB",  date: "Apr 10", time: "7:30 PM", venue: "Barsapara Cricket Stadium, Guwahati",        result: null },
  { id: 17, home: "PBKS", away: "SRH",  date: "Apr 11", time: "3:30 PM", venue: "Maharaja Yadavindra Singh Stadium, Chandigarh", result: null },
  { id: 18, home: "CSK",  away: "DC",   date: "Apr 11", time: "7:30 PM", venue: "MA Chidambaram Stadium, Chennai",            result: null },
  { id: 19, home: "LSG",  away: "GT",   date: "Apr 12", time: "3:30 PM", venue: "Ekana Cricket Stadium, Lucknow",             result: null },
  { id: 20, home: "MI",   away: "RCB",  date: "Apr 12", time: "7:30 PM", venue: "Wankhede Stadium, Mumbai",                   result: null },
];

export function getFixtureById(id: number): Fixture | undefined {
  return FIXTURES.find(f => f.id === id);
}

export function getUpcomingFixtures(): Fixture[] {
  return FIXTURES.filter(f => !f.result);
}

export function getLiveFixture(): Fixture | undefined {
  // In production this comes from DB match_state. For now return fixture 2 as "live"
  return FIXTURES[1];
}
