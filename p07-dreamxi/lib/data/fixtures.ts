import type { Fixture } from "@/types";

export const FIXTURES: Fixture[] = [
  { id: 1,  home: "RCB",  away: "SRH",  date: "Mar 28", time: "7:30 PM", venue: "M. Chinnaswamy Stadium, Bengaluru",            result: "RCB won by 6 wkts" },
  { id: 2,  home: "MI",   away: "KKR",  date: "Mar 29", time: "7:30 PM", venue: "Wankhede Stadium, Mumbai",                      result: null },
  { id: 3,  home: "RR",   away: "CSK",  date: "Mar 30", time: "7:30 PM", venue: "Barsapara Cricket Stadium, Guwahati",           result: null },
  { id: 4,  home: "PBKS", away: "GT",   date: "Mar 31", time: "7:30 PM", venue: "Maharaja Yadavindra Singh Stadium, Chandigarh", result: null },
  { id: 5,  home: "LSG",  away: "DC",   date: "Apr 1",  time: "7:30 PM", venue: "Ekana Cricket Stadium, Lucknow",                result: null },
  { id: 6,  home: "KKR",  away: "SRH",  date: "Apr 2",  time: "7:30 PM", venue: "Eden Gardens, Kolkata",                         result: null },
  { id: 7,  home: "CSK",  away: "PBKS", date: "Apr 3",  time: "7:30 PM", venue: "MA Chidambaram Stadium, Chennai",               result: null },
  { id: 8,  home: "DC",   away: "MI",   date: "Apr 4",  time: "3:30 PM", venue: "Arun Jaitley Stadium, Delhi",                   result: null },
  { id: 9,  home: "GT",   away: "RR",   date: "Apr 4",  time: "7:30 PM", venue: "Narendra Modi Stadium, Ahmedabad",              result: null },
  { id: 10, home: "SRH",  away: "LSG",  date: "Apr 5",  time: "3:30 PM", venue: "Rajiv Gandhi International Stadium, Hyderabad", result: null },
  { id: 11, home: "RCB",  away: "CSK",  date: "Apr 5",  time: "7:30 PM", venue: "M. Chinnaswamy Stadium, Bengaluru",            result: null },
  { id: 12, home: "KKR",  away: "PBKS", date: "Apr 6",  time: "7:30 PM", venue: "Eden Gardens, Kolkata",                         result: null },
  { id: 13, home: "RR",   away: "MI",   date: "Apr 7",  time: "7:30 PM", venue: "Barsapara Cricket Stadium, Guwahati",           result: null },
  { id: 14, home: "DC",   away: "GT",   date: "Apr 8",  time: "7:30 PM", venue: "Arun Jaitley Stadium, Delhi",                   result: null },
  { id: 15, home: "KKR",  away: "LSG",  date: "Apr 9",  time: "7:30 PM", venue: "Eden Gardens, Kolkata",                         result: null },
  { id: 16, home: "RR",   away: "RCB",  date: "Apr 10", time: "7:30 PM", venue: "Barsapara Cricket Stadium, Guwahati",           result: null },
  { id: 17, home: "PBKS", away: "SRH",  date: "Apr 11", time: "3:30 PM", venue: "Maharaja Yadavindra Singh Stadium, Chandigarh", result: null },
  { id: 18, home: "CSK",  away: "DC",   date: "Apr 11", time: "7:30 PM", venue: "MA Chidambaram Stadium, Chennai",               result: null },
  { id: 19, home: "LSG",  away: "GT",   date: "Apr 12", time: "3:30 PM", venue: "Ekana Cricket Stadium, Lucknow",                result: null },
  { id: 20, home: "MI",   away: "RCB",  date: "Apr 12", time: "7:30 PM", venue: "Wankhede Stadium, Mumbai",                      result: null },
];

export function getFixtureById(id: number): Fixture | undefined {
  return FIXTURES.find((f) => f.id === id);
}

export function getUpcomingFixtures(): Fixture[] {
  return FIXTURES.filter((f) => !f.result);
}

export function getLiveFixture(): Fixture | undefined {
  return FIXTURES[1];
}
