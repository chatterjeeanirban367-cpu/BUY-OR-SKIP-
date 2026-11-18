import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, Link2, RotateCcw } from 'lucide-react';
import { QUICK_URL_PRESETS } from '../data/sampleAudits';
import { validateProductUrl } from '../utils/auditLogic';

interface UrlInputPanelProps {
  urlValue: string;
  onUrlChange: (value: string) => void;
  onSubmitUrl: (normalizedUrl: string) => void;
  onLoadSample: () => void;
  isLoading: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export function UrlInputPanel({
  urlValue,
  onUrlChange,
  onSubmitUrl,
  onLoadSample,
  isLoading,
  inputRef,
}: UrlInputPanelProps) {
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setValidationError(null);
  }, [urlValue]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const check = validateProductUrl(urlValue);
    if (!check.valid) {
      setValidationError(check.error ?? 'Please enter a valid product URL.');
      inputRef?.current?.focus();
      return;
    }
    setValidationError(null);
    onUrlChange(check.normalizedUrl);
    onSubmitUrl(check.normalizedUrl);
  };

  const handlePresetClick = (presetUrl: string) => {
    setValidationError(null);
    onUrlChange(presetUrl);
    onSubmitUrl(presetUrl);
  };

  return (
    <section id="investigate" className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="max-w-3xl">
          <p className="text-xs font-medium tracking-wide text-slate-500">
            Product Due Diligence &amp; Review Forensics
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl [text-wrap:balance]">
            Check if it’s actually worth buying before you check out.
          </h1>
          <p className="mt-3 text-base leading-relaxed text-slate-600">
            Paste any Amazon, Flipkart, Best Buy, or retail product link. We inspect the listing and search real buyer complaints, durability reports, and Reddit threads to surface what five-star ratings hide.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="mt-7 max-w-4xl">
          <label htmlFor="product-url-input" className="sr-only">
            E-commerce product URL
          </label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <div className="relative flex-1">
              <Link2
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                ref={inputRef}
                id="product-url-input"
                type="url"
                inputMode="url"
                value={urlValue}
                onChange={(e) => {
                  onUrlChange(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                placeholder="https://www.amazon.com/dp/... or Flipkart / Best Buy link"
                aria-invalid={Boolean(validationError)}
                aria-describedby={validationError ? 'url-error-message' : undefined}
                disabled={isLoading}
                className={`min-h-[48px] w-full rounded-lg border bg-slate-50 pl-10 pr-11 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:bg-white focus:outline-2 focus:outline-offset-0 ${
                  validationError
                    ? 'border-red-500 focus:outline-red-600'
                    : 'border-slate-300 focus:border-slate-900 focus:outline-slate-900'
                }`}
              />
              {urlValue && !isLoading && (
                <button
                  type="button"
                  onClick={() => {
                    onUrlChange('');
                    setValidationError(null);
                    inputRef?.current?.focus();
                  }}
                  aria-label="Clear product URL"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1.5 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>{isLoading ? 'Investigating...' : 'Audit Product'}</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {validationError && (
            <p id="url-error-message" role="alert" className="mt-2 text-sm font-medium text-red-700">
              {validationError}
            </p>
          )}
        </form>

        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600">
          <span className="font-medium text-slate-500">Test a live product URL:</span>
          {QUICK_URL_PRESETS.map((preset) => (
            <button
              key={preset.url}
              type="button"
              disabled={isLoading}
              onClick={() => handlePresetClick(preset.url)}
              className="font-medium text-slate-700 underline decoration-slate-300 underline-offset-4 transition-colors hover:text-slate-950 hover:decoration-slate-900 disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {preset.label} ({preset.store})
            </button>
          ))}
          <span className="text-slate-300" aria-hidden="true">
            |
          </span>
          <button
            type="button"
            disabled={isLoading}
            onClick={onLoadSample}
            className="font-semibold text-blue-700 underline decoration-blue-300 underline-offset-4 transition-colors hover:text-blue-900 hover:decoration-blue-700 disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            Preview sample report
          </button>
        </div>
      </div>
    </section>
  );
}
