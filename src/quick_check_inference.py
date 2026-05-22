from __future__ import annotations

import json
import math
import sys
from dataclasses import dataclass
from typing import Any

import joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from src.config import CUSTOM_MODEL_PATH, CUSTOM_SCALER_PATH


@dataclass
class ReviewInput:
    text: str
    rating: float | None = None
    timestamp: str | None = None
    product_id: str | int | None = None


def clamp(value: float, min_value: float, max_value: float) -> float:
    return float(max(min_value, min(value, max_value)))


def normalize_text(text: str) -> str:
    return " ".join("".join(char.lower() if char.isalnum() else " " for char in text).split())


def parse_reviews(payload: Any) -> list[ReviewInput]:
    raw_reviews = payload.get("reviews", [])
    reviews: list[ReviewInput] = []

    for item in raw_reviews:
        if not isinstance(item, dict):
            continue
        text = str(item.get("text", "")).strip()
        if not text:
            continue
        rating = item.get("rating")
        reviews.append(
            ReviewInput(
                text=text,
                rating=float(rating) if isinstance(rating, (int, float)) else None,
                timestamp=str(item.get("timestamp")).strip() if item.get("timestamp") else None,
                product_id=item.get("productId"),
            )
        )

    return reviews


def average_pairwise_similarity(texts: list[str]) -> float:
    if len(texts) < 2:
        return 0.0

    vectorizer = TfidfVectorizer(ngram_range=(1, 2), stop_words="english")
    matrix = vectorizer.fit_transform(texts)
    if matrix.shape[1] == 0:
        return 0.0

    similarity_matrix = cosine_similarity(matrix)
    upper = similarity_matrix[np.triu_indices(len(texts), k=1)]
    return float(upper.mean()) if upper.size else 0.0


def parse_timestamp(value: str) -> np.datetime64 | None:
    try:
        return np.datetime64(value)
    except Exception:
        return None


def compute_features(reviews: list[ReviewInput]) -> dict[str, float]:
    texts = [normalize_text(review.text) for review in reviews if review.text.strip()]
    raw_texts = [review.text for review in reviews if review.text.strip()]
    total = len(raw_texts)

    lengths = [len(text) for text in raw_texts]
    short_ratio = (sum(length < 40 for length in lengths) / total) if total else 0.0

    counts: dict[str, int] = {}
    for text in texts:
        if not text:
            continue
        counts[text] = counts.get(text, 0) + 1
    duplicate_count = sum(max(0, count - 1) for count in counts.values())
    duplicate_ratio = (duplicate_count / total) if total else 0.0

    exclamations = sum(text.count("!") for text in raw_texts)
    total_chars = sum(len(text) for text in raw_texts)
    exclamation_ratio = (exclamations / total_chars) if total_chars else 0.0

    ratings = [review.rating for review in reviews if review.rating is not None]
    if ratings:
        avg_rating = sum(ratings) / len(ratings)
        variance = sum((rating - avg_rating) ** 2 for rating in ratings) / len(ratings)
        rating_std = math.sqrt(variance)
        rating_skew = clamp(
            (0.5 if avg_rating >= 4.6 or avg_rating <= 1.8 else 0.0) + (0.5 if rating_std < 0.4 else 0.0),
            0.0,
            1.0,
        )
    else:
        rating_skew = 0.0

    trigram_counts: dict[str, int] = {}
    for text in texts:
        tokens = [token for token in text.split(" ") if token]
        for index in range(max(0, len(tokens) - 2)):
            trigram = f"{tokens[index]} {tokens[index + 1]} {tokens[index + 2]}"
            trigram_counts[trigram] = trigram_counts.get(trigram, 0) + 1
    repeated_trigrams = sum(1 for count in trigram_counts.values() if count >= 3)
    repeated_phrase_ratio = clamp(repeated_trigrams / 6, 0.0, 1.0)

    semantic_similarity = average_pairwise_similarity(raw_texts)

    timestamps = [parse_timestamp(review.timestamp) for review in reviews if review.timestamp]
    timestamps = [timestamp for timestamp in timestamps if timestamp is not None]
    if len(timestamps) > 1:
        ordered = np.sort(np.array(timestamps))
        diffs = np.diff(ordered).astype("timedelta64[m]").astype(np.float64) / 60.0
        avg_gap_hours = float(diffs.mean()) if diffs.size else 0.0
    else:
        avg_gap_hours = 24.0 / max(total - 1, 1)

    product_ids = [review.product_id for review in reviews if review.product_id is not None]
    if product_ids:
        product_counts: dict[str, int] = {}
        for product_id in product_ids:
            key = str(product_id)
            product_counts[key] = product_counts.get(key, 0) + 1
        total_products = sum(product_counts.values())
        probs = np.array([count / total_products for count in product_counts.values()], dtype=np.float64)
        entropy = float(-(probs * np.log2(probs)).sum()) if probs.size else 0.0
    else:
        entropy = 0.0

    max_reviews_24h = float(max(total, 1))
    degree_centrality = clamp(duplicate_ratio * 0.6 + short_ratio * 0.4, 0.0, 1.0)
    page_rank_score = clamp(rating_skew * 0.6 + repeated_phrase_ratio * 0.4, 0.0, 1.0)

    return {
        "Intra_User_Semantic_Similarity": semantic_similarity,
        "Max_Reviews_in_24_Hours": max_reviews_24h,
        "Average_Time_Gap_Between_Reviews_Hours": avg_gap_hours,
        "Entropy_of_Product_IDs_Reviewed": entropy,
        "Degree_Centrality": degree_centrality,
        "PageRank_Score": page_rank_score,
        "duplicateRatio": duplicate_ratio,
        "shortReviewRatio": short_ratio,
        "ratingSkew": rating_skew,
        "exclamationRatio": exclamation_ratio,
        "repeatedPhraseRatio": repeated_phrase_ratio,
    }


def verdict_from_probability(probability: float, confidence: float) -> str:
    verdict = "Likely genuine"
    if probability >= 0.65:
        verdict = "Likely coordinated"
    elif probability >= 0.35:
        verdict = "Needs review"

    if confidence < 0.4:
        verdict = f"{verdict} (low confidence)"

    return verdict


def main() -> None:
    payload = json.load(sys.stdin)
    reviews = parse_reviews(payload)
    if len(reviews) < 3:
        raise ValueError("Provide at least 3 reviews to analyze.")

    features = compute_features(reviews)
    feature_vector = np.array(
        [
            [
                features["Intra_User_Semantic_Similarity"],
                features["Max_Reviews_in_24_Hours"],
                features["Average_Time_Gap_Between_Reviews_Hours"],
                features["Entropy_of_Product_IDs_Reviewed"],
                features["Degree_Centrality"],
                features["PageRank_Score"],
            ]
        ],
        dtype=np.float32,
    )

    model = joblib.load(CUSTOM_MODEL_PATH)
    scaler = joblib.load(CUSTOM_SCALER_PATH)

    scaled = scaler.transform(feature_vector)
    probability = float(model.predict_proba(scaled)[0, 1])
    ai_score = int(round(clamp(probability, 0.0, 1.0) * 100))
    authenticity_score = int(round(100 - ai_score))
    confidence = clamp(min(1.0, len(reviews) / 20.0), 0.2, 1.0)

    result = {
        "aiScore": ai_score,
        "authenticityScore": authenticity_score,
        "confidence": round(confidence, 2),
        "verdict": verdict_from_probability(probability, confidence),
        "sourceMode": "model",
        "model": {
            "name": "custom_rf_model",
            "probability": round(probability, 4),
            "featureVector": [round(float(value), 4) for value in feature_vector.flatten().tolist()],
            "featureNames": [
                "Intra_User_Semantic_Similarity",
                "Max_Reviews_in_24_Hours",
                "Average_Time_Gap_Between_Reviews_Hours",
                "Entropy_of_Product_IDs_Reviewed",
                "Degree_Centrality",
                "PageRank_Score",
            ],
        },
        "signals": {
            "duplicateRatio": round(features["duplicateRatio"], 2),
            "shortReviewRatio": round(features["shortReviewRatio"], 2),
            "ratingSkew": round(features["ratingSkew"], 2),
            "exclamationRatio": round(features["exclamationRatio"], 3),
            "repeatedPhraseRatio": round(features["repeatedPhraseRatio"], 2),
            "semanticSimilarity": round(features["Intra_User_Semantic_Similarity"], 2),
        },
    }

    json.dump(result, sys.stdout)


if __name__ == "__main__":
    main()
