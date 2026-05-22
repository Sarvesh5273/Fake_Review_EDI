const normalizeWhitespace = (value) => value.replace(/\s+/g, " ").trim();

const cleanText = (value) =>
  normalizeWhitespace(
    value
      .replace(/\u00a0/g, " ")
      .replace(/\s*\n\s*/g, " ")
      .replace(/\s{2,}/g, " ")
  );

const getRatingFromNode = (node) => {
  const text = `${node.getAttribute("aria-label") ?? ""} ${node.textContent ?? ""}`.toLowerCase();
  const match = text.match(/([1-5](?:\.\d)?)\s*(?:out of 5|stars?)/i);
  if (match) return Number(match[1]);

  const numericMatch = text.match(/\b([1-5](?:\.\d)?)\b/);
  if (numericMatch) {
    const parsed = Number(numericMatch[1]);
    if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 5) return parsed;
  }

  const dataAttrs = [
    node.getAttribute("data-rating"),
    node.getAttribute("data-star-rating"),
    node.getAttribute("data-score"),
  ].filter(Boolean);

  for (const attr of dataAttrs) {
    const parsed = Number(attr);
    if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 5) return parsed;
  }

  return undefined;
};

const extractReviewsFromCandidate = (candidate) => {
  const text = cleanText(candidate.textContent || "");
  if (text.length < 25) return null;

  const isFlipkart = /flipkart\.com/i.test(document.location.hostname);
  const reviewBodySelectors = [
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
    ...(isFlipkart ? [".t-ZTKy", "._6K-7Co", ".t-ZTKy > div > div", ".t-ZTKy > div"] : []),
  ];

  let body = "";
  if (isFlipkart) {
    const flipkartBodyNode = candidate.querySelector("._6K-7Co, .t-ZTKy, .t-ZTKy > div > div");
    if (flipkartBodyNode?.textContent) {
      body = cleanText(flipkartBodyNode.textContent);
    }
  }

  for (const selector of reviewBodySelectors) {
    const bodyNode = candidate.querySelector(selector);
    if (bodyNode?.textContent) {
      body = cleanText(bodyNode.textContent);
      break;
    }
  }

  if (!body) {
    body = text;
  }

  if (body.length < 15) return null;

  const ratingNode = candidate.querySelector(
    [
      "[aria-label*='out of 5']",
      "[aria-label*='stars']",
      "[data-rating]",
      "[data-star-rating]",
      "[data-score]",
      ...(isFlipkart ? ["._3LWZlK"] : []),
    ].join(",")
  );

  const rating = ratingNode ? getRatingFromNode(ratingNode) : getRatingFromNode(candidate);

  return {
    text: body,
    rating: Number.isFinite(rating) ? rating : undefined,
    productId: document.location.href,
  };
};

const collectReviews = () => {
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
    ...(isFlipkart
      ? [
          "div.t-ZTKy",
          "div._27M-vq",
          "div.col._2wzgFH.K0kLPL",
          "div._1AtVbE",
          "div._16PBlm",
          "div._1AtVbE ._1AtVbE",
        ]
      : []),
  ];

  const candidates = new Set();
  selectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((element) => candidates.add(element));
  });

  if (candidates.size === 0) {
    document.querySelectorAll("[class*='review'], [id*='review']").forEach((element) => candidates.add(element));
  }

  if (candidates.size === 0 && isFlipkart) {
    document.querySelectorAll("div").forEach((element) => {
      const text = cleanText(element.textContent || "");
      const hasRating = /(^|\s)[1-5](\.\d)?\s*(stars?|out of 5)/i.test(text) || /[1-5]\s*★/.test(text);
      const hasReviewText = text.length > 30 && text.length < 1000;
      if (hasRating && hasReviewText) candidates.add(element);
    });
  }

  const reviews = Array.from(candidates)
    .map((candidate) => extractReviewsFromCandidate(candidate))
    .filter((review) => review && review.text.length > 0);

  const deduped = [];
  const seen = new Set();

  for (const review of reviews) {
    const key = `${review.text.slice(0, 140).toLowerCase()}|${review.rating ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(review);
  }

  const title =
    cleanText(document.querySelector("h1")?.textContent || "") ||
    cleanText(document.title || "") ||
    "Unknown product";

  return {
    pageTitle: title,
    pageUrl: document.location.href,
    reviews: deduped.slice(0, 20),
  };
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "SCAN_REVIEWS") {
    sendResponse(collectReviews());
  }

  return true;
});
