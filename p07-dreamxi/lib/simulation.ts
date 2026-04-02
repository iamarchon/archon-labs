export type EventType = "six" | "four" | "wicket" | "run2" | "run1" | "dot" | "maiden";

export interface BallEvent {
  type: EventType;
  label: string;
  isBatEvent: boolean;  // true = batter scored, false = bowler took action
  runs: number;         // runs added to total score
}

const BAT_EVENTS: BallEvent[] = [
  { type: "six",     label: "🏏 SIX!!",     isBatEvent: true,  runs: 6 },
  { type: "four",    label: "⚡ FOUR!",     isBatEvent: true,  runs: 4 },
  { type: "wicket",  label: "Wicket 💥",    isBatEvent: true,  runs: 0 },
  { type: "run2",    label: "2 runs",        isBatEvent: true,  runs: 2 },
  { type: "run1",    label: "Single",        isBatEvent: true,  runs: 1 },
  { type: "dot",     label: "Dot ball",      isBatEvent: true,  runs: 0 },
];

const BOWL_EVENTS: BallEvent[] = [
  { type: "wicket",  label: "Wicket!! 🎯",  isBatEvent: false, runs: 0 },
  { type: "maiden",  label: "Maiden 🔒",    isBatEvent: false, runs: 0 },
  { type: "dot",     label: "Dot ball",      isBatEvent: false, runs: 0 },
  { type: "run1",    label: "Run given",     isBatEvent: false, runs: 1 },
];

// Weighted random event picker
export function generateEvent(isBatEvent: boolean): BallEvent {
  const r = Math.random();
  if (isBatEvent) {
    if (r < 0.04) return BAT_EVENTS[0];  // six
    if (r < 0.12) return BAT_EVENTS[1];  // four
    if (r < 0.19) return BAT_EVENTS[2];  // wicket
    if (r < 0.35) return BAT_EVENTS[3];  // run2
    if (r < 0.55) return BAT_EVENTS[4];  // run1
    return BAT_EVENTS[5];                 // dot
  } else {
    if (r < 0.07) return BOWL_EVENTS[0]; // wicket
    if (r < 0.14) return BOWL_EVENTS[1]; // maiden
    if (r < 0.45) return BOWL_EVENTS[2]; // dot
    return BOWL_EVENTS[3];               // run given
  }
}

export function applyEventToStats(
  current: Record<string, number>,
  event: BallEvent,
  isBatEvent: boolean
): Record<string, number> {
  const next = { ...current };
  if (event.type === "six")    { next.runs = (next.runs ?? 0) + 6; next.sixes = (next.sixes ?? 0) + 1; }
  if (event.type === "four")   { next.runs = (next.runs ?? 0) + 4; next.fours = (next.fours ?? 0) + 1; }
  if (event.type === "run2" && isBatEvent) next.runs = (next.runs ?? 0) + 2;
  if (event.type === "run1" && isBatEvent) next.runs = (next.runs ?? 0) + 1;
  if (event.type === "wicket" && !isBatEvent) next.wickets = (next.wickets ?? 0) + 1;
  if (event.type === "dot")    next.dots = (next.dots ?? 0) + 1;
  if (event.type === "maiden") { next.maidens = (next.maidens ?? 0) + 1; next.dots = (next.dots ?? 0) + 6; }
  return next;
}
