import Anthropic from "@anthropic-ai/sdk";
import { getFixtureById } from "@/lib/data/fixtures";
import { PLAYERS } from "@/lib/data/players";

interface AiTipsRequest {
  matchId: number;
  selectedPlayerIds: number[];
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AiTipsRequest;
    const fixture = getFixtureById(Number(body.matchId));

    if (!fixture || !Array.isArray(body.selectedPlayerIds)) {
      return Response.json({ error: "Invalid request payload" }, { status: 400 });
    }

    const selectedPlayers = PLAYERS.filter((player) => body.selectedPlayerIds.includes(player.id));
    const fallbackTips = [
      `Stack reliable top-order players from ${fixture.home} and ${fixture.away} for safer floor points.`,
      "Use an all-rounder as captain when you want dual scoring upside from bat and ball.",
      "Leave at least one differential pick under 40% selection to gain leaderboard leverage.",
    ];

    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json({ tips: fallbackTips });
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const prompt = `You are a fantasy cricket assistant. Return exactly 3 short actionable fantasy tips as a JSON array of strings for this match. Match: ${fixture.home} vs ${fixture.away} at ${fixture.venue}. Selected players: ${selectedPlayers.map((player) => `${player.full} (${player.role}, ${player.team}, ${player.cr} cr)`).join(", ") || "None"}.`;

    const completion = await anthropic.messages.create({
      model: "claude-3-5-sonnet-latest",
      max_tokens: 250,
      temperature: 0.4,
      messages: [{ role: "user", content: prompt }],
    });

    const text = completion.content
      .filter((item) => item.type === "text")
      .map((item) => item.text)
      .join("\n")
      .trim();

    const parsed = safeParseTips(text) ?? fallbackTips;
    return Response.json({ tips: parsed.slice(0, 3) });
  } catch (error) {
    console.error("ai-tips route error", error);
    return Response.json({ tips: ["Back your in-form openers.", "Balance stars with value picks.", "Prefer all-rounders for captaincy."], error: "Unable to generate AI tips" }, { status: 500 });
  }
}

function safeParseTips(text: string): string[] | null {
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const candidate = jsonMatch ? jsonMatch[0] : text;
    const parsed = JSON.parse(candidate);
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) {
      return parsed;
    }
    return null;
  } catch {
    const lines = text.split("\n").map((line) => line.replace(/^[-*\d.\s]+/, "").trim()).filter(Boolean);
    return lines.length ? lines.slice(0, 3) : null;
  }
}
