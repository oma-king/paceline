/** USD per million tokens, from the provider API price lists (cached 2026-10-06). */
export interface ModelPrice {
  input: number;
  output: number;
  cacheWrite5m: number;
  cacheWrite1h: number;
  cacheRead: number;
}

/** Token counts for one request. */
export interface Usage {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite5m: number;
  cacheWrite1h: number;
}

export const PRICING_AS_OF = '2026-10-06';

// Cache writes cost 1.25x input (5-minute TTL) and 2x input (1-hour TTL).
// Cache reads differ per model, so they are listed explicitly.
const row = (input: number, output: number, cacheRead: number): ModelPrice => ({
  input,
  output,
  cacheWrite5m: input * 1.25,
  cacheWrite1h: input * 2,
  cacheRead,
});

export const PRICES: Record<string, ModelPrice> = {
  // Codex API-equivalent pricing is only used for models explicitly listed by OpenAI.
  'gpt-5.3-codex': row(1.75, 14, 0.175),
  'gpt-5': row(1.25, 10, 0.125),
  'gpt-5-mini': row(0.25, 2, 0.025),
  'o3': row(2, 8, 0.5),
  'o4-mini': row(1.1, 4.4, 0.275),
  'claude-fable-5-1': row(10, 50, 0.25),
  'claude-mythos-5-1': row(10, 50, 0.25),
  'claude-fable-5': row(10, 50, 1),
  'claude-mythos-5': row(10, 50, 1),
  'claude-opus-5-5': row(4, 20, 0.2),
  'claude-opus-5': row(5, 25, 0.5),
  'claude-opus-4-8': row(5, 25, 0.5),
  'claude-opus-4-7': row(5, 25, 0.5),
  'claude-opus-4-6': row(5, 25, 0.5),
  'claude-sonnet-5-5': row(2, 10, 0.2),
  'claude-sonnet-5': row(2, 10, 0.2),
  'claude-sonnet-4-6': row(3, 15, 0.3),
  // Haiku 5.5 costs 5x more above 100k-token prompts; we price the common case.
  'claude-haiku-5-5': row(0.1, 0.5, 0.01),
  'claude-haiku-4-5': row(1, 5, 0.1),
};

const FAMILY_FALLBACK: [family: string, id: string][] = [
  ['fable', 'claude-fable-5-1'],
  ['mythos', 'claude-mythos-5-1'],
  ['opus', 'claude-opus-5-5'],
  ['sonnet', 'claude-sonnet-5-5'],
  ['haiku', 'claude-haiku-5-5'],
];
const CODEX_FALLBACK: [family: string, id: string][] = [
  ['codex', 'gpt-5.3-codex'],
  ['gpt-5', 'gpt-5'],
  ['o4-mini', 'o4-mini'],
  ['o3', 'o3'],
];
const DEFAULT_ID = 'claude-sonnet-5-5';
// What may follow a known id and still mean that model: date stamps and "[1m]"-style tags.
const ALLOWED_SUFFIX = /^(?:-\d{8}|\[[^\]]*\])*$/;

export interface PriceLookup {
  id: string;
  price: ModelPrice;
  estimated: boolean;
}

export function priceFor(model: string): PriceLookup {
  const m = model.trim().toLowerCase();
  let best: string | null = null;
  for (const key of Object.keys(PRICES)) {
    if (m.startsWith(key) && ALLOWED_SUFFIX.test(m.slice(key.length)) && (best === null || key.length > best.length)) {
      best = key;
    }
  }
  if (best !== null) return { id: best, price: PRICES[best]!, estimated: false };
  for (const [family, id] of FAMILY_FALLBACK) {
    if (m.includes(family)) return { id, price: PRICES[id]!, estimated: true };
  }
  for (const [family, id] of CODEX_FALLBACK) {
    if (m.includes(family)) return { id, price: PRICES[id]!, estimated: true };
  }
  return { id: DEFAULT_ID, price: PRICES[DEFAULT_ID]!, estimated: true };
}

export function costUsd(u: Usage, p: ModelPrice): number {
  return (
    (u.input * p.input +
      u.output * p.output +
      u.cacheRead * p.cacheRead +
      u.cacheWrite5m * p.cacheWrite5m +
      u.cacheWrite1h * p.cacheWrite1h) /
    1_000_000
  );
}
