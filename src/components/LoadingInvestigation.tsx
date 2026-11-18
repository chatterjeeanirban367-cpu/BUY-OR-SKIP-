import { useEffect, useState } from 'react';
import { Globe, Search, ShieldCheck } from 'lucide-react';

const INVESTIGATION_STEPS = [
  {
    label: 'Reading product listing details via URL Context',
    icon: Globe,
  },
  {
    label: 'Searching Reddit discussions & durability complaints',
    icon: Search,
  },
  {
    label: 'Checking review velocity & fake-review red flags',
    icon: ShieldCheck,
  },
];

interface LoadingInvestigationProps {
  targetUrl: string;
}

export function LoadingInvestigation({ targetUrl }: LoadingInvestigationProps) {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveStep((prev) => (prev < INVESTIGATION_STEPS.length - 1 ? prev + 1 : prev));
    }, 2800);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8"
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">Live URL Context Investigation</p>
          <h2 className="mt-1 font-display text-xl font-bold text-slate-900">
            Auditing product claims, durability risks, and review patterns
          </h2>
          <p className="mt-1 max-w-2xl truncate font-mono text-xs text-slate-500">{targetUrl}</p>
        </div>

        <div className="flex flex-col gap-2.5 sm:min-w-[320px]">
          {INVESTIGATION_STEPS.map((step, index) => {
            const Icon = step.icon;
            const isCurrent = index === activeStep;
            const isDone = index < activeStep;
            return (
              <div
                key={step.label}
                className={`flex items-center gap-3 rounded-lg border px-3.5 py-2 text-xs font-medium transition-colors ${
                  isCurrent
                    ? 'border-slate-900 bg-slate-50 text-slate-900'
                    : isDone
                      ? 'border-emerald-200 bg-emerald-50/50 text-emerald-800'
                      : 'border-slate-200 bg-white text-slate-400'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{step.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 border-t border-slate-100 pt-8 md:grid-cols-3">
        {[1, 2, 3].map((slot) => (
          <div key={slot} className="space-y-3">
            <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
            <div className="h-5 w-4/5 animate-pulse rounded bg-slate-200" />
            <div className="h-3.5 w-full animate-pulse rounded bg-slate-100" />
            <div className="h-3.5 w-5/6 animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
