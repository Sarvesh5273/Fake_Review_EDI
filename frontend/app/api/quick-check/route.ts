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
          { error: "Provide at least 3 reviews or a product URL to analyze.", marketplaceHint, sourceMode: "manual" },
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
        { error: "Unable to extract at least 3 reviews from the provided URL.", marketplaceHint, sourceMode: "manual" },
        { status: 400 }
      );
    }

    // ARCHITECTURE FIX: Fetch from FastAPI instead of executing local Python
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
    
    try {
      const backendResponse = await fetch(`${apiUrl}/quick-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviews }),
      });

      if (!backendResponse.ok) {
        throw new Error(`FastAPI backend returned status: ${backendResponse.status}`);
      }

      const result = await backendResponse.json();
      
      return NextResponse.json({
        ...result,
        reviewCount: reviews.length,
        marketplaceHint,
        sourceMode,
        scrapeMode: scrapeMode ?? (providedReviews.length > 0 ? "manual" : "playwright"),
      });
      
    } catch (error) {
      // Graceful fallback if Railway backend is asleep or unreachable
      const manualFallback = {
        aiScore: 0,
        authenticityScore: 0,
        confidence: 0.2,
        verdict: "Backend Disconnected",
        sourceMode: "manual" as const,
        marketplaceHint,
        signals: { duplicateRatio: 0, shortReviewRatio: 0, ratingSkew: 0, exclamationRatio: 0, repeatedPhraseRatio: 0 },
        warning: "Failed to reach ML backend. Showing placeholder.",
      };

      return NextResponse.json({
        ...manualFallback,
        error: "Unable to communicate with the ML API.",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  } catch (error) {
    return NextResponse.json({ error: "Unable to process request.", details: String(error) }, { status: 500 });
  }
}