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
    const reviews = (body.reviews ?? [])
      .filter((review) => review.text && review.text.trim().length > 0)
      .map((review) => ({
        text: review.text.trim(),
        rating: typeof review.rating === "number" ? review.rating : null,
        timestamp: review.timestamp ?? null,
        productId: review.productId ?? null,
      }));

    if (reviews.length < 3) {
      return NextResponse.json(
        {
          error: "Provide at least 3 reviews to analyze.",
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
      return NextResponse.json({ ...result, marketplaceHint });
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
