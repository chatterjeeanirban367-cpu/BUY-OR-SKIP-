import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FALLBACK_MODEL,
  PRIMARY_MODEL,
  generateWithRetryAndFallback,
  isRateLimitError,
  isSchemaToolConflictError,
} from './geminiRetry';

test('model constants match requested Free Tier models', () => {
  assert.equal(PRIMARY_MODEL, 'gemini-3.8-flash');
  assert.equal(FALLBACK_MODEL, 'gemini-3.5-flash-lite');
});

test('isRateLimitError detects HTTP 429 and RESOURCE_EXHAUSTED errors', () => {
  assert.equal(isRateLimitError(Object.assign(new Error('Too Many Requests'), { status: 429 })), true);
  assert.equal(isRateLimitError(new Error('RESOURCE_EXHAUSTED: Quota exceeded')), true);
  assert.equal(isRateLimitError(Object.assign(new Error('Bad Request'), { status: 400 })), false);
  assert.equal(isSchemaToolConflictError(Object.assign(new Error('Bad Request'), { status: 400 })), true);
  assert.equal(isSchemaToolConflictError(Object.assign(new Error('429'), { status: 429 })), false);
});

test('generateWithRetryAndFallback succeeds on primary without fallback when no error occurs', async () => {
  const calls: string[] = [];
  const result = await generateWithRetryAndFallback(
    async (model) => {
      calls.push(model);
      return `ok:${model}`;
    },
    { baseDelayMs: 0 },
  );

  assert.deepEqual(calls, ['gemini-3.8-flash']);
  assert.equal(result.response, 'ok:gemini-3.8-flash');
  assert.equal(result.modelUsed, 'gemini-3.8-flash');
  assert.equal(result.fellBack, false);
});

test('generateWithRetryAndFallback retries primary on 429 and falls back to gemini-3.5-flash-lite', async () => {
  const calls: string[] = [];
  const delays: number[] = [];

  const result = await generateWithRetryAndFallback(
    async (model) => {
      calls.push(model);
      if (model === 'gemini-3.8-flash') {
        throw Object.assign(new Error('429 RESOURCE_EXHAUSTED'), { status: 429 });
      }
      return `ok:${model}`;
    },
    {
      primaryRetries: 1,
      fallbackRetries: 1,
      baseDelayMs: 100,
      sleepFn: async (ms) => {
        delays.push(ms);
      },
    },
  );

  assert.deepEqual(calls, ['gemini-3.8-flash', 'gemini-3.8-flash', 'gemini-3.5-flash-lite']);
  assert.equal(delays.length, 2);
  assert.equal(result.response, 'ok:gemini-3.5-flash-lite');
  assert.equal(result.modelUsed, 'gemini-3.5-flash-lite');
  assert.equal(result.fellBack, true);
});

test('generateWithRetryAndFallback does not retry or fall back on non-429 errors like 403', async () => {
  const calls: string[] = [];
  await assert.rejects(
    () =>
      generateWithRetryAndFallback(
        async (model) => {
          calls.push(model);
          throw Object.assign(new Error('PERMISSION_DENIED'), { status: 403 });
        },
        { baseDelayMs: 0 },
      ),
    /PERMISSION_DENIED/,
  );

  assert.deepEqual(calls, ['gemini-3.8-flash']);
});

test('generateWithRetryAndFallback also falls back to gemini-3.5-flash-lite on 503 UNAVAILABLE high demand', async () => {
  const calls: string[] = [];
  const result = await generateWithRetryAndFallback(
    async (model) => {
      calls.push(model);
      if (model === 'gemini-3.8-flash') {
        throw new Error('{"error":{"code":503,"message":"This model is currently experiencing high demand.","status":"UNAVAILABLE"}}');
      }
      return `ok:${model}`;
    },
    { primaryRetries: 1, fallbackRetries: 0, baseDelayMs: 0 },
  );

  assert.deepEqual(calls, ['gemini-3.8-flash', 'gemini-3.8-flash', 'gemini-3.5-flash-lite']);
  assert.equal(result.modelUsed, 'gemini-3.5-flash-lite');
  assert.equal(result.fellBack, true);
});
