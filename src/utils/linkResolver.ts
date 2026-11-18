import { detectRetailerFromDomain } from './auditLogic.ts';

export interface ResolvedLinkMetadata {
  originalUrl: string;
  resolvedUrl: string;
  finalDomain: string;
  retailer: string;
  urlSlugHint: string;
  pageTitle?: string;
  metaDescription?: string;
  priceHint?: string;
  brandHint?: string;
  httpStatus?: number;
  fetchSucceeded: boolean;
}

const PRIVATE_HOST_REGEX =
  /^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[::1\]|0\.0\.0\.0)/i;

export function isSafePublicHttpUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    if (!host.includes('.') || PRIVATE_HOST_REGEX.test(host)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function extractUrlSlugHint(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    const segments = parsed.pathname
      .split('/')
      .map((seg) => decodeURIComponent(seg).trim())
      .filter(Boolean);

    const usefulSegments = segments.filter((seg) => {
      if (/^(dp|gp|product|site|p|ip|itm|ref|ref=.*|s)$/i.test(seg)) return false;
      if (/^B0[A-Z0-9]{8}$/i.test(seg)) return true; // Keep Amazon ASIN
      return seg.length >= 3;
    });

    const cleaned = usefulSegments
      .map((seg) =>
        seg
          .replace(/\.[a-z0-9]{1,5}$/i, '')
          .replace(/[-_+]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim(),
      )
      .filter((seg) => seg.length >= 2);

    return cleaned.slice(0, 4).join(' · ');
  } catch {
    return '';
  }
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractMetaContent(html: string, attrName: string, attrValues: string[]): string | undefined {
  for (const attrVal of attrValues) {
    const escaped = attrVal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const patternA = new RegExp(
      `<meta[^>]*\\b${attrName}=["']${escaped}["'][^>]*\\bcontent=["']([^"']+)["'][^>]*>`,
      'i',
    );
    const matchA = html.match(patternA);
    if (matchA?.[1]) {
      return decodeHtmlEntities(matchA[1]);
    }
    const patternB = new RegExp(
      `<meta[^>]*\\bcontent=["']([^"']+)["'][^>]*\\b${attrName}=["']${escaped}["'][^>]*>`,
      'i',
    );
    const matchB = html.match(patternB);
    if (matchB?.[1]) {
      return decodeHtmlEntities(matchB[1]);
    }
  }
  return undefined;
}

export function extractHtmlMetadata(html: string, baseUrl: string): {
  pageTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  priceHint?: string;
  brandHint?: string;
} {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const rawTitle = titleMatch?.[1] ? decodeHtmlEntities(titleMatch[1]) : undefined;
  const ogTitle = extractMetaContent(html, 'property', ['og:title', 'twitter:title']);
  const pageTitle = ogTitle && ogTitle.length > 4 ? ogTitle : rawTitle;

  const metaDescription =
    extractMetaContent(html, 'property', ['og:description']) ||
    extractMetaContent(html, 'name', ['description', 'twitter:description']);

  const canonicalMatch =
    html.match(/<link[^>]*\brel=["']canonical["'][^>]*\bhref=["']([^"']+)["'][^>]*>/i) ||
    html.match(/<link[^>]*\bhref=["']([^"']+)["'][^>]*\brel=["']canonical["'][^>]*>/i);

  let canonicalUrl: string | undefined;
  if (canonicalMatch?.[1]) {
    try {
      const candidate = new URL(canonicalMatch[1], baseUrl).toString();
      if (isSafePublicHttpUrl(candidate)) {
        canonicalUrl = candidate;
      }
    } catch {
      // Ignore malformed canonical link
    }
  }

  const priceAmount = extractMetaContent(html, 'property', [
    'product:price:amount',
    'og:price:amount',
  ]);
  const priceCurrency = extractMetaContent(html, 'property', [
    'product:price:currency',
    'og:price:currency',
  ]);
  const priceHint = priceAmount
    ? `${priceCurrency ? `${priceCurrency} ` : ''}${priceAmount}`
    : undefined;

  const brandHint = extractMetaContent(html, 'property', ['product:brand', 'og:brand']);

  return {
    pageTitle: pageTitle && !/robot check|captcha|access denied|attention required/i.test(pageTitle)
      ? pageTitle
      : undefined,
    metaDescription,
    canonicalUrl,
    priceHint,
    brandHint,
  };
}

async function readBoundedText(response: Response, maxBytes = 131072): Promise<string> {
  if (!response.body) {
    return (await response.text()).slice(0, maxBytes);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let result = '';

  try {
    while (received < maxBytes) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      received += value.byteLength;
      result += decoder.decode(value, { stream: true });
    }
    result += decoder.decode();
  } finally {
    try {
      await reader.cancel();
    } catch {
      // Ignore stream cancel errors
    }
  }
  return result;
}

export async function resolveProductLinkMetadata(
  originalUrl: string,
  options?: {
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
  },
): Promise<ResolvedLinkMetadata> {
  const parsedOriginal = new URL(originalUrl);
  const defaultDomain = parsedOriginal.hostname.toLowerCase().replace(/^www\./, '');
  const defaultResult: ResolvedLinkMetadata = {
    originalUrl,
    resolvedUrl: originalUrl,
    finalDomain: defaultDomain,
    retailer: detectRetailerFromDomain(defaultDomain),
    urlSlugHint: extractUrlSlugHint(originalUrl),
    fetchSucceeded: false,
  };

  if (!isSafePublicHttpUrl(originalUrl)) {
    return defaultResult;
  }

  const fetchFn = options?.fetchImpl ?? fetch;
  const timeoutMs = options?.timeoutMs ?? 4500;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchFn(originalUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; BuyOrSkipAuditor/1.0; +https://buyorskip.app)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    const redirectedUrl =
      response.url && isSafePublicHttpUrl(response.url) ? response.url : originalUrl;

    const contentType = response.headers.get('content-type') ?? '';
    let htmlMeta: ReturnType<typeof extractHtmlMetadata> = {};
    if (contentType.includes('text/html') || contentType.includes('application/xhtml')) {
      const html = await readBoundedText(response);
      htmlMeta = extractHtmlMetadata(html, redirectedUrl);
    } else {
      await response.body?.cancel().catch(() => undefined);
    }

    const bestUrl = htmlMeta.canonicalUrl || redirectedUrl;
    const finalHost = new URL(bestUrl).hostname.toLowerCase().replace(/^www\./, '');

    return {
      originalUrl,
      resolvedUrl: bestUrl,
      finalDomain: finalHost,
      retailer: detectRetailerFromDomain(finalHost),
      urlSlugHint: extractUrlSlugHint(bestUrl) || defaultResult.urlSlugHint,
      pageTitle: htmlMeta.pageTitle,
      metaDescription: htmlMeta.metaDescription,
      priceHint: htmlMeta.priceHint,
      brandHint: htmlMeta.brandHint,
      httpStatus: response.status,
      fetchSucceeded: response.ok,
    };
  } catch {
    return defaultResult;
  } finally {
    clearTimeout(timer);
  }
}
