import type { ProductAuditResult } from '../types/audit';

export interface QuickUrlPreset {
  label: string;
  store: string;
  url: string;
}

export const QUICK_URL_PRESETS: QuickUrlPreset[] = [
  {
    label: 'Sony WH-1000XM5 Headphones',
    store: 'Amazon',
    url: 'https://www.amazon.com/dp/B09XS7JWHH',
  },
  {
    label: 'Logitech MX Master 3S Mouse',
    store: 'Best Buy',
    url: 'https://www.bestbuy.com/site/logitech-mx-master-3s-wireless-laser-mouse-graphite/6502577.p',
  },
  {
    label: 'Nothing Phone (2a) 5G',
    store: 'Flipkart',
    url: 'https://www.flipkart.com/nothing-phone-2a-5g-black-128-gb/p/itm88f59f96d8351',
  },
];

export const SAMPLE_AUDITS: ProductAuditResult[] = [
  {
    id: 'sample-xm5',
    productUrl: 'https://www.amazon.com/dp/B09XS7JWHH',
    retailer: 'Amazon',
    domain: 'amazon.com',
    productName: 'Sony WH-1000XM5 Wireless Noise Canceling Headphones',
    brand: 'Sony',
    category: 'Over-Ear ANC Headphones',
    estimatedPrice: '$328 – $399',
    verdict: 'CAUTION',
    verdictHeadline: 'Class-leading ANC and comfort, offset by a well-documented hinge breakage pattern',
    executiveSummary:
      'While Amazon ratings sit around 4.5 stars, independent discussions on r/sonyheadphones and r/headphones show a recurring mechanical weak point at the slim swivel hinge joint after 6–14 months of daily commuting, which Sony warranty teams frequently classify as physical damage.',
    trustScore: 71,
    scoreBreakdown: {
      buildQuality: 58,
      longevity: 62,
      customerSupport: 54,
      reviewIntegrity: 88,
    },
    topDealbreakers: [
      {
        title: 'Swivel Hinge Stress Fractures',
        severity: 'High',
        frequency: 'Very frequent on r/sonyheadphones',
        summary:
          'The thinner earcup-to-headband swivel joint is prone to snapping under normal putting-on/taking-off tension, often outside warranty coverage.',
        sourceEvidence: 'Multiple weekly repair & warranty denial threads across Reddit r/sonyheadphones',
      },
      {
        title: 'Auto-ANC Optimizer Cannot Be Locked',
        severity: 'Medium',
        frequency: 'Moderate complaint in firmware threads',
        summary:
          'Noise cancellation dynamically adjusts to environment pressure and movement, occasionally lowering strength unpredictably on windy walks.',
        sourceEvidence: 'Head-Fi & Reddit firmware comparison posts',
      },
      {
        title: 'Non-Folding Bulkier Carrying Case',
        severity: 'Low',
        frequency: 'Consistent buyer note',
        summary:
          'Unlike the XM4, the earcups do not fold inward into the headband, making the protective case noticeably larger in backpacks.',
        sourceEvidence: 'RTINGS & verified commuter reviews',
      },
    ],
    whoShouldBuy: [
      'Office workers and frequent flyers prioritizing top-tier microphone clarity and ANC performance',
      'Buyers purchasing from retailers with affordable accidental-damage protection plans',
      'Users who handle headphones gently at a desk and always store them in the hard case',
    ],
    whoShouldAvoid: [
      'Gym-goers or rough daily commuters tossing headphones loose into stuffed bags',
      'Buyers expecting effortless multi-year hinge durability without babying the headband',
      'Listeners in warm humid climates who want breathable earpads or an IP sweat rating',
    ],
    fakeReviewRisk: 'Low',
    fakeReviewSummary:
      'Review velocity and phrasing align closely with long-term verified purchases and independent lab benchmarks, with minimal signs of coordinated bot manipulation.',
    fakeReviewRedFlags: [
      {
        signal: 'Variant Rating Pooling',
        detail: 'Older colorways and bundle listings occasionally merge review counts, slightly masking recent hinge-breakage complaints in the aggregate 4.5-star score.',
        severity: 'Low',
      },
      {
        signal: 'Early-Impression 5-Star Bias',
        detail: 'Majority of glowing reviews are written within the first 14 days of ownership before long-term hinge fatigue appears.',
        severity: 'Medium',
      },
    ],
    redditConsensus:
      'Reddit audio communities praise the mic quality and ANC comfort, but routinely advise choosing the older WH-1000XM4 or Bose QuietComfort Ultra if hinge durability is your top priority.',
    groundedSources: [
      {
        title: 'Sony WH-1000XM5 Listing Context',
        url: 'https://www.amazon.com/dp/B09XS7JWHH',
        sourceType: 'product_page',
      },
      {
        title: 'r/sonyheadphones — Hinge Durability Megathread',
        url: 'https://www.reddit.com/r/SonyHeadphones/',
        sourceType: 'reddit',
      },
      {
        title: 'RTINGS — Sony WH-1000XM5 Long-Term Test',
        url: 'https://www.rtings.com/headphones/reviews/sony/wh-1000xm5-wireless',
        sourceType: 'forum_or_review',
      },
    ],
    urlContextFetched: true,
    analyzedAt: '2026-11-17T21:40:00.000Z',
    isSample: true,
  },
];
