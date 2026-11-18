import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Search, Trash2, XCircle } from 'lucide-react';
import type { ProductAuditResult, VerdictType } from '../types/audit';
import { filterAuditHistory } from '../utils/auditLogic';

interface AuditHistorySectionProps {
  history: ProductAuditResult[];
  activeAuditId: string | null;
  onSelectAudit: (audit: ProductAuditResult) => void;
  onDeleteAudit: (id: string) => void;
  onClearHistory: () => void;
}

const FILTER_OPTIONS: Array<{ label: string; value: 'ALL' | VerdictType }> = [
  { label: 'All', value: 'ALL' },
  { label: 'Buy', value: 'BUY' },
  { label: 'Caution', value: 'CAUTION' },
  { label: 'Cancel / Skip', value: 'CANCEL / SKIP' },
];

export function AuditHistorySection({
  history,
  activeAuditId,
  onSelectAudit,
  onDeleteAudit,
  onClearHistory,
}: AuditHistorySectionProps) {
  const [verdictFilter, setVerdictFilter] = useState<'ALL' | VerdictType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = filterAuditHistory(history, verdictFilter, searchQuery);

  return (
    <section id="history" aria-labelledby="history-heading" className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="history-heading" className="font-display text-lg font-bold text-slate-900">
            Saved Audits
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Compare products you have already investigated in this browser
          </p>
        </div>

        {history.length > 0 && (
          <button
            type="button"
            onClick={onClearHistory}
            className="self-start text-xs font-medium text-slate-500 underline decoration-slate-300 underline-offset-4 hover:text-red-700 hover:decoration-red-400 sm:self-auto cursor-pointer"
          >
            Clear saved history
          </button>
        )}
      </div>

      {history.length > 0 && (
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1" role="group" aria-label="Filter saved audits by verdict">
            {FILTER_OPTIONS.map((option) => {
              const active = verdictFilter === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setVerdictFilter(option.value)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:w-64">
            <label htmlFor="history-search" className="sr-only">
              Search saved audits
            </label>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              id="history-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by name or store..."
              className="min-h-[38px] w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none"
            />
          </div>
        </div>
      )}

      {history.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm font-medium text-slate-700">No saved product audits yet.</p>
          <p className="mt-1 text-xs text-slate-500">
            Paste any e-commerce product URL above to run your first forensic check.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-slate-600">No saved audits match your current filter.</p>
        </div>
      ) : (
        <ul className="mt-5 divide-y divide-slate-100">
          {filtered.map((item) => {
            const isSelected = item.id === activeAuditId;
            const VerdictIcon =
              item.verdict === 'BUY'
                ? CheckCircle2
                : item.verdict === 'CAUTION'
                  ? AlertTriangle
                  : XCircle;
            const verdictColor =
              item.verdict === 'BUY'
                ? 'text-emerald-700'
                : item.verdict === 'CAUTION'
                  ? 'text-amber-800'
                  : 'text-red-700';

            return (
              <li
                key={item.id}
                className={`flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between ${
                  isSelected ? 'bg-slate-50/80 -mx-3 px-3 rounded-lg' : ''
                }`}
              >
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => onSelectAudit(item)}
                    className="block w-full text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 cursor-pointer"
                  >
                    <p className="truncate text-sm font-semibold text-slate-900 hover:underline underline-offset-4">
                      {item.productName}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {item.retailer} · {item.category} · {item.estimatedPrice}
                    </p>
                  </button>
                </div>

                <div className="flex items-center justify-between gap-5 sm:justify-end shrink-0">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${verdictColor}`}>
                    <VerdictIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{item.verdict}</span>
                  </span>

                  <span className="font-mono text-xs font-semibold text-slate-800 tabular-nums">
                    {item.trustScore}/100
                  </span>

                  <button
                    type="button"
                    onClick={() => onDeleteAudit(item.id)}
                    aria-label={`Remove ${item.productName} from history`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
