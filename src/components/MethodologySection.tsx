export function MethodologySection() {
  const pillars = [
    {
      index: '01.',
      title: 'Redirect & Metadata Resolution',
      description:
        'Resolves shortened store links and extracts canonical listing titles, descriptions, and product identifiers before analysis.',
    },
    {
      index: '02.',
      title: 'Live URL Context Inspection',
      description:
        'Reads the exact product page via Gemini URL Context to verify specifications, materials, and listed claims directly from the storefront.',
    },
    {
      index: '03.',
      title: 'Durability & Review Forensics',
      description:
        'Evaluates known hardware weak points, warranty friction, community consensus, and review-manipulation red flags.',
    },
  ];

  return (
    <section id="methodology" aria-labelledby="methodology-heading" className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
      <div className="max-w-2xl">
        <h2 id="methodology-heading" className="font-display text-lg font-bold text-slate-900">
          How Every Verdict Is Built
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Every product URL triggers a server-side link check paired with live URL Context inspection.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 border-t border-slate-100 pt-6 md:grid-cols-3">
        {pillars.map((pillar) => (
          <div key={pillar.index}>
            <p className="font-mono text-xs font-semibold text-slate-400 tabular-nums">
              {pillar.index}
            </p>
            <h3 className="mt-1.5 font-display text-base font-bold text-slate-900">
              {pillar.title}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{pillar.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
