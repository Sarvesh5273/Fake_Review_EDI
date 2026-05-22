"use client";

import React, { useMemo, useState } from "react";
import { ArrowRight, FileText, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ReviewInput = {
  text: string;
  rating?: number;
};

type ScoreResult = {
  aiScore: number;
  authenticityScore: number;
  confidence: number;
  verdict: string;
  reviewCount?: number;
  sourceMode: "model" | "manual";
  scrapeMode?: "playwright" | "manual";
  marketplaceHint: {
    marketplace: "Amazon" | "Shopify" | "Walmart" | "Unknown";
    hostname: string | null;
  };
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

const sampleReviews = [
  "5|Amazing quality, feels premium and shipping was fast.",
  "5|This product is perfect. Highly recommended!",
  "4|Solid build and good value for money.",
  "1|Broke after two days, totally disappointed.",
  "2|Looks nice but performance is weak.",
  "5|Great product, buying again for my team.",
];

const parseLine = (line: string): ReviewInput | null => {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^([1-5])\s*[\-:|]\s*(.+)$/);
  if (match) {
    return { rating: Number(match[1]), text: match[2].trim() };
  }

  return { text: trimmed };
};

const parseReviewText = (text: string) =>
  text
    .split("\n")
    .map((line) => parseLine(line))
    .filter((review): review is ReviewInput => !!review && review.text.length > 0);

const parseCsvLine = (line: string) => {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  result.push(current);
  return result.map((value) => value.trim());
};

const parseCsv = (text: string): ReviewInput[] => {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];

  const header = parseCsvLine(lines[0]).map((value) => value.toLowerCase());
  const reviewIndex =
    header.findIndex((col) => col.includes("review") || col.includes("text") || col.includes("content")) ?? -1;
  const ratingIndex = header.findIndex((col) => col.includes("rating") || col.includes("stars"));

  const startRow = reviewIndex >= 0 ? 1 : 0;
  const reviewCol = reviewIndex >= 0 ? reviewIndex : 0;

  return lines.slice(startRow).map((line) => {
    const cols = parseCsvLine(line);
    const textValue = cols[reviewCol] ?? "";
    const ratingValue = ratingIndex >= 0 ? Number(cols[ratingIndex]) : NaN;
    return {
      text: textValue.trim(),
      rating: Number.isFinite(ratingValue) ? ratingValue : undefined,
    };
  });
};

export default function QuickCheckPage() {
  const [productUrl, setProductUrl] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [csvName, setCsvName] = useState<string | null>(null);
  const [reviews, setReviews] = useState<ReviewInput[]>([]);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reviewCount = useMemo(() => reviews.length, [reviews]);
  const reviewSourceMode = useMemo(() => {
    if (reviews.length > 0) return "reviews";
    if (productUrl.trim()) return "url";
    return "empty";
  }, [productUrl, reviews.length]);
  const detectedMarketplace = useMemo(() => {
    if (!productUrl) return null;
    try {
      const url = new URL(productUrl);
      const hostname = url.hostname.replace(/^www\./, "");
      if (hostname.includes("amazon.")) return { label: "Amazon", hostname };
      if (hostname.includes("shopify.") || hostname.includes("myshopify.com")) return { label: "Shopify", hostname };
      if (hostname.includes("walmart.")) return { label: "Walmart", hostname };
      return { label: "Unknown", hostname };
    } catch {
      return { label: "Invalid URL", hostname: null };
    }
  }, [productUrl]);

  const handleAnalyze = async () => {
    setIsSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/quick-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviews, productUrl }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.details || data.error || "Unable to analyze reviews.");
      }

      setResult(data);
    } catch (err: any) {
      setError(err?.message || "Unable to analyze reviews.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="absolute inset-0 z-0">
        <video autoPlay muted loop playsInline aria-hidden="true" className="h-full w-full object-cover opacity-75">
          <source
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/bg-hero-0BnFGdr81Ifnj3WbBZoNt1KE4D5DMT.mp4"
            type="video/mp4"
          />
        </video>
        <div className="absolute inset-0 bg-gradient-to-br from-[#101831]/70 via-black/40 to-[#040406]/70" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/80" />
        <div className="absolute -top-32 right-0 h-96 w-96 rounded-full bg-fuchsia-500/20 blur-[140px]" />
        <div className="absolute bottom-0 left-0 h-[420px] w-[420px] rounded-full bg-cyan-400/15 blur-[160px]" />
      </div>

      <div className="absolute inset-0 z-[1] pointer-events-none opacity-30">
        {[...Array(8)].map((_, i) => (
          <div key={`h-${i}`} className="absolute h-px bg-white/10" style={{ top: `${12.5 * (i + 1)}%`, left: 0, right: 0 }} />
        ))}
        {[...Array(12)].map((_, i) => (
          <div key={`v-${i}`} className="absolute w-px bg-white/10" style={{ left: `${8.33 * (i + 1)}%`, top: 0, bottom: 0 }} />
        ))}
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1400px] flex-col px-6 py-12 lg:px-12">
        <header className="flex items-center justify-between">
          <a href="/" className="inline-flex items-center gap-2">
            <span className="text-2xl font-display tracking-tight">VERTEXSHIELD</span>
            <span className="font-mono text-xs text-white/40">TM</span>
          </a>
          <a href="/login" className="text-sm text-white/60 transition-colors hover:text-white">
            Team login
          </a>
        </header>

        <main className="mt-12 grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-3 text-sm font-mono text-white/60">
              <span className="h-px w-8 bg-white/30" />
              Quick Check (model-backed)
            </div>
            <h1 className="text-[clamp(2.6rem,5vw,4.5rem)] font-display leading-[0.95]">
              Paste reviews and get a fast model-backed authenticity signal.
            </h1>
            <p className="text-lg text-white/65">
              Paste reviews or upload a CSV to generate an AI risk score, authenticity score, and model explanation.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="border-white/10 bg-white/[0.08] backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-lg">What you get</CardTitle>
                  <CardDescription className="text-white/60">
                    Risk score, authenticity score, signal breakdown, and model output.
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card className="border-white/10 bg-white/[0.08] backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-lg">Best use</CardTitle>
                  <CardDescription className="text-white/60">
                    Consumer review triage before marketplace or browser-extension expansion.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>

          <div className="space-y-6">
            <Card className="border-white/10 bg-white/[0.08] backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-xl">Quick Check</CardTitle>
                <CardDescription className="text-white/60">Add a product URL (optional) and paste reviews.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm text-white/55">Product URL (optional)</label>
                  <input
                    value={productUrl}
                    onChange={(e) => setProductUrl(e.target.value)}
                    placeholder="https://amazon.com/dp/..."
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white placeholder:text-white/25 focus:outline-none"
                  />
                  {detectedMarketplace && (
                    <p className="mt-2 text-xs text-white/45">
                      Detected: <span className="text-white/70">{detectedMarketplace.label}</span>
                      {detectedMarketplace.hostname ? ` • ${detectedMarketplace.hostname}` : ""}
                      {detectedMarketplace.label !== "Invalid URL" && " (model-backed analysis)"}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/55">Paste reviews (optional if you use a URL)</label>
                  <textarea
                    value={reviewText}
                    onChange={(e) => {
                      const text = e.target.value;
                      setReviewText(text);
                      setReviews(parseReviewText(text));
                    }}
                    placeholder="5 | Amazing build quality and fast shipping"
                    className="min-h-[180px] w-full rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white placeholder:text-white/25 focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm text-white/60">
                  <label className="flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 transition-colors hover:bg-white/10">
                    <Upload className="h-4 w-4" />
                    {csvName ? csvName : "Upload CSV"}
                    <input
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const text = await file.text();
                        const parsed = parseCsv(text).filter((review) => review.text.length > 0);
                        setCsvName(file.name);
                        setReviews(parsed);
                        setReviewText(parsed.map((review) => `${review.rating ?? ""}|${review.text}`).join("\n"));
                      }}
                    />
                  </label>
                  <Button
                    variant="ghost"
                    className="text-white/70 hover:text-white"
                    onClick={() => {
                      const sample = sampleReviews.join("\n");
                      setReviewText(sample);
                      setReviews(parseReviewText(sample));
                      setCsvName(null);
                    }}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Use sample data
                  </Button>
                </div>

                <div className="text-xs text-white/45">
                  Source: <span className="text-white/70">{reviewSourceMode}</span> • Reviews detected:{" "}
                  <span className="text-white/70">{reviewCount}</span>
                </div>

                {error && <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}

                <Button
                  onClick={handleAnalyze}
                  disabled={isSubmitting || (!productUrl.trim() && reviews.length < 3)}
                  className="w-full bg-white text-black hover:bg-white/90"
                >
                  {isSubmitting ? "Analyzing..." : "Analyze url or reviews"}
                  {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </CardContent>
            </Card>

            {result && (
              <Card className="border-white/10 bg-white/[0.08] backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Sparkles className="h-5 w-5" />
                    Result
                  </CardTitle>
                  <CardDescription className="text-white/60">{result.verdict}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/65">
                    Source mode: <span className="text-white">{result.sourceMode}</span>
                    {result.scrapeMode ? (
                      <>
                        <br />
                        Scrape mode: <span className="text-white">{result.scrapeMode}</span>
                      </>
                    ) : null}
                    {typeof result.reviewCount === "number" ? (
                      <>
                        <br />
                        Reviews found: <span className="text-white">{result.reviewCount}</span>
                      </>
                    ) : null}
                    <br />
                    Marketplace: <span className="text-white">{result.marketplaceHint.marketplace}</span>
                    {result.marketplaceHint.hostname ? ` • ${result.marketplaceHint.hostname}` : ""}
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-white/45">AI risk score</div>
                      <div className="mt-2 text-3xl font-display">{result.aiScore}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-white/45">Authenticity</div>
                      <div className="mt-2 text-3xl font-display">{result.authenticityScore}</div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/65">
                    Confidence: <span className="text-white">{Math.round(result.confidence * 100)}%</span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 text-sm text-white/60">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                      Duplicate ratio: {result.signals.duplicateRatio}
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                      Short review ratio: {result.signals.shortReviewRatio}
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                      Rating skew: {result.signals.ratingSkew}
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                      Repeated phrases: {result.signals.repeatedPhraseRatio}
                    </div>
                    {typeof result.signals.semanticSimilarity === "number" && (
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                        Semantic similarity: {result.signals.semanticSimilarity}
                      </div>
                    )}
                  </div>

                  {result.model && (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/65">
                      Model: <span className="text-white">{result.model.name}</span>
                      <br />
                      Probability: <span className="text-white">{result.model.probability}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
