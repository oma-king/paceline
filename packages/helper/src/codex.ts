import { spawn } from 'node:child_process';
import type { LiveCapture } from '@paceline/shared';

interface RateWindow {
  usedPercent?: unknown;
  windowDurationMins?: unknown;
  resetsAt?: unknown;
}

interface RateLimits {
  primary?: RateWindow | null;
  secondary?: RateWindow | null;
}

interface RpcMessage {
  id?: unknown;
  result?: { rateLimits?: RateLimits };
}

export type CodexRateResult = { ok: true; capture: LiveCapture } | { ok: false; reason: string };

const TIMEOUT_MS = 15_000;
const CACHE_MS = 60_000;
let cached: { at: number; capture: LiveCapture } | null = null;

function windowFor(w: RateWindow | null | undefined): { usedPct: number; resetsAt: number } | null {
  if (!w || typeof w.usedPercent !== 'number' || !Number.isFinite(w.usedPercent) || typeof w.resetsAt !== 'number' || !Number.isFinite(w.resetsAt)) return null;
  return {
    usedPct: Math.max(0, Math.min(100, w.usedPercent)),
    resetsAt: w.resetsAt > 1e12 ? w.resetsAt : w.resetsAt * 1_000,
  };
}

function executable(): { command: string; args: string[] } {
  if (process.platform === 'win32') {
    return { command: process.env.ComSpec ?? 'cmd.exe', args: ['/d', '/s', '/c', 'codex app-server --stdio'] };
  }
  return { command: 'codex', args: ['app-server', '--stdio'] };
}

export function parseCodexRateResponse(message: RpcMessage, now = Date.now()): CodexRateResult {
  const limits = message.result?.rateLimits;
  if (!limits) return { ok: false, reason: 'Codex returned no rate limits' };
  const primary = windowFor(limits.primary);
  const secondary = windowFor(limits.secondary);
  if (!primary && !secondary) return { ok: false, reason: 'Codex returned no usage windows' };
  return {
    ok: true,
    capture: {
      capturedAt: now,
      sessionId: null,
      model: null,
      fiveHour: primary && (primary.resetsAt - now > 0 ? { ...primary } : { usedPct: 0, resetsAt: primary.resetsAt }),
      sevenDay: secondary && (secondary.resetsAt - now > 0 ? { ...secondary } : { usedPct: 0, resetsAt: secondary.resetsAt }),
    },
  };
}

export function readCodexRateLimits(): Promise<CodexRateResult> {
  if (cached && Date.now() - cached.at < CACHE_MS) return Promise.resolve({ ok: true, capture: cached.capture });
  return new Promise((resolve) => {
    const bin = executable();
    const child = spawn(bin.command, bin.args, { stdio: ['pipe', 'pipe', 'ignore'], windowsHide: true });
    let output = '';
    let settled = false;
    const finish = (result: CodexRateResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.kill();
      resolve(result);
    };
    const timer = setTimeout(() => finish({ ok: false, reason: 'Codex app-server timed out' }), TIMEOUT_MS);
    child.on('error', (e) => finish({ ok: false, reason: `Codex app-server unavailable: ${e.message}` }));
    child.stdout.on('data', (chunk: Buffer) => {
      output += chunk.toString();
      let newline: number;
      while ((newline = output.indexOf('\n')) >= 0) {
        const line = output.slice(0, newline);
        output = output.slice(newline + 1);
        let message: RpcMessage;
        try {
          message = JSON.parse(line) as RpcMessage;
        } catch {
          continue;
        }
        if (message.id !== 2) continue;
        const result = parseCodexRateResponse(message);
        if (result.ok) cached = { at: Date.now(), capture: result.capture };
        finish(result);
      }
    });
    const send = (message: object) => child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', ...message })}\n`);
    send({ method: 'initialize', id: 1, params: { clientInfo: { name: 'paceline', title: 'Paceline', version: '0.1.0' } } });
    setTimeout(() => {
      if (!settled) {
        send({ method: 'initialized', params: {} });
        send({ method: 'account/rateLimits/read', id: 2, params: { excludeResetCreditDetails: true } });
      }
    }, 100);
  });
}
