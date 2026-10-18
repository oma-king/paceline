import type { LiveCapture, RateWindow } from '@paceline/shared';

export interface WindowState {
  pct: number;
  resetsAt: number | null;
}

export type LimitSource = 'claude-code' | 'claude-ai' | 'codex' | 'mixed' | 'stale' | 'none';

export interface ResolvedLimits {
  fiveHour: WindowState | null;
  sevenDay: WindowState | null;
  source: LimitSource;
  updatedAt: number | null;
}

export interface FallbackReading {
  fetchedAt: number;
  fiveHour: RateWindow | null;
  sevenDay: RateWindow | null;
}

interface LimitReading {
  at: number;
  fiveHour: RateWindow | null;
  sevenDay: RateWindow | null;
  source: Exclude<LimitSource, 'mixed' | 'stale' | 'none'>;
}

export const STALE_MS = 15 * 60_000;
export const NO_LIMITS: ResolvedLimits = { fiveHour: null, sevenDay: null, source: 'none', updatedAt: null };

/** A window whose reset time has passed is known to be empty, even if the reading is old. */
function toWindow(w: RateWindow | null, now: number): WindowState | null {
  if (!w) return null;
  return now >= w.resetsAt ? { pct: 0, resetsAt: null } : { pct: w.usedPct, resetsAt: w.resetsAt };
}

export function resolveLimits(i: { capture: LiveCapture | null; codexCapture?: LiveCapture | null; fallback: FallbackReading | null; now: number }): ResolvedLimits {
  const readings: LimitReading[] = [
    i.capture && { at: i.capture.capturedAt, fiveHour: i.capture.fiveHour, sevenDay: i.capture.sevenDay, source: 'claude-code' as const },
    i.codexCapture && { at: i.codexCapture.capturedAt, fiveHour: i.codexCapture.fiveHour, sevenDay: i.codexCapture.sevenDay, source: 'codex' as const },
    i.fallback && { at: i.fallback.fetchedAt, fiveHour: i.fallback.fiveHour, sevenDay: i.fallback.sevenDay, source: 'claude-ai' as const },
  ].filter(Boolean) as LimitReading[];
  if (readings.length === 0) return NO_LIMITS;
  const fresh = readings.filter((r) => i.now - r.at < STALE_MS);
  const freshLive = fresh.filter((r) => r.source !== 'claude-ai');
  const pickCandidates = freshLive.length > 0 ? freshLive : fresh;
  const pick = (pickCandidates.length > 0 ? pickCandidates : readings).reduce((a, b) => (b.at > a.at ? b : a));
  const chooseWindow = (key: 'fiveHour' | 'sevenDay'): { reading: LimitReading; window: RateWindow | null } => {
    const available = (freshLive.length > 0 ? freshLive : fresh).filter((r) => r[key] !== null);
    if (available.length === 0) return { reading: pick, window: pick[key] };
    const reading = available.reduce((a, b) => (b[key]!.usedPct > a[key]!.usedPct ? b : a));
    return { reading, window: reading[key] };
  };
  const five = chooseWindow('fiveHour');
  const seven = chooseWindow('sevenDay');
  const liveSources = new Set(freshLive.map((r) => r.source));
  const source = liveSources.size > 1 ? 'mixed' : five.reading.source === seven.reading.source ? five.reading.source : fresh.length > 1 ? 'mixed' : pick.source;
  return {
    fiveHour: toWindow(five.window, i.now),
    sevenDay: toWindow(seven.window, i.now),
    source: fresh.length > 0 ? source : 'stale',
    updatedAt: pick.at,
  };
}
