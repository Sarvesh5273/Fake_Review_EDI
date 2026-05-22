import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ScrapedReview = {
  text: string;
  rating?: number;
  productId?: string;
};

type ScrapeResult = {
  pageTitle: string;
  pageUrl: string;
  reviews: ScrapedReview[];
  scrapeMode: "playwright";
};

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

  return undefined;
};

const looksLikeRatingStart = (line: string) =>
  /^\d(?:\.\d)?$/.test(line) ||
  /^\d(?:\.\d)?\s*•\s*.+/.test(line) ||
  /^\d(?:\.\d)?\s*★/.test(line);

const extractReviewsFromPageText = (pageText: string, pageUrl: string) => {
  const lines = pageText
    .split(/\r?\n/)
    .map((line) => cleanText(line))
    .filter(Boolean);

  if (/amazon\./i.test(pageUrl)) {
    const reviews: ScrapedReview[] = [];
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

    const deduped: ScrapedReview[] = [];
    const seen = new Set<string>();
    for (const review of reviews) {
      const key = `${review.text.slice(0, 140).toLowerCase()}|${review.rating ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(review);
    }
    return deduped.slice(0, 20);
  }

  const reviews: ScrapedReview[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const next = lines[i + 1] ?? "";
    const title = lines[i + 2] ?? "";
    const marker = lines[i + 3] ?? "";
    const bodyLine = lines[i + 4] ?? "";

    const combinedRatingLine = `${line} ${next}`.trim();
    const hasStructuredBlock =
      (looksLikeRatingStart(line) && next === "•" && Boolean(title) && marker.toLowerCase().startsWith("review for:")) ||
      /^\d(?:\.\d)?\s*•\s*.+/.test(combinedRatingLine);

    if (!hasStructuredBlock) continue;

    const rating = extractRating(combinedRatingLine || line);
    const reviewText = bodyLine || title || marker;
    if (!reviewText || reviewText.length < 10) continue;

    reviews.push({
      text: reviewText,
      rating,
      productId: pageUrl,
    });
  }

  const deduped: ScrapedReview[] = [];
  const seen = new Set<string>();
  for (const review of reviews) {
    const key = `${review.text.slice(0, 140).toLowerCase()}|${review.rating ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(review);
  }

  return deduped.slice(0, 20);
};

const extractReviewsFromHtml = async (page: import("playwright").Page, pageUrl: string) => {
  const selectors = [
    "[data-hook='review']",
    "[data-automation-id='review-card']",
    ".review",
    ".reviews .review",
    ".review-card",
    ".jdgm-rev",
    ".spr-review",
    ".yotpo-review",
    ".okeReviews-review-card",
    ".bazaarvoice-review",
    ".bv-content-item",
    "div.t-ZTKy",
    "div._27M-vq",
    "div.col._2wzgFH.K0kLPL",
    "div._16PBlm",
  ];

  const seen = new Set<string>();
  const reviews: ScrapedReview[] = [];

  for (const selector of selectors) {
    const nodes = await page.locator(selector).all();
    for (const node of nodes) {
      const text = cleanText((await node.innerText().catch(() => "")) || "");
      if (text.length < 20) continue;

      let ratingText = "";
      for (const ratingSelector of ["[aria-label*='out of 5']", "[aria-label*='stars']", "._3LWZlK", "[data-rating]"]) {
        const ratingNode = node.locator(ratingSelector).first();
        if (await ratingNode.count()) {
          ratingText = cleanText((await ratingNode.innerText().catch(() => "")) || (await ratingNode.getAttribute("aria-label").catch(() => "")) || "");
          break;
        }
      }

      const bodyCandidates = [
        "[data-hook='review-body']",
        "[data-hook='review-body'] span",
        "[data-automation-id='review-body']",
        ".review-text",
        ".review-content",
        ".review-body",
        ".jdgm-rev__body",
        ".spr-review-content-body",
        ".yotpo-review-content",
        ".okeReviews-review-content",
        "._6K-7Co",
        ".t-ZTKy",
      ];

      let body = "";
      for (const bodySelector of bodyCandidates) {
        const bodyNode = node.locator(bodySelector).first();
        if (await bodyNode.count()) {
          body = cleanText((await bodyNode.innerText().catch(() => "")) || "");
          if (body) break;
        }
      }

      if (!body) body = text;
      const key = `${body.slice(0, 160).toLowerCase()}|${ratingText}`;
      if (seen.has(key)) continue;
      seen.add(key);

      reviews.push({
        text: body,
        rating: extractRating(ratingText),
        productId: pageUrl,
      });
    }
  }

  if (reviews.length < 3) {
    const fallbackTextNodes = await page.locator("[class*='review'], [id*='review']").all();
    for (const node of fallbackTextNodes) {
      const text = cleanText((await node.innerText().catch(() => "")) || "");
      if (text.length < 25) continue;
      const key = text.slice(0, 160).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      reviews.push({ text, rating: extractRating(text), productId: pageUrl });
    }
  }

  return reviews.slice(0, 20);
};

const tryLoadAmazonReviews = async (page: import("playwright").Page) => {
  const reviewLink = page.locator('a[href*="#customerReviews"], a:has-text("Reviews")').first();
  if ((await reviewLink.count()) === 0) return;

  try {
    await reviewLink.click({ timeout: 10000 });
    await page.waitForTimeout(2500);
  } catch {
    await page.goto(`${page.url().split("#")[0]}#customerReviews`, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => undefined);
    await page.waitForTimeout(2500);
  }
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: string };
    const url = body.url?.trim();

    if (!url) {
      return NextResponse.json({ error: "Provide a page URL." }, { status: 400 });
    }

    const { chromium } = await import("playwright");
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1800 } });

    try {
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      } catch {
        // Some retailers keep long-lived network connections open; continue with the rendered DOM.
      }
      await page.waitForLoadState("domcontentloaded").catch(() => undefined);
      await page.waitForTimeout(2500);

      const pageTitle = cleanText((await page.title().catch(() => "")) || (await page.locator("h1").first().innerText().catch(() => "")) || "Unknown product");
      let reviews = await extractReviewsFromHtml(page, url);

      if (reviews.length < 3) {
        if (/amazon\./i.test(url)) {
          await tryLoadAmazonReviews(page);
          reviews = await extractReviewsFromHtml(page, url);
        }
      }

      if (reviews.length < 3) {
        const pageText = (await page.locator("body").innerText().catch(() => "")) || "";
        reviews = extractReviewsFromPageText(pageText, url);
      }

      const result: ScrapeResult = {
        pageTitle,
        pageUrl: url,
        reviews,
        scrapeMode: "playwright",
      };

      return NextResponse.json(result);
    } finally {
      await page.close().catch(() => undefined);
      await browser.close().catch(() => undefined);
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to scrape the page.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
