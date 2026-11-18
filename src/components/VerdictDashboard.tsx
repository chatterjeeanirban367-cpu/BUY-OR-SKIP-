import { useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  MessageSquareText,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import type {
  FakeReviewRiskLevel,
  ProductAuditResult,
  SeverityLevel,
  VerdictType,
} from '../types/audit';
import { formatAuditMarkdownSummary } from '../utils/auditLogic';

interface VerdictDashboardProps {
  audit: ProductAuditResult;
}

function getVerdictPresentation(verdict: VerdictType) {
  switch (verdict) {
    case 'BUY':
      return {
        label: 'BUY',
        sublabel: 'Verified strong buy',
        Icon: CheckCircle2,
        badgeClass: 'border-emerald-300 bg-emerald-50 text-emerald-800',
        meterClass: 'bg-emerald-600',
        scoreTextClass: 'text-emerald-700',
      };
    case 'CAUTION':
      return {
        label: 'CAUTION',
        sublabel: 'Buy with trade-offs',
        Icon: AlertTriangle,
        badgeClass: 'border-amber-300 bg-amber-50 text-amber-900',
        meterClass: 'bg-amber-600',
        scoreTextClass: 'text-amber-700',
      };
    case 'CANCEL / SKIP':
      return {
        label: 'CANCEL / SKIP',
        sublabel: 'High complaint risk',
        Icon: XCircle,
        badgeClass: 'border-red-300 bg-red-50 text-red-800',
        meterClass: 'bg-red-600',
        scoreTextClass: 'text-red-700',
      };
  }
}

function getSeverityMeta(severity: SeverityLevel) {
  switch (severity) {
    case 'High':
      return {
        label: 'High severity',
        textClass: 'text-red-700',
        Icon: ShieldAlert,
      };
    case 'Medium':
      return {
        label: 'Moderate severity',
        textClass: 'text-amber-700',
        Icon: AlertTriangle,
      };
    case 'Low':
      return {
        label: 'Minor note',
        textClass: 'text-slate-600',
        Icon: ShieldCheck,
      };
  }
}

function getFakeRiskPresentation(risk: FakeReviewRiskLevel) {
  switch (risk) {
    case 'High':
      return {
        label: 'High manipulation risk',
        textClass: 'text-red-700',
        surfaceClass: 'border-red-200 bg-red-50/60',
        Icon: ShieldAlert,
      };
    case 'Moderate':
      return {
        label: 'Moderate manipulation risk',
        textClass: 'text-amber-800',
        surfaceClass: 'border-amber-200 bg-amber-50/60',
        Icon: AlertTriangle,
      };
    case 'Low':
      return {
        label: 'Low manipulation risk',
        textClass: 'text-emerald-800',
        surfaceClass: 'border-emerald-200 bg-emerald-50/60',
        Icon: ShieldCheck,
      };
  }
}

function formatDateLabel(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return 'Recently audited';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function VerdictDashboard({ audit }: VerdictDashboardProps) {
  const [copied, setCopied] = useState(false);

  const verdictStyle = getVerdictPresentation(audit.verdict);
  const VerdictIcon = verdictStyle.Icon;
  const fakeRiskStyle = getFakeRiskPresentation(audit.fakeReviewRisk);
  const FakeRiskIcon = fakeRiskStyle.Icon;

  const handleCopySummary = async () => {
    try {
      await navigator.clipboard.writeText(formatAuditMarkdownSummary(audit));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const breakdownItems = [
    { label: 'Build Quality', value: audit.scoreBreakdown.buildQuality },
    { label: 'Longevity', value: audit.scoreBreakdown.longevity },
    { label: 'Customer Support', value: audit.scoreBreakdown.customerSupport },
    { label: 'Review Integrity', value: audit.scoreBreakdown.reviewIntegrity },
  ];

  return (
    <article aria-label={`Audit results for ${audit.productName}`} className="space-y-6">
      {/* 1 & 2. Verdict Badge + Trust & Quality Score Header Sheet */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="grid grid-cols-1 divide-y divide-slate-200 lg:grid-cols-12 lg:divide-x lg:divide-y-0">
          {/* Product Identity & Executive Verdict */}
          <div className="p-6 sm:p-8 lg:col-span-7">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-slate-500">
              <span>{audit.retailer}</span>
              <span aria-hidden="true">·</span>
              <span>{audit.brand}</span>
              <span aria-hidden="true">·</span>
              <span>{audit.category}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums text-slate-700">{audit.estimatedPrice}</span>
              {audit.isSample && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-blue-700">Sample reference audit</span>
                </>
              )}
            </div>

            <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl [text-wrap:balance]">
              {audit.productName}
            </h2>

            <p className="mt-3 text-base font-semibold text-slate-900">{audit.verdictHeadline}</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{audit.executiveSummary}</p>

            <div className="mt-6 flex flex-wrap items-center gap-3 pt-2">
              <a
                href={audit.productUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 whitespace-nowrap shrink-0"
              >
                <span>Open listing on {audit.retailer}</span>
                <ExternalLink className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
              </a>

              <button
                type="button"
                onClick={handleCopySummary}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                    <span>Copied summary</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                    <span>Copy summary</span>
                  </>
                )}
              </button>

              <span className="ml-auto font-mono text-xs text-slate-400 tabular-nums">
                {formatDateLabel(audit.analyzedAt)}
              </span>
            </div>
          </div>

          {/* 1) Bold Verdict Badge + 2) Trust & Quality Score out of 100 */}
          <div className="flex flex-col justify-center gap-6 bg-slate-50/50 p-6 sm:p-8 lg:col-span-5">
            <div>
              <p className="text-xs font-medium text-slate-500">Final Verdict</p>
              <div
                data-testid="verdict-badge"
                className={`mt-2 flex items-center justify-between gap-4 rounded-lg border px-4 py-3.5 ${verdictStyle.badgeClass}`}
              >
                <div className="flex items-center gap-3">
                  <VerdictIcon className="h-6 w-6 shrink-0" aria-hidden="true" />
                  <span className="font-display text-2xl font-bold tracking-tight">
                    {verdictStyle.label}
                  </span>
                </div>
                <span className="text-xs font-semibold">{verdictStyle.sublabel}</span>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-6">
              <div className="flex items-baseline justify-between">
                <p className="text-xs font-medium text-slate-500">Trust &amp; Quality Score</p>
                <div
                  role="meter"
                  aria-label="Trust and Quality Score"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={audit.trustScore}
                  className="flex items-baseline gap-1 font-mono tabular-nums"
                >
                  <span className={`text-4xl font-semibold ${verdictStyle.scoreTextClass}`}>
                    {audit.trustScore}
                  </span>
                  <span className="text-sm font-medium text-slate-400">/ 100</span>
                </div>
              </div>

              <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${verdictStyle.meterClass}`}
                  style={{ width: `${audit.trustScore}%` }}
                />
              </div>

              <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3">
                {breakdownItems.map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-xs">
                    <dt className="text-slate-600">{item.label}</dt>
                    <dd className="font-mono font-semibold text-slate-900 tabular-nums">
                      {item.value}/100
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Top 3 Recurring Dealbreakers */}
      <section aria-labelledby="dealbreakers-heading" className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <h3 id="dealbreakers-heading" className="font-display text-lg font-bold text-slate-900">
            Top 3 Recurring Dealbreakers
          </h3>
          <p className="text-xs text-slate-500">
            Patterns surfaced across long-term owner complaints and forums
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          {audit.topDealbreakers.slice(0, 3).map((item, idx) => {
            const sev = getSeverityMeta(item.severity);
            const SevIcon = sev.Icon;
            return (
              <div
                key={`${item.title}-${idx}`}
                className="flex flex-col justify-between border-t border-slate-200 pt-4 md:border-t-0 md:border-l md:pl-6 first:border-l-0 first:pl-0 first:border-t-0 first:pt-0"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-mono font-semibold text-slate-400 tabular-nums">
                      0{idx + 1}.
                    </span>
                    <span className={`inline-flex items-center gap-1.5 font-semibold ${sev.textClass}`}>
                      <SevIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>{sev.label}</span>
                    </span>
                  </div>

                  <h4 className="mt-2.5 font-display text-base font-bold text-slate-900">
                    {item.title}
                  </h4>
                  <p className="mt-1 text-xs font-medium text-slate-500">{item.frequency}</p>
                  <p className="mt-2.5 text-sm leading-relaxed text-slate-600">{item.summary}</p>
                </div>

                <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
                  Evidence: <span className="text-slate-700">{item.sourceEvidence}</span>
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Who Should Buy vs. Who Should Avoid */}
      <section aria-labelledby="fit-heading" className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4 sm:px-8">
          <h3 id="fit-heading" className="font-display text-lg font-bold text-slate-900">
            Who Should Buy vs. Who Should Avoid
          </h3>
        </div>

        <div className="grid grid-cols-1 divide-y divide-slate-200 md:grid-cols-2 md:divide-x md:divide-y-0">
          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              <h4>Who Should Buy</h4>
            </div>
            <ul className="mt-4 space-y-3">
              {audit.whoShouldBuy.map((point, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-700">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-2 text-sm font-bold text-red-800">
              <XCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <h4>Who Should Avoid</h4>
            </div>
            <ul className="mt-4 space-y-3">
              {audit.whoShouldAvoid.map((point, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-700">
                  <XCircle className="mt-1 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 5. Fake Review Red Flags & Grounded Discussions */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Fake Review Red Flags */}
        <div
          aria-labelledby="fake-reviews-heading"
          className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 lg:col-span-7"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 id="fake-reviews-heading" className="font-display text-lg font-bold text-slate-900">
              Fake Review Red Flags
            </h3>
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${fakeRiskStyle.textClass}`}>
              <FakeRiskIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{fakeRiskStyle.label}</span>
            </span>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-slate-600">{audit.fakeReviewSummary}</p>

          <ul className="mt-5 divide-y divide-slate-100 border-t border-slate-100">
            {audit.fakeReviewRedFlags.map((flag, i) => {
              const sev = getSeverityMeta(flag.severity);
              return (
                <li key={`${flag.signal}-${i}`} className="py-4 first:pt-4 last:pb-0">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-semibold text-slate-900">{flag.signal}</span>
                    <span className={`text-xs font-semibold whitespace-nowrap ${sev.textClass}`}>
                      {sev.label}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{flag.detail}</p>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Reddit Consensus & Grounded Sources */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 sm:p-8 lg:col-span-5">
          <div>
            <div className="flex items-center gap-2 text-slate-900">
              <MessageSquareText className="h-4 w-4 text-slate-600" aria-hidden="true" />
              <h3 className="font-display text-lg font-bold">Reddit &amp; Forum Consensus</h3>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">{audit.redditConsensus}</p>
          </div>

          <div className="mt-6 border-t border-slate-200 pt-5">
            <h4 className="text-xs font-semibold text-slate-500">
              Inspected Sources ({audit.groundedSources.length})
            </h4>

            {audit.groundedSources.length > 0 ? (
              <ul className="mt-3 space-y-2.5">
                {audit.groundedSources.map((src) => (
                  <li key={src.url} className="flex items-start justify-between gap-3 text-xs">
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="line-clamp-1 font-medium text-slate-800 underline decoration-slate-300 underline-offset-4 hover:text-blue-700 hover:decoration-blue-600"
                    >
                      {src.title}
                    </a>
                    <span className="shrink-0 font-mono text-[11px] text-slate-400">
                      {src.sourceType === 'reddit'
                        ? 'reddit'
                        : src.sourceType === 'product_page'
                          ? 'listing'
                          : 'web'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-slate-500">
                Analyzed from the resolved product listing on {audit.domain}.
              </p>
            )}
          </div>
        </div>
      </section>
    </article>
  );
}
