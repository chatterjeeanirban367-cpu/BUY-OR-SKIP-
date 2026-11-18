import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractHtmlMetadata,
  extractUrlSlugHint,
  isSafePublicHttpUrl,
  resolveProductLinkMetadata,
} from './linkResolver';

test('isSafePublicHttpUrl blocks localhost, private IPs, and non-http schemes', () => {
  assert.equal(isSafePublicHttpUrl('https://www.amazon.com/dp/B09XS7JWHH'), true);
  assert.equal(isSafePublicHttpUrl('http://localhost:3000/test'), false);
  assert.equal(isSafePublicHttpUrl('http://127.0.0.1/admin'), false);
  assert.equal(isSafePublicHttpUrl('http://192.168.1.10/item'), false);
  assert.equal(isSafePublicHttpUrl('file:///etc/passwd'), false);
});

test('extractUrlSlugHint extracts readable product name and ASIN from retail URLs', () => {
  const amazonHint = extractUrlSlugHint(
    'https://www.amazon.com/Sony-WH-1000XM5-Canceling-Headphones-Hands-Free/dp/B09XS7JWHH/ref=sr_1_1',
  );
  assert.equal(amazonHint.includes('Sony WH 1000XM5'), true);
  assert.equal(amazonHint.includes('B09XS7JWHH'), true);

  const bestBuyHint = extractUrlSlugHint(
    'https://www.bestbuy.com/site/logitech-mx-master-3s-wireless-laser-mouse-graphite/6502577.p',
  );
  assert.equal(bestBuyHint.includes('logitech mx master 3s'), true);
});

test('extractHtmlMetadata parses title, description, canonical URL, and price tags while ignoring bot-check titles', () => {
  const html = `
    <html>
      <head>
        <title>Amazon.com: Sony WH-1000XM5</title>
        <meta property="og:title" content="Sony WH-1000XM5 Wireless Headphones &amp; Case" />
        <meta name="description" content="Industry leading noise canceling headphones." />
        <meta property="product:price:amount" content="328.00" />
        <meta property="product:price:currency" content="USD" />
        <link rel="canonical" href="https://www.amazon.com/dp/B09XS7JWHH" />
      </head>
    </html>
  `;
  const meta = extractHtmlMetadata(html, 'https://amzn.to/short');
  assert.equal(meta.pageTitle, 'Sony WH-1000XM5 Wireless Headphones & Case');
  assert.equal(meta.metaDescription, 'Industry leading noise canceling headphones.');
  assert.equal(meta.priceHint, 'USD 328.00');
  assert.equal(meta.canonicalUrl, 'https://www.amazon.com/dp/B09XS7JWHH');

  const captchaMeta = extractHtmlMetadata('<title>Robot Check</title>', 'https://www.amazon.com/dp/B09XS7JWHH');
  assert.equal(captchaMeta.pageTitle, undefined);
});

test('resolveProductLinkMetadata follows redirects and falls back gracefully on network failure', async () => {
  const mockFetch = (async () => {
    return {
      ok: true,
      status: 200,
      url: 'https://www.amazon.com/Sony-WH-1000XM5/dp/B09XS7JWHH',
      headers: new Headers({ 'content-type': 'text/html; charset=utf-8' }),
      text: async () => '<title>Sony WH-1000XM5</title>',
      body: null,
    } as unknown as Response;
  }) as typeof fetch;

  const resolved = await resolveProductLinkMetadata('https://amzn.to/xyz', { fetchImpl: mockFetch });
  assert.equal(resolved.resolvedUrl, 'https://www.amazon.com/Sony-WH-1000XM5/dp/B09XS7JWHH');
  assert.equal(resolved.retailer, 'Amazon');
  assert.equal(resolved.pageTitle, 'Sony WH-1000XM5');
  assert.equal(resolved.fetchSucceeded, true);

  const failingFetch = (async () => {
    throw new Error('Network timeout');
  }) as typeof fetch;
  const fallback = await resolveProductLinkMetadata('https://www.bestbuy.com/site/item/123.p', {
    fetchImpl: failingFetch,
  });
  assert.equal(fallback.resolvedUrl, 'https://www.bestbuy.com/site/item/123.p');
  assert.equal(fallback.retailer, 'Best Buy');
  assert.equal(fallback.fetchSucceeded, false);
});
