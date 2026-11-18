interface HeaderProps {
  historyCount: number;
  onNewAudit: () => void;
  onNavigate: (sectionId: string) => void;
}

export function Header({ historyCount, onNewAudit, onNavigate }: HeaderProps) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-4 py-4 sm:px-6">
        <a
          href="#investigate"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('investigate');
          }}
          className="font-display text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-900"
        >
          Buy or Skip
        </a>

        <nav aria-label="Primary" className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
          <a
            href="#investigate"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('investigate');
            }}
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Investigate
          </a>
          <a
            href="#history"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('history');
            }}
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Saved Audits ({historyCount})
          </a>
          <a
            href="#methodology"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('methodology');
            }}
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Methodology
          </a>
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onNewAudit}
            className="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
          >
            New Audit
          </button>
        </div>
      </div>
    </header>
  );
}
