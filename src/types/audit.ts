export type VerdictType = 'BUY' | 'CAUTION' | 'CANCEL / SKIP';

export type SeverityLevel = 'High' | 'Medium' | 'Low';

export type FakeReviewRiskLevel = 'Low' | 'Moderate' | 'High';

export interface Dealbreaker {
  title: string;
  severity: SeverityLevel;
  frequency: string;
  summary: string;
  sourceEvidence: string;
}

export interface FakeReviewFlag {
  signal: string;
  detail: string;
  severity: SeverityLevel;
}

export interface ScoreBreakdown {
  buildQuality: number;
  longevity: number;
  customerSupport: number;
  reviewIntegrity: number;
}

export interface GroundedSource {
  title: string;
  url: string;
  sourceType: 'product_page' | 'reddit' | 'forum_or_review' | 'web';
}

export interface ProductAuditResult {
  id: string;
  productUrl: string;
  retailer: string;
  domain: string;
  productName: string;
  brand: string;
  category: string;
  estimatedPrice: string;
  verdict: VerdictType;
  verdictHeadline: string;
  executiveSummary: string;
  trustScore: number;
  scoreBreakdown: ScoreBreakdown;
  topDealbreakers: Dealbreaker[];
  whoShouldBuy: string[];
  whoShouldAvoid: string[];
  fakeReviewRisk: FakeReviewRiskLevel;
  fakeReviewSummary: string;
  fakeReviewRedFlags: FakeReviewFlag[];
  redditConsensus: string;
  groundedSources: GroundedSource[];
  urlContextFetched: boolean;
  analyzedAt: string;
  isSample?: boolean;
}

export interface UrlValidationResult {
  valid: boolean;
  normalizedUrl: string;
  domain: string;
  retailer: string;
  error?: string;
}
