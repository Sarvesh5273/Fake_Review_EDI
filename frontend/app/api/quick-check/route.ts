import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";
import { NextResponse } from "next/server";

type ReviewInput = {
  text: string;
  rating?: number | null;
  timestamp?: string | null;
  productId?: string | number | null;
};

type MarketplaceHint = {
  marketplace: "Amazon" | "Shopify" | "Walmart" | "Unknown";
  hostname: string | null;
};

type QuickCheckResult = {
  aiScore: number;
  authenticityScore: number;
  confidence: number;
  verdict: string;
  sourceMode: "model" | "manual";
  marketplaceHint: MarketplaceHint;
  signals: {
    duplicateRatio: number;
    shortReviewRatio: number;
    ratingSkew: number;
    exclamationRatio: number;
    repeatedPhraseRatio: number;
    semanticSimilarity?: number;
  };
  model?: {
    name: string;
    probability: number;
    featureVector: number[];
    featureNames: string[];
  };
};

const detectMarketplace = (productUrl?: string | null): MarketplaceHint => {
  if (!productUrl) return { marketplace: "Unknown", hostname: null };

  try {
    const url = new URL(productUrl);
    const hostname = url.hostname.replace(/^www\./, "");

    if (hostname.includes("amazon.")) return { marketplace: "Amazon", hostname };
    if (hostname.includes("shopify.") || hostname.includes("myshopify.com")) return { marketplace: "Shopify", hostname };
    if (hostname.includes("walmart.")) return { marketplace: "Walmart", hostname };

    return { marketplace: "Unknown", hostname };
  } catch {
    return { marketplace: "Unknown", hostname: null };
  }
};

const parsePythonJson = (stdout: string): QuickCheckResult => JSON.parse(stdout) as QuickCheckResult;

const cleanText = (value: string) =>
  value
    .replace(/\u00a0/g, " ")
    .replace(/\s*\n\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

const extractRating = (value: string) => {
  const ratingMatch = value.match(/([1-5](?:\.\d)?)\s*(?:out of 5|stars?)/i);
  if (ratingMatch) return Number(ratingMatch[1]);

  const starMatch = value.match(/\b([1-5](?:\.\d)?)\s*★/i);
  if (starMatch) return Number(starMatch[1]);

  const numericMatch = value.match(/\b([1-5](?:\.\d)?)\b/);
  if (numericMatch) return Number(numericMatch[1]);

  return undefined;
};

const extractReviewsFromPageText = (pageText: string, pageUrl: string) => {
  const lines = pageText
    .split(/\r?\n/)
    .map((line) => cleanText(line))
    .filter(Boolean);

  if (/amazon\./i.test(pageUrl)) {
    const reviews: ReviewInput[] = [];
    for (let i = 0; i < lines.length; i += 1) {
      if (lines[i] !== "Verified Purchase") continue;

      let ratingIndex = i - 1;
      while (ratingIndex >= 0 && !/^\d(?:\.\d)?\s+out of 5 stars$/i.test(lines[ratingIndex])) {
        ratingIndex -= 1;
      }

      if (ratingIndex < 0) continue;

      const rating = extractRating(lines[ratingIndex]);
      const bodyLines: string[] = [];
      for (let j = i + 1; j < lines.length; j += 1) {
        const value = lines[j];
        if (
          /^Helpful$/i.test(value) ||
          /^Report$/i.test(value) ||
          /^\d+\s+people found this helpful$/i.test(value) ||
          /^One person found this helpful$/i.test(value) ||
          /^Reviewed in India on/i.test(value) ||
          /^Colour:/i.test(value) ||
          /^Color:/i.test(value)
        ) {
          break;
        }
        bodyLines.push(value);
      }

      const text = cleanText(bodyLines.join(" "));
      if (text.length < 10) continue;

      reviews.push({ text, rating, productId: pageUrl });
    }

    const deduped: ReviewInput[] = [];
    const seen = new Set<string>();
    for (const review of reviews) {
      const key = `${review.text.slice(0, 140).toLowerCase()}|${review.rating ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(review);
    }
    return deduped.slice(0, 20);
  }

  const reviews: ReviewInput[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const next = lines[i + 1] ?? "";
    const title = lines[i + 2] ?? "";
    const body = lines[i + 4] ?? "";
    const structuredRating = line.match(/^\d(?:\.\d)?$/) || line.match(/^\d(?:\.\d)?\s*•\s*.+/);

    if (!structuredRating || next !== "•") continue;

    const reviewText = body || title || lines[i + 3] || "";
    if (reviewText.length < 10) continue;

    reviews.push({
      text: reviewText,
      rating: extractRating(`${line} ${next}`),
      productId: pageUrl,
    });
  }

  const deduped: ReviewInput[] = [];
  const seen = new Set<string>();
  for (const review of reviews) {
    const key = `${review.text.slice(0, 140).toLowerCase()}|${review.rating ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(review);
  }

  return deduped.slice(0, 20);
};

const scrapeReviewsFromUrl = async (url: string) => {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1800 } });

  try {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    } catch {
      // Retailers often keep network activity alive; use the rendered DOM if navigation completes partially.
    }
    await page.waitForLoadState("domcontentloaded").catch(() => undefined);
    await page.waitForTimeout(2500);

    let pageText = await page.locator("body").innerText().catch(() => "");
    let reviews = extractReviewsFromPageText(pageText, url);

    if (reviews.length < 3 && /amazon\./i.test(url)) {
      const reviewLink = page.locator('a[href*="#customerReviews"], a:has-text("Reviews")').first();
      if ((await reviewLink.count()) > 0) {
        try {
          await reviewLink.click({ timeout: 10000 });
        } catch {
          await page.goto(`${page.url().split("#")[0]}#customerReviews`, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => undefined);
        }
        await page.waitForTimeout(2500);
        pageText = await page.locator("body").innerText().catch(() => "");
        reviews = extractReviewsFromPageText(pageText, url);
      }
    }

    return {
      pageTitle: cleanText((await page.title().catch(() => "")) || (await page.locator("h1").first().innerText().catch(() => "")) || "Unknown product"),
      pageUrl: url,
      reviews,
      scrapeMode: "playwright" as const,
    };
  } finally {
    await page.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
};

const getPythonBinary = () => {
  const candidates = [
    process.env.PYTHON_BIN && resolve(process.cwd(), process.env.PYTHON_BIN),
    resolve(process.cwd(), "../venv/bin/python"),
    resolve(process.cwd(), "../venv/bin/python3"),
    "python3",
    "python",
  ].filter(Boolean) as string[];

  return candidates[0] ?? "python3";
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { reviews?: ReviewInput[]; productUrl?: string };
    const marketplaceHint = detectMarketplace(body.productUrl);
    const providedReviews = (body.reviews ?? [])
      .filter((review) => review.text && review.text.trim().length > 0)
      .map((review) => ({
        text: review.text.trim(),
        rating: typeof review.rating === "number" ? review.rating : null,
        timestamp: review.timestamp ?? null,
        productId: review.productId ?? null,
      }));

    let reviews = providedReviews;
    let sourceMode: QuickCheckResult["sourceMode"] = "model";
    let scrapeMode: "playwright" | "manual" | undefined;

    if (reviews.length < 3) {
      if (!body.productUrl) {
        return NextResponse.json(
          {
            error: "Provide at least 3 reviews or a product URL to analyze.",
            marketplaceHint,
            sourceMode: "manual",
          },
          { status: 400 }
        );
      }

      const scraped = await scrapeReviewsFromUrl(body.productUrl);
      reviews = scraped.reviews;
      scrapeMode = scraped.scrapeMode;
      sourceMode = "model";
    }

    if (reviews.length < 3) {
      return NextResponse.json(
        {
          error: "Unable to extract at least 3 reviews from the provided URL.",
          marketplaceHint,
          sourceMode: "manual",
        },
        { status: 400 }
      );
    }

    const payload = JSON.stringify({ reviews });
    const pythonScript = join(resolve(process.cwd(), ".."), "src", "quick_check_inference.py");
    const pythonBinary = getPythonBinary();

    try {
      const stdout = execFileSync(pythonBinary, [pythonScript], {
        cwd: process.cwd(),
        maxBuffer: 1024 * 1024,
        env: {
          ...process.env,
          PYTHONPATH: `${resolve(process.cwd(), "..")}${process.env.PYTHONPATH ? `:${process.env.PYTHONPATH}` : ""}`,
        },
        input: payload,
        encoding: "utf8",
      });

      const result = parsePythonJson(stdout);
      return NextResponse.json({
        ...result,
        reviewCount: reviews.length,
        marketplaceHint,
        sourceMode,
        scrapeMode: scrapeMode ?? (providedReviews.length > 0 ? "manual" : "playwright"),
      });
    } catch (error) {
      const manualFallback = {
        aiScore: 0,
        authenticityScore: 0,
        confidence: 0.2,
        verdict: "Unable to run model inference",
        sourceMode: "manual" as const,
        marketplaceHint,
        signals: {
          duplicateRatio: 0,
          shortReviewRatio: 0,
          ratingSkew: 0,
          exclamationRatio: 0,
          repeatedPhraseRatio: 0,
        },
        warning: "Model inference failed; returned fallback response.",
      };

      return NextResponse.json({
        ...manualFallback,
        error: "Unable to run model inference.",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to process quick check request.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
