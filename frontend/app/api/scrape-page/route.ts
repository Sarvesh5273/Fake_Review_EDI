import { NextResponse } from "next/server";
import FirecrawlApp from "@mendable/firecrawl-js";

export const runtime = "nodejs";
export const maxDuration = 60;

type ScrapedReview = {
  text: string;
  rating?: number;
  productId?: string;
};

const extractRating = (value: string) => {
  const ratingMatch = value.match(/([1-5](?:\.\d)?)\s*(?:out of 5|stars?)/i);
  if (ratingMatch) return Number(ratingMatch[1]);
  const starMatch = value.match(/\b([1-5](?:\.\d)?)\s*★/i);
  if (starMatch) return Number(starMatch[1]);
  return undefined;
};

const parseReviewsFromMarkdown = (markdown: string, pageUrl: string): ScrapedReview[] => {
  const lines = markdown.split("\n").map(l => l.trim()).filter(Boolean);
  const reviews: ScrapedReview[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    if (line.length < 25 || line.length > 1000) continue;
    if (/^#+\s/.test(line)) continue; // skip headings
    if (/^\[.*\]\(.*\)$/.test(line)) continue; // skip pure links

    const rating = extractRating(line);
    const key = line.slice(0, 140).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    reviews.push({ text: line, rating, productId: pageUrl });
  }

  return reviews.slice(0, 20);
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: string };
    const url = body.url?.trim();

    if (!url) {
      return NextResponse.json({ error: "Provide a page URL." }, { status: 400 });
    }

    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Firecrawl API key not configured." }, { status: 500 });
    }

    const app = new FirecrawlApp({ apiKey });
    const result = await app.scrape(url, { formats: ["markdown"] });

    if (!result.success || !result.markdown) {
      return NextResponse.json({ error: "Failed to scrape page." }, { status: 500 });
    }

    const reviews = parseReviewsFromMarkdown(result.markdown, url);

    return NextResponse.json({
      pageTitle: result.metadata?.title ?? "Unknown product",
      pageUrl: url,
      reviews,
      scrapeMode: "firecrawl",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Unable to scrape the page.", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}