import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type } from '@google/genai';
import {
  classifySourceType,
  parseAndSanitizeAuditPayload,
  validateProductUrl,
} from './src/utils/auditLogic.ts';
import {
  FALLBACK_MODEL,
  PRIMARY_MODEL,
  generateWithRetryAndFallback,
  isRateLimitError,
  isSchemaToolConflictError,
  isTransientUnavailableError,
} from './src/utils/geminiRetry.ts';
import {
  resolveProductLinkMetadata,
  type ResolvedLinkMetadata,
} from './src/utils/linkResolver.ts';
import type { GroundedSource } from './src/types/audit.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

function createGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const AUDIT_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    productName: { type: Type.STRING, description: 'Full clean product name identified from the URL or search.' },
    brand: { type: Type.STRING, description: 'Brand or manufacturer name.' },
    retailer: { type: Type.STRING, description: 'Storefront name such as Amazon, Flipkart, or Best Buy.' },
    category: { type: Type.STRING, description: 'Concise product category (e.g., Wireless Headphones, Espresso Machine).' },
    estimatedPrice: { type: Type.STRING, description: 'Listing price or typical street price range if found.' },
    verdict: {
      type: Type.STRING,
      description: 'Must be exactly one of: "BUY", "CAUTION", or "CANCEL / SKIP".',
    },
    verdictHeadline: {
      type: Type.STRING,
      description: 'One sharp 8-16 word headline summarizing why this verdict applies.',
    },
    executiveSummary: {
      type: Type.STRING,
      description: '2-3 sentence synthesis contrasting the product page claims against real customer complaints and Reddit discussions.',
    },
    trustScore: {
      type: Type.INTEGER,
      description: 'Overall Trust & Quality Score from 0 to 100.',
    },
    scoreBreakdown: {
      type: Type.OBJECT,
      properties: {
        buildQuality: { type: Type.INTEGER, description: '0-100 score for materials and construction quality.' },
        longevity: { type: Type.INTEGER, description: '0-100 score for durability over months/years of ownership.' },
        customerSupport: { type: Type.INTEGER, description: '0-100 score for warranty fulfillment and support responsiveness.' },
        reviewIntegrity: { type: Type.INTEGER, description: '0-100 score for authenticity of storefront reviews.' },
      },
      required: ['buildQuality', 'longevity', 'customerSupport', 'reviewIntegrity'],
    },
    topDealbreakers: {
      type: Type.ARRAY,
      description: 'Exactly 3 most recurring buyer complaints, defects, or dealbreakers found across reviews and Reddit.',
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: 'Short 3-6 word name of the recurring issue.' },
          severity: { type: Type.STRING, description: 'High, Medium, or Low.' },
          frequency: { type: Type.STRING, description: 'How often it appears in discussions (e.g., Frequent on Reddit, Common after 6 months).' },
          summary: { type: Type.STRING, description: 'Concrete explanation of what breaks, fails, or disappoints.' },
          sourceEvidence: { type: Type.STRING, description: 'Where this pattern was observed (e.g., r/BuyItForLife, 1-star verified reviews).' },
        },
        required: ['title', 'severity', 'frequency', 'summary', 'sourceEvidence'],
      },
    },
    whoShouldBuy: {
      type: Type.ARRAY,
      description: '3 concise bullet statements describing ideal buyers for this product.',
      items: { type: Type.STRING },
    },
    whoShouldAvoid: {
      type: Type.ARRAY,
      description: '3 concise bullet statements describing buyers who should skip or cancel.',
      items: { type: Type.STRING },
    },
    fakeReviewRisk: {
      type: Type.STRING,
      description: 'Low, Moderate, or High risk of manipulated or incentivized reviews.',
    },
    fakeReviewSummary: {
      type: Type.STRING,
      description: '2-sentence forensic summary of review authenticity vs. independent community feedback.',
    },
    fakeReviewRedFlags: {
      type: Type.ARRAY,
      description: '2-4 specific fake review red flags or credibility observations.',
      items: {
        type: Type.OBJECT,
        properties: {
          signal: { type: Type.STRING, description: 'Name of the red flag or authenticity check.' },
          detail: { type: Type.STRING, description: 'Specific pattern observed in storefront reviews or third-party checks.' },
          severity: { type: Type.STRING, description: 'High, Medium, or Low.' },
        },
        required: ['signal', 'detail', 'severity'],
      },
    },
    redditConsensus: {
      type: Type.STRING,
      description: '2-sentence summary of what Reddit and enthusiast forums say about this product or model.',
    },
  },
  required: [
    'productName',
    'brand',
    'retailer',
    'category',
    'estimatedPrice',
    'verdict',
    'verdictHeadline',
    'executiveSummary',
    'trustScore',
    'scoreBreakdown',
    'topDealbreakers',
    'whoShouldBuy',
    'whoShouldAvoid',
    'fakeReviewRisk',
    'fakeReviewSummary',
    'fakeReviewRedFlags',
    'redditConsensus',
  ],
};

const SYSTEM_INSTRUCTION = `You are a skeptical consumer product investigator and review forensics analyst for "Buy or Skip".
Your job is to inspect the provided e-commerce product URL using the URL Context tool together with the resolved page metadata provided by the server, and evaluate known customer complaints, long-term durability failures, warranty friction, Reddit/community consensus, and fake or incentivized review red flags.

Rules:
1. Read the product URL via URL Context and combine it with the server-resolved title, description, price, and URL slug metadata to identify the exact product model.
2. Weigh long-term owner reliability reports, common hardware/material failure points, return friction, and community consensus rather than trusting headline star ratings.
3. Set "verdict" strictly to one of: "BUY", "CAUTION", or "CANCEL / SKIP".
4. Provide exactly 3 distinct, specific items in "topDealbreakers".
5. Return ONLY valid JSON matching the requested schema. Do not include markdown prose outside the JSON.`;

function buildPrompt(resolved: ResolvedLinkMetadata): string {
  const hintLines = [
    `Original URL: ${resolved.originalUrl}`,
    `Resolved Product URL: ${resolved.resolvedUrl}`,
    `Retailer: ${resolved.retailer} (${resolved.finalDomain})`,
    resolved.urlSlugHint ? `URL Product Hints: ${resolved.urlSlugHint}` : null,
    resolved.pageTitle ? `Fetched Page Title: ${resolved.pageTitle}` : null,
    resolved.brandHint ? `Fetched Brand Hint: ${resolved.brandHint}` : null,
    resolved.priceHint ? `Fetched Price Hint: ${resolved.priceHint}` : null,
    resolved.metaDescription ? `Fetched Page Summary: ${resolved.metaDescription}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  return `Investigate this ${resolved.retailer} product listing for buyer due diligence:
${hintLines}

Tasks:
1. Inspect ${resolved.resolvedUrl} using URL Context (alongside the server-resolved metadata above) to confirm the exact product name, brand, category, key claims, and price.
2. Evaluate recurring customer complaints, durability/longevity weak points, warranty/support patterns, Reddit/enthusiast consensus, and review-manipulation red flags for this exact product.
3. Return a single structured JSON object with:
- productName, brand, retailer, category, estimatedPrice
- verdict ("BUY", "CAUTION", or "CANCEL / SKIP"), verdictHeadline, executiveSummary
- trustScore (0-100 integer) and scoreBreakdown (buildQuality, longevity, customerSupport, reviewIntegrity)
- topDealbreakers (array of 3 objects: title, severity, frequency, summary, sourceEvidence)
- whoShouldBuy (3 strings) and whoShouldAvoid (3 strings)
- fakeReviewRisk ("Low", "Moderate", or "High"), fakeReviewSummary, fakeReviewRedFlags (array of { signal, detail, severity })
- redditConsensus`;
}

function extractUrlContextSources(
  response: unknown,
  resolved: ResolvedLinkMetadata,
): {
  sources: GroundedSource[];
  urlContextFetched: boolean;
} {
  const res = response as {
    candidates?: Array<{
      urlContextMetadata?: {
        urlMetadata?: Array<{
          retrievedUrl?: string;
          urlRetrievalStatus?: string;
        }>;
      };
    }>;
  };

  const candidate = res?.candidates?.[0];
  const urlMetadata = candidate?.urlContextMetadata?.urlMetadata ?? [];
  const sources: GroundedSource[] = [
    {
      title: resolved.pageTitle || `${resolved.retailer} Product Listing`,
      url: resolved.resolvedUrl,
      sourceType: 'product_page',
    },
  ];

  let urlContextFetched = resolved.fetchSucceeded;

  for (const entry of urlMetadata) {
    const retrievedUrl = entry.retrievedUrl;
    if (
      entry.urlRetrievalStatus === 'URL_RETRIEVAL_STATUS_SUCCESS' ||
      Boolean(retrievedUrl)
    ) {
      urlContextFetched = true;
    }
    if (retrievedUrl && /^https?:\/\//i.test(retrievedUrl)) {
      sources.push({
        title:
          retrievedUrl === resolved.resolvedUrl
            ? resolved.pageTitle || `${resolved.retailer} Listing (URL Context)`
            : retrievedUrl,
        url: retrievedUrl,
        sourceType:
          retrievedUrl === resolved.resolvedUrl
            ? 'product_page'
            : classifySourceType(retrievedUrl),
      });
    }
  }

  return { sources, urlContextFetched };
}

async function callModelWithUrlContext(
  ai: GoogleGenAI,
  modelName: string,
  resolved: ResolvedLinkMetadata,
) {
  const prompt = buildPrompt(resolved);

  try {
    return await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ urlContext: {} }],
        responseMimeType: 'application/json',
        responseSchema: AUDIT_RESPONSE_SCHEMA,
      },
    });
  } catch (err: unknown) {
    if (!isSchemaToolConflictError(err)) {
      throw err;
    }

    const fallbackPrompt = `${prompt}

Respond ONLY with a single raw JSON object (no markdown fences) containing these exact keys:
productName (string), brand (string), retailer (string), category (string), estimatedPrice (string), verdict ("BUY" | "CAUTION" | "CANCEL / SKIP"), verdictHeadline (string), executiveSummary (string), trustScore (integer 0-100), scoreBreakdown ({ buildQuality, longevity, customerSupport, reviewIntegrity }), topDealbreakers (array of 3 { title, severity, frequency, summary, sourceEvidence }), whoShouldBuy (string[]), whoShouldAvoid (string[]), fakeReviewRisk ("Low" | "Moderate" | "High"), fakeReviewSummary (string), fakeReviewRedFlags (array of { signal, detail, severity }), redditConsensus (string).`;

    return await ai.models.generateContent({
      model: modelName,
      contents: fallbackPrompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ urlContext: {} }],
      },
    });
  }
}

async function runProductAudit(ai: GoogleGenAI, resolved: ResolvedLinkMetadata) {
  return await generateWithRetryAndFallback(
    (modelName) => callModelWithUrlContext(ai, modelName, resolved),
    {
      primaryModel: PRIMARY_MODEL,
      fallbackModel: FALLBACK_MODEL,
      primaryRetries: 1,
      fallbackRetries: 1,
      baseDelayMs: 1200,
    },
  );
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, model: PRIMARY_MODEL, fallbackModel: FALLBACK_MODEL });
  });

  app.post('/api/analyze', async (req, res) => {
    const rawUrl = typeof req.body?.url === 'string' ? req.body.url : '';
    const validation = validateProductUrl(rawUrl);

    if (!validation.valid) {
      res.status(400).json({ error: validation.error || 'Invalid product URL.' });
      return;
    }

    const ai = createGeminiClient();
    if (!ai) {
      res.status(503).json({
        error:
          'GEMINI_API_KEY is not configured on the server. Add your Gemini API key in Settings > Secrets to run live product audits.',
      });
      return;
    }

    try {
      const resolved = await resolveProductLinkMetadata(validation.normalizedUrl);
      const { response, modelUsed, fellBack } = await runProductAudit(ai, resolved);

      const rawText = response.text;
      if (!rawText || !rawText.trim()) {
        res.status(502).json({
          error: 'Gemini returned an empty response while inspecting this product URL. Please try again.',
        });
        return;
      }

      const { sources, urlContextFetched } = extractUrlContextSources(response, resolved);
      const parsedAudit = parseAndSanitizeAuditPayload(rawText, resolved.resolvedUrl, {
        groundedSources: sources,
        urlContextFetched,
      });

      res.json({ audit: parsedAudit, meta: { modelUsed, fellBack } });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unexpected server error';
      const status = (err as { status?: number })?.status;

      if (status === 403 || /PERMISSION_DENIED|API_KEY_INVALID/i.test(message)) {
        res.status(403).json({
          error:
            'Gemini API authentication failed. Verify your GEMINI_API_KEY in Settings > Secrets.',
        });
        return;
      }

      if (isRateLimitError(err)) {
        res.status(429).json({
          error:
            'Gemini API rate limit or quota reached on both primary and fallback models. Wait a moment and retry, or check your API quota.',
        });
        return;
      }

      if (isTransientUnavailableError(err)) {
        res.status(503).json({
          error:
            'Both Gemini models are temporarily experiencing high demand. Please retry in a few seconds.',
        });
        return;
      }

      res.status(500).json({
        error: `Could not complete product audit: ${message}`,
      });
    }
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      const indexHtml = path.join(distPath, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Buy or Skip server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
