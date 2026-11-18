import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampScore,
  detectRetailerFromDomain,
  filterAuditHistory,
  formatAuditMarkdownSummary,
  normalizeVerdict,
  parseAndSanitizeAuditPayload,
  validateProductUrl,
} from './auditLogic';

test('validateProductUrl accepts valid Amazon/Flipkart/Best Buy URLs and normalizes missing protocol', () => {
  const amazon = validateProductUrl('https://www.amazon.com/dp/B09XS7JWHH');
  assert.equal(amazon.valid, true);
  assert.equal(amazon.domain, 'amazon.com');
  assert.equal(amazon.retailer, 'Amazon');

  const noProtocol = validateProductUrl('bestbuy.com/site/sony-wh1000xm5/6505727.p');
  assert.equal(noProtocol.valid, true);
  assert.equal(noProtocol.normalizedUrl.startsWith('https://'), true);
  assert.equal(noProtocol.retailer, 'Best Buy');

  const flipkart = validateProductUrl('https://www.flipkart.com/nothing-phone-2a/p/itm123');
  assert.equal(flipkart.valid, true);
  assert.equal(flipkart.retailer, 'Flipkart');
});

test('validateProductUrl rejects empty, invalid, and local URLs', () => {
  assert.equal(validateProductUrl('').valid, false);
  assert.equal(validateProductUrl('   ').valid, false);
  assert.equal(validateProductUrl('not a url').valid, false);
  assert.equal(validateProductUrl('ftp://amazon.com/item').valid, false);
  assert.equal(validateProductUrl('http://localhost:3000/product').valid, false);
});

test('detectRetailerFromDomain handles regional storefronts and unknown stores cleanly', () => {
  assert.equal(detectRetailerFromDomain('amazon.in'), 'Amazon');
  assert.equal(detectRetailerFromDomain('www.target.com'), 'Target');
  assert.equal(detectRetailerFromDomain('shop.keychron.com'), 'Keychron');
});

test('clampScore and normalizeVerdict enforce bounds and canonical verdict labels', () => {
  assert.equal(clampScore(115), 100);
  assert.equal(clampScore(-12), 0);
  assert.equal(clampScore(82.6), 83);
  assert.equal(clampScore('invalid', 60), 60);

  assert.equal(normalizeVerdict('buy', 80), 'BUY');
  assert.equal(normalizeVerdict('CANCEL/SKIP', 30), 'CANCEL / SKIP');
  assert.equal(normalizeVerdict('skip', 30), 'CANCEL / SKIP');
  assert.equal(normalizeVerdict('caution', 60), 'CAUTION');
  assert.equal(normalizeVerdict('unknown', 81), 'BUY');
  assert.equal(normalizeVerdict('unknown', 35), 'CANCEL / SKIP');
});

test('parseAndSanitizeAuditPayload parses fenced JSON and guarantees 3 dealbreakers and deduped sources', () => {
  const raw = `\`\`\`json
  {
    "productName": "Acme Espresso Machine",
    "brand": "Acme",
    "category": "Kitchen Appliances",
    "estimatedPrice": "$299",
    "verdict": "CANCEL / SKIP",
    "verdictHeadline": "High pump failure rate after 4 months",
    "executiveSummary": "Reddit threads report plastic boiler fittings cracking.",
    "trustScore": 38,
    "scoreBreakdown": {
      "buildQuality": 32,
      "longevity": 25,
      "customerSupport": 40,
      "reviewIntegrity": 44
    },
    "topDealbreakers": [
      {
        "title": "Plastic internal boiler leak",
        "severity": "High",
        "frequency": "Repeated in r/espresso",
        "summary": "Owners report water leaking into electronics within 90-180 days.",
        "sourceEvidence": "r/espresso threads"
      }
    ],
    "whoShouldBuy": ["Only buyers getting it under $80 with an extended store protection plan"],
    "whoShouldAvoid": ["Daily espresso drinkers expecting 2+ years of service"],
    "fakeReviewRisk": "High",
    "fakeReviewSummary": "Sudden 5-star review spikes with identical phrasing.",
    "fakeReviewRedFlags": [
      {
        "signal": "Incentivized warranty card inserts",
        "detail": "Buyers on Reddit posted photos of $20 gift card offers for 5-star reviews.",
        "severity": "High"
      }
    ],
    "redditConsensus": "Unanimously steered away in favor of entry-level Breville or Gaggia units."
  }
  \`\`\``;

  const result = parseAndSanitizeAuditPayload(raw, 'https://www.amazon.com/dp/B000TEST', {
    urlContextFetched: true,
    groundedSources: [
      { title: 'Reddit discussion', url: 'https://www.reddit.com/r/espresso/comments/abc', sourceType: 'reddit' },
      { title: 'Duplicate link', url: 'https://www.reddit.com/r/espresso/comments/abc', sourceType: 'reddit' },
    ],
  });

  assert.equal(result.verdict, 'CANCEL / SKIP');
  assert.equal(result.trustScore, 38);
  assert.equal(result.topDealbreakers.length, 3);
  assert.equal(result.topDealbreakers[0].title, 'Plastic internal boiler leak');
  assert.equal(result.groundedSources.length, 1);
  assert.equal(result.urlContextFetched, true);
  assert.equal(result.retailer, 'Amazon');
});

test('filterAuditHistory and formatAuditMarkdownSummary work accurately', () => {
  const sampleA = parseAndSanitizeAuditPayload(
    JSON.stringify({
      productName: 'Sony WH-1000XM5',
      brand: 'Sony',
      category: 'Audio',
      verdict: 'CAUTION',
      trustScore: 71,
    }),
    'https://www.amazon.com/dp/B09XS7JWHH',
  );
  const sampleB = parseAndSanitizeAuditPayload(
    JSON.stringify({
      productName: 'Anker 737 Power Bank',
      brand: 'Anker',
      category: 'Chargers',
      verdict: 'BUY',
      trustScore: 88,
    }),
    'https://www.bestbuy.com/site/anker/123.p',
  );

  assert.equal(filterAuditHistory([sampleA, sampleB], 'BUY', '').length, 1);
  assert.equal(filterAuditHistory([sampleA, sampleB], 'ALL', 'sony').length, 1);
  assert.equal(filterAuditHistory([sampleA, sampleB], 'ALL', 'best buy').length, 1);
  assert.equal(filterAuditHistory([sampleA, sampleB], 'CANCEL / SKIP', '').length, 0);

  const md = formatAuditMarkdownSummary(sampleB);
  assert.equal(md.includes('Anker 737 Power Bank'), true);
  assert.equal(md.includes('88/100'), true);
});
