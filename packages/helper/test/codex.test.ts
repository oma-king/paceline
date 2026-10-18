import { describe, expect, it } from 'vitest';
import { parseCodexRateResponse } from '../src/codex';

describe('parseCodexRateResponse', () => {
  it('maps primary and secondary windows to Paceline windows', () => {
    const result = parseCodexRateResponse({
      id: 2,
      result: {
        rateLimits: {
          primary: { usedPercent: 37, resetsAt: 1_800_000_000 },
          secondary: { usedPercent: 62, resetsAt: 1_800_600_000 },
        },
      },
    }, 1_700_000_000_000);

    expect(result).toEqual({
      ok: true,
      capture: {
        capturedAt: 1_700_000_000_000,
        sessionId: null,
        model: null,
        fiveHour: { usedPct: 37, resetsAt: 1_800_000_000_000 },
        sevenDay: { usedPct: 62, resetsAt: 1_800_600_000_000 },
      },
    });
  });

  it('accepts a response with only one window', () => {
    const result = parseCodexRateResponse({
      result: { rateLimits: { primary: { usedPercent: 10, resetsAt: 1_800_000_000 } } },
    }, 1_700_000_000_000);
    expect(result.ok && result.capture.sevenDay).toBeNull();
  });

  it('marks expired windows as empty', () => {
    const result = parseCodexRateResponse({
      result: { rateLimits: { primary: { usedPercent: 80, resetsAt: 1_600_000_000 } } },
    }, 1_700_000_000_000);
    expect(result.ok && result.capture.fiveHour).toEqual({ usedPct: 0, resetsAt: 1_600_000_000_000 });
  });

  it('rejects missing or malformed limits', () => {
    expect(parseCodexRateResponse({ result: {} }).ok).toBe(false);
    expect(parseCodexRateResponse({ result: { rateLimits: { primary: { usedPercent: '80', resetsAt: 1 } } } }).ok).toBe(false);
  });
});
