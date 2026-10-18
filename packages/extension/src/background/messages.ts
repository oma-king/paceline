import { browser } from 'wxt/browser';
import type { ProviderFilter, WindowKey } from '@paceline/shared';
import type { RefreshOutcome } from './refresh';

export type PopupMessage = { type: 'refresh'; window: WindowKey; provider?: ProviderFilter } | { type: 'consumeCelebration' };

export function requestRefresh(window: WindowKey, provider: ProviderFilter = 'all'): Promise<RefreshOutcome> {
  return browser.runtime.sendMessage({ type: 'refresh', window, provider } satisfies PopupMessage);
}

export function consumeCelebration(): Promise<unknown> {
  return browser.runtime.sendMessage({ type: 'consumeCelebration' } satisfies PopupMessage);
}
