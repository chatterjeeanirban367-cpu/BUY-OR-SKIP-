import { useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowUpRight, RefreshCw, ShieldCheck } from 'lucide-react';
import { AuditHistorySection } from './components/AuditHistorySection';
import { Header } from './components/Header';
import { LoadingInvestigation } from './components/LoadingInvestigation';
import { MethodologySection } from './components/MethodologySection';
import { UrlInputPanel } from './components/UrlInputPanel';
import { VerdictDashboard } from './components/VerdictDashboard';
import { SAMPLE_AUDITS } from './data/sampleAudits';
import type { ProductAuditResult } from './types/audit';

const STORAGE_KEY = 'buy_or_skip_history_v1';
const MAX_HISTORY_ITEMS = 12;

function loadStoredHistory(): ProductAuditResult[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ProductAuditResult[]) : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [urlInput, setUrlInput] = useState('');
  const [history, setHistory] = useState<ProductAuditResult[]>(() => loadStoredHistory());
  const [activeAudit, setActiveAudit] = useState<ProductAuditResult | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        return SAMPLE_AUDITS[0];
      }
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [pendingUrl, setPendingUrl] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch {
      // Ignore storage quota issues gracefully
    }
  }, [history]);

  const handleAnalyzeUrl = async (normalizedUrl: string) => {
    setApiError(null);
    setIsLoading(true);
    setPendingUrl(normalizedUrl);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalizedUrl }),
      });

      const data = (await response.json()) as {
        audit?: ProductAuditResult;
        error?: string;
      };

      if (!response.ok || !data.audit) {
        throw new Error(data.error || `Request failed with status ${response.status}.`);
      }

      const freshAudit = data.audit;
      setActiveAudit(freshAudit);
      setHistory((prev) => {
        const withoutSameUrl = prev.filter((item) => item.productUrl !== freshAudit.productUrl);
        return [freshAudit, ...withoutSameUrl].slice(0, MAX_HISTORY_ITEMS);
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Unable to reach the audit server. Please try again.';
      setApiError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadSample = () => {
    setApiError(null);
    const sample = SAMPLE_AUDITS[0];
    setUrlInput(sample.productUrl);
    setActiveAudit(sample);
  };

  const handleNewAudit = () => {
    setApiError(null);
    setUrlInput('');
    setActiveAudit(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.setTimeout(() => inputRef.current?.focus(), 150);
  };

  const handleNavigate = (sectionId: string) => {
    const target = document.getElementById(sectionId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleDeleteHistoryItem = (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
    if (activeAudit?.id === id) {
      setActiveAudit(null);
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
    if (activeAudit && !activeAudit.isSample) {
      setActiveAudit(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header
        historyCount={history.length}
        onNewAudit={handleNewAudit}
        onNavigate={handleNavigate}
      />

      <main className="flex-1">
        <UrlInputPanel
          urlValue={urlInput}
          onUrlChange={setUrlInput}
          onSubmitUrl={handleAnalyzeUrl}
          onLoadSample={handleLoadSample}
          isLoading={isLoading}
          inputRef={inputRef}
        />

        <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 sm:py-10">
          {apiError && (
            <div
              role="alert"
              className="flex flex-col gap-4 rounded-xl border border-red-200 bg-red-50/70 p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" aria-hidden="true" />
                <div>
                  <h2 className="text-sm font-bold text-red-900">Audit Could Not Complete</h2>
                  <p className="mt-1 text-sm text-red-800">{apiError}</p>
                </div>
              </div>

              {pendingUrl && (
                <button
                  type="button"
                  onClick={() => handleAnalyzeUrl(pendingUrl)}
                  className="inline-flex min-h-[40px] items-center justify-center gap-2 self-start rounded-lg border border-red-300 bg-white px-4 py-2 text-xs font-semibold text-red-800 transition-colors hover:bg-red-50 sm:self-auto whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Retry Audit</span>
                </button>
              )}
            </div>
          )}

          {isLoading ? (
            <LoadingInvestigation targetUrl={pendingUrl} />
          ) : activeAudit ? (
            <VerdictDashboard audit={activeAudit} />
          ) : (
            <section
              aria-label="Ready to investigate"
              className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8"
            >
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-2xl">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <ShieldCheck className="h-4 w-4 text-slate-700" aria-hidden="true" />
                    <span>Ready for URL Inspection</span>
                  </div>
                  <h2 className="mt-2 font-display text-xl font-bold text-slate-900">
                    Paste any storefront link above to generate a 5-point buyer verdict
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    Each report surfaces a bold Buy, Caution, or Cancel verdict, a 0–100 Trust &amp; Quality Score, the top 3 recurring dealbreakers, who should buy vs. avoid, and fake review red flags backed by web and Reddit citations.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={handleLoadSample}
                    className="inline-flex min-h-[42px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>Inspect Sample Audit</span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </section>
          )}

          <AuditHistorySection
            history={history}
            activeAuditId={activeAudit?.id ?? null}
            onSelectAudit={(selected) => {
              setApiError(null);
              setUrlInput(selected.productUrl);
              setActiveAudit(selected);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onDeleteAudit={handleDeleteHistoryItem}
            onClearHistory={handleClearHistory}
          />

          <MethodologySection />
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span className="font-medium text-slate-700">
            Buy or Skip — Consumer Product Due Diligence
          </span>
          <span>
            Always verify final seller details and return policies before purchasing.
          </span>
        </div>
      </footer>
    </div>
  );
}
