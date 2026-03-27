// worker/lib/claude.ts
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const FALLBACK_TEMPLATES = [
  (home: string) => `Will ${home} win the match?`,
  () => `Will there be a Super Over?`,
  (home: string) => `Will ${home} post 180+ runs?`,
];

export async function generateMarketTitles(
  homeTeam: string,
  awayTeam: string,
  matchDate: Date
): Promise<string[]> {
  try {
    const msg = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: `Generate 3-5 YES/NO prediction market questions for this IPL match:
${homeTeam} vs ${awayTeam} on ${matchDate.toDateString()}.

Rules:
- Each question must be answerable YES or NO from match scorecard data
- Vary the questions (win, player performance, match milestones)
- Keep questions short and clear

Return ONLY a JSON array of strings, e.g.: ["Will ${homeTeam} win?", "Will there be a Super Over?"]`,
      }],
    });

    const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('No JSON array in response');
    const titles: unknown = JSON.parse(match[0]);
    if (!Array.isArray(titles)) throw new Error('Not an array');
    return (titles as unknown[]).filter((t): t is string => typeof t === 'string').slice(0, 5);
  } catch {
    return FALLBACK_TEMPLATES.map(fn => fn(homeTeam));
  }
}
