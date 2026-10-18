import type { ProviderFilter } from '@paceline/shared';

const LABELS: Record<ProviderFilter, string> = { all: 'All', 'claude-code': 'Claude Code', codex: 'Codex' };

export function ProviderTabs({ selected, onSelect }: { selected: ProviderFilter; onSelect: (provider: ProviderFilter) => void }) {
  return (
    <div className="tabs provider-tabs" role="tablist" aria-label="Provider">
      {(Object.keys(LABELS) as ProviderFilter[]).map((provider) => (
        <button key={provider} type="button" role="tab" aria-selected={selected === provider} onClick={() => onSelect(provider)}>
          {LABELS[provider]}
        </button>
      ))}
    </div>
  );
}
