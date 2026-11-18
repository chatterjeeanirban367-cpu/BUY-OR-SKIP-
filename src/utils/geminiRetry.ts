export const PRIMARY_MODEL = 'gemini-3.8-flash';
export const FALLBACK_MODEL = 'gemini-3.5-flash-lite';

export interface RetryFallbackOptions {
  primaryModel?: string;
  fallbackModel?: string;
  primaryRetries?: number;
  fallbackRetries?: number;
  baseDelayMs?: number;
  sleepFn?: (ms: number) => Promise<void>;
}

export interface RetryFallbackResult<T> {
  response: T;
  modelUsed: string;
  fellBack: boolean;
}

export function extractErrorStatus(err: unknown): number | undefined {
  if (!err || typeof err !== 'object') return undefined;
  const candidate = err as { status?: unknown; code?: unknown; statusCode?: unknown };
  for (const val of [candidate.status, candidate.code, candidate.statusCode]) {
    if (typeof val === 'number' && Number.isFinite(val)) {
      return val;
    }
  }
  return undefined;
}

export function isRateLimitError(err: unknown): boolean {
  const status = extractErrorStatus(err);
  if (status === 429) return true;
  const message = err instanceof Error ? err.message : String(err ?? '');
  return /\b429\b|RESOURCE_EXHAUSTED|too many requests|rate.?limit|quota/i.test(message);
}

export function isTransientUnavailableError(err: unknown): boolean {
  const status = extractErrorStatus(err);
  if (status === 503 || status === 502) return true;
  const message = err instanceof Error ? err.message : String(err ?? '');
  return /\b503\b|UNAVAILABLE|high demand|overloaded|temporarily unavailable/i.test(message);
}

export function isRetryableOrFallbackError(err: unknown): boolean {
  return isRateLimitError(err) || isTransientUnavailableError(err);
}

export function isSchemaToolConflictError(err: unknown): boolean {
  if (isRetryableOrFallbackError(err)) return false;
  const status = extractErrorStatus(err);
  const message = err instanceof Error ? err.message : String(err ?? '');
  return (
    status === 400 ||
    /response_mime_type|response_schema|controlled generation|cannot be used with/i.test(message)
  );
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateWithRetryAndFallback<T>(
  callModel: (modelName: string) => Promise<T>,
  options: RetryFallbackOptions = {},
): Promise<RetryFallbackResult<T>> {
  const primaryModel = options.primaryModel ?? PRIMARY_MODEL;
  const fallbackModel = options.fallbackModel ?? FALLBACK_MODEL;
  const primaryRetries = options.primaryRetries ?? 1;
  const fallbackRetries = options.fallbackRetries ?? 1;
  const baseDelayMs = options.baseDelayMs ?? 1200;
  const sleep = options.sleepFn ?? defaultSleep;

  let lastError: unknown;

  for (let attempt = 0; attempt <= primaryRetries; attempt += 1) {
    try {
      const response = await callModel(primaryModel);
      return { response, modelUsed: primaryModel, fellBack: false };
    } catch (err) {
      lastError = err;
      if (!isRetryableOrFallbackError(err)) {
        throw err;
      }
      if (attempt < primaryRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        if (delay > 0) await sleep(delay);
      }
    }
  }

  for (let attempt = 0; attempt <= fallbackRetries; attempt += 1) {
    try {
      if (attempt === 0 && baseDelayMs > 0) {
        await sleep(Math.min(baseDelayMs, 800));
      }
      const response = await callModel(fallbackModel);
      return { response, modelUsed: fallbackModel, fellBack: true };
    } catch (err) {
      lastError = err;
      if (!isRetryableOrFallbackError(err)) {
        throw err;
      }
      if (attempt < fallbackRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        if (delay > 0) await sleep(delay);
      }
    }
  }

  throw lastError;
}
