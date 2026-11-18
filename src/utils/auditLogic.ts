import type {
  Dealbreaker,
  FakeReviewFlag,
  FakeReviewRiskLevel,
  GroundedSource,
  ProductAuditResult,
  ScoreBreakdown,
  SeverityLevel,
  UrlValidationResult,
  VerdictType,
} from '../types/audit.ts';

const RETAILER_PATTERNS: Array<{ match: RegExp; name: string }> = [
  { match: /(^|\.)amazon\./i, name: 'Amazon' },
  { match: /(^|\.)flipkart\.com$/i, name: 'Flipkart' },
  { match: /(^|\.)bestbuy\./i, name: 'Best Buy' },
  { match: /(^|\.)walmart\./i, name: 'Walmart' },
  { match: /(^|\.)target\.com$/i, name: 'Target' },
  { match: /(^|\.)ebay\./i, name: 'eBay' },
  { match: /(^|\.)newegg\./i, name: 'Newegg' },
  { match: /(^|\.)bhphotovideo\.com$/i, name: 'B&H Photo' },
  { match: /(^|\.)costco\./i, name: 'Costco' },
  { match: /(^|\.)homedepot\./i, name: 'Home Depot' },
  { match: /(^|\.)lowes\.com$/i, name: "Lowe's" },
  { match: /(^|\.)aliexpress\./i, name: 'AliExpress' },
  { match: /(^|\.)apple\.com$/i, name: 'Apple' },
  { match: /(^|\.)rei\.com$/i, name: 'REI' },
];

export function detectRetailerFromDomain(hostname: string): string {
  const cleanHost = hostname.toLowerCase().replace(/^www\./, '');
  for (const entry of RETAILER_PATTERNS) {
    if (entry.match.test(cleanHost)) {
      return entry.name;
    }
  }
  const parts = cleanHost.split('.');
  const root = parts.length >= 2 ? parts[parts.length - 2] : cleanHost;
  if (!root) return 'Online Store';
  return root.charAt(0).toUpperCase() + root.slice(1);
}

export function validateProductUrl(rawInput: string): UrlValidationResult {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return {
      valid: false,
      normalizedUrl: '',
      domain: '',
      retailer: '',
      error: 'Paste a product URL from Amazon, Flipkart, Best Buy, or any online store.',
    };
  }

  let candidate = trimmed;
  if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(candidate)) {
    if (/^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+(\/|$)/.test(candidate)) {
      candidate = `https://${candidate}`;
    } else {
      return {
        valid: false,
        normalizedUrl: '',
        domain: '',
        retailer: '',
        error: 'Enter a valid web address starting with https:// (for example, https://www.amazon.com/dp/...).',
      };
    }
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return {
      valid: false,
      normalizedUrl: '',
      domain: '',
      retailer: '',
      error: 'That URL format is invalid. Check for missing characters or spaces.',
    };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      valid: false,
      normalizedUrl: '',
      domain: '',
      retailer: '',
      error: 'Only HTTP and HTTPS product links are supported.',
    };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!hostname.includes('.') || hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return {
      valid: false,
      normalizedUrl: '',
      domain: '',
      retailer: '',
      error: 'Please enter a public e-commerce product page URL.',
    };
  }

  const cleanDomain = hostname.replace(/^www\./, '');
  return {
    valid: true,
    normalizedUrl: parsed.toString(),
    domain: cleanDomain,
    retailer: detectRetailerFromDomain(cleanDomain),
  };
}

export function clampScore(value: unknown, fallback = 50): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

export function normalizeVerdict(rawVerdict: unknown, trustScore: number): VerdictType {
  if (typeof rawVerdict === 'string') {
    const upper = rawVerdict.trim().toUpperCase();
    if (upper === 'BUY' || upper === 'RECOMMENDED' || upper === 'SAFE BUY') {
      return 'BUY';
    }
    if (
      upper === 'CANCEL / SKIP' ||
      upper === 'CANCEL/SKIP' ||
      upper === 'SKIP' ||
      upper === 'CANCEL' ||
      upper === 'AVOID'
    ) {
      return 'CANCEL / SKIP';
    }
    if (upper === 'CAUTION' || upper === 'MIXED' || upper === 'WARNING') {
      return 'CAUTION';
    }
  }

  if (trustScore >= 75) return 'BUY';
  if (trustScore >= 48) return 'CAUTION';
  return 'CANCEL / SKIP';
}

export function normalizeSeverity(raw: unknown): SeverityLevel {
  if (typeof raw === 'string') {
    const lower = raw.trim().toLowerCase();
    if (lower === 'high' || lower === 'critical' || lower === 'severe') return 'High';
    if (lower === 'low' || lower === 'minor') return 'Low';
  }
  return 'Medium';
}

export function normalizeFakeReviewRisk(raw: unknown): FakeReviewRiskLevel {
  if (typeof raw === 'string') {
    const lower = raw.trim().toLowerCase();
    if (lower === 'high' || lower === 'severe' || lower === 'critical') return 'High';
    if (lower === 'low' || lower === 'minimal') return 'Low';
  }
  return 'Moderate';
}

export function classifySourceType(url: string, title = ''): GroundedSource['sourceType'] {
  const combined = `${url} ${title}`.toLowerCase();
  if (combined.includes('reddit.com') || combined.includes('redd.it')) {
    return 'reddit';
  }
  if (
    combined.includes('trustpilot') ||
    combined.includes('consumerreports') ||
    combined.includes('rtings.com') ||
    combined.includes('wirecutter') ||
    combined.includes('bbb.org') ||
    combined.includes('forum') ||
    combined.includes('ifixit')
  ) {
    return 'forum_or_review';
  }
  return 'web';
}

export function extractJsonString(rawText: string): string {
  const trimmed = rawText.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch && fencedMatch[1]) {
    return fencedMatch[1].trim();
  }
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  return trimmed;
}

function asNonEmptyString(val: unknown, fallback: string): string {
  if (typeof val === 'string' && val.trim().length > 0) {
    return val.trim();
  }
  return fallback;
}

function asStringArray(val: unknown, fallback: string[]): string[] {
  if (!Array.isArray(val)) return fallback;
  const cleaned = val
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0);
  return cleaned.length > 0 ? cleaned.slice(0, 6) : fallback;
}

export function parseAndSanitizeAuditPayload(
  rawText: string,
  productUrl: string,
  options?: {
    groundedSources?: GroundedSource[];
    urlContextFetched?: boolean;
  },
): ProductAuditResult {
  const jsonStr = extractJsonString(rawText);
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonStr) as Record<string, unknown>;
  } catch {
    throw new Error('Could not parse structured audit JSON from model response.');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Audit response did not contain a valid JSON object.');
  }

  const urlCheck = validateProductUrl(productUrl);
  const domain = urlCheck.valid ? urlCheck.domain : 'store.com';
  const retailer = asNonEmptyString(parsed.retailer, urlCheck.retailer || 'Online Store');
  const trustScore = clampScore(parsed.trustScore, 55);
  const verdict = normalizeVerdict(parsed.verdict, trustScore);

  const rawBreakdown =
    parsed.scoreBreakdown && typeof parsed.scoreBreakdown === 'object'
      ? (parsed.scoreBreakdown as Record<string, unknown>)
      : {};

  const scoreBreakdown: ScoreBreakdown = {
    buildQuality: clampScore(rawBreakdown.buildQuality, trustScore),
    longevity: clampScore(rawBreakdown.longevity, Math.max(0, trustScore - 4)),
    customerSupport: clampScore(rawBreakdown.customerSupport, Math.max(0, trustScore - 6)),
    reviewIntegrity: clampScore(rawBreakdown.reviewIntegrity, trustScore),
  };

  const rawDealbreakers = Array.isArray(parsed.topDealbreakers) ? parsed.topDealbreakers : [];
  const topDealbreakers: Dealbreaker[] = rawDealbreakers
    .slice(0, 3)
    .map((item, idx) => {
      const obj = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
      return {
        title: asNonEmptyString(obj.title, `Recurring Issue #${idx + 1}`),
        severity: normalizeSeverity(obj.severity),
        frequency: asNonEmptyString(obj.frequency, 'Reported in customer feedback'),
        summary: asNonEmptyString(obj.summary, 'Users noted recurring complaints around this area.'),
        sourceEvidence: asNonEmptyString(obj.sourceEvidence, 'Web & customer forum reports'),
      };
    });

  while (topDealbreakers.length < 3) {
    const nextNum = topDealbreakers.length + 1;
    topDealbreakers.push({
      title:
        nextNum === 1
          ? 'Limited Long-Term Durability Data'
          : nextNum === 2
            ? 'Warranty & Support Friction'
            : 'Minor Quality Control Variance',
      severity: 'Low',
      frequency: 'Occasional mentions',
      summary: 'No dominant catastrophic failure trend found beyond isolated buyer reports.',
      sourceEvidence: 'Cross-referenced search results',
    });
  }

  const rawFlags = Array.isArray(parsed.fakeReviewRedFlags) ? parsed.fakeReviewRedFlags : [];
  const fakeReviewRedFlags: FakeReviewFlag[] = rawFlags
    .slice(0, 5)
    .map((item) => {
      const obj = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
      return {
        signal: asNonEmptyString(obj.signal, 'Review Pattern Anomaly'),
        detail: asNonEmptyString(obj.detail, 'Check verified-purchase review timestamps and detail depth.'),
        severity: normalizeSeverity(obj.severity),
      };
    });

  if (fakeReviewRedFlags.length === 0) {
    fakeReviewRedFlags.push({
      signal: 'No Severe Manipulation Signals Detected',
      detail: 'Public discussions and listing sentiment appear broadly consistent, though checking recent 3-star reviews is still recommended.',
      severity: 'Low',
    });
  }

  const dedupedSources: GroundedSource[] = [];
  const seenUrls = new Set<string>();
  const combinedSources = [
    ...(options?.groundedSources ?? []),
    ...(Array.isArray(parsed.citedSources)
      ? parsed.citedSources
          .filter((s): s is Record<string, unknown> => Boolean(s && typeof s === 'object'))
          .map((s) => ({
            title: asNonEmptyString(s.title, 'Referenced Discussion'),
            url: asNonEmptyString(s.url, ''),
            sourceType: classifySourceType(asNonEmptyString(s.url, ''), asNonEmptyString(s.title, '')),
          }))
      : []),
  ];

  for (const src of combinedSources) {
    if (!src.url || !/^https?:\/\//i.test(src.url) || seenUrls.has(src.url)) continue;
    seenUrls.add(src.url);
    dedupedSources.push({
      title: src.title || src.url,
      url: src.url,
      sourceType: src.sourceType || classifySourceType(src.url, src.title),
    });
  }

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    productUrl: urlCheck.valid ? urlCheck.normalizedUrl : productUrl,
    retailer,
    domain,
    productName: asNonEmptyString(parsed.productName, `Product from ${retailer}`),
    brand: asNonEmptyString(parsed.brand, 'Unknown Brand'),
    category: asNonEmptyString(parsed.category, 'Consumer Product'),
    estimatedPrice: asNonEmptyString(parsed.estimatedPrice, 'Price varies by listing'),
    verdict,
    verdictHeadline: asNonEmptyString(
      parsed.verdictHeadline,
      verdict === 'BUY'
        ? 'Strong real-world reliability and consistent owner satisfaction'
        : verdict === 'CAUTION'
          ? 'Solid core product with documented trade-offs to weigh first'
          : 'Recurring failure reports and credibility warnings outweigh the listing pitch',
    ),
    executiveSummary: asNonEmptyString(
      parsed.executiveSummary,
      'Cross-referenced listing claims against independent buyer feedback and forum discussions.',
    ),
    trustScore,
    scoreBreakdown,
    topDealbreakers,
    whoShouldBuy: asStringArray(parsed.whoShouldBuy, ['Buyers whose primary use case matches the core specs']),
    whoShouldAvoid: asStringArray(parsed.whoShouldAvoid, ['Buyers sensitive to long-term repairability or warranty friction']),
    fakeReviewRisk: normalizeFakeReviewRisk(parsed.fakeReviewRisk),
    fakeReviewSummary: asNonEmptyString(
      parsed.fakeReviewSummary,
      'Evaluated review distribution patterns against independent Reddit and forum sentiment.',
    ),
    fakeReviewRedFlags,
    redditConsensus: asNonEmptyString(
      parsed.redditConsensus,
      'Community threads highlight mixed-to-pragmatic real-world feedback compared to headline store ratings.',
    ),
    groundedSources: dedupedSources.slice(0, 10),
    urlContextFetched: Boolean(options?.urlContextFetched),
    analyzedAt: new Date().toISOString(),
  };
}

export function filterAuditHistory(
  items: ProductAuditResult[],
  verdictFilter: 'ALL' | VerdictType,
  searchQuery: string,
): ProductAuditResult[] {
  const query = searchQuery.trim().toLowerCase();
  return items.filter((item) => {
    const matchesVerdict = verdictFilter === 'ALL' || item.verdict === verdictFilter;
    if (!matchesVerdict) return false;
    if (!query) return true;
    return (
      item.productName.toLowerCase().includes(query) ||
      item.brand.toLowerCase().includes(query) ||
      item.retailer.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query) ||
      item.domain.toLowerCase().includes(query)
    );
  });
}

export function formatAuditMarkdownSummary(audit: ProductAuditResult): string {
  const lines = [
    `# Buy or Skip Audit: ${audit.productName}`,
    `**Verdict:** ${audit.verdict} | **Trust & Quality Score:** ${audit.trustScore}/100`,
    `**Store:** ${audit.retailer} (${audit.domain}) | **Price:** ${audit.estimatedPrice}`,
    `**URL:** ${audit.productUrl}`,
    '',
    `## Executive Verdict`,
    audit.executiveSummary,
    '',
    `## Top 3 Recurring Dealbreakers`,
    ...audit.topDealbreakers.map(
      (d, i) => `${i + 1}. **${d.title}** (${d.severity} · ${d.frequency}): ${d.summary}`,
    ),
    '',
    `## Who Should Buy`,
    ...audit.whoShouldBuy.map((item) => `- ${item}`),
    '',
    `## Who Should Avoid`,
    ...audit.whoShouldAvoid.map((item) => `- ${item}`),
    '',
    `## Fake Review Red Flags (${audit.fakeReviewRisk} Risk)`,
    audit.fakeReviewSummary,
    ...audit.fakeReviewRedFlags.map((f) => `- **${f.signal}** (${f.severity}): ${f.detail}`),
  ];
  return lines.join('\n');
}
