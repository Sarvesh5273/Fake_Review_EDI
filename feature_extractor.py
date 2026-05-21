from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd
from tqdm.auto import tqdm


INPUT_CSV = Path("/Users/sarvesh/Desktop/Fake_Review_EDI/synthetic_reviews.csv")
OUTPUT_CSV = Path("/Users/sarvesh/Desktop/Fake_Review_EDI/user_features.csv")
REQUIRED_COLUMNS = {
    "User_ID",
    "Product_ID",
    "Review_Text",
    "Timestamp",
    "Rating",
    "Is_Spam",
}


def entropy_from_counts(counts: np.ndarray) -> float:
    if counts.size == 0:
        return 0.0
    probs = counts / counts.sum()
    probs = probs[probs > 0]
    return float(-(probs * np.log2(probs)).sum())


def max_reviews_in_24h(timestamp_ns_sorted: np.ndarray) -> int:
    if timestamp_ns_sorted.size == 0:
        return 0
    window_ns = 24 * 60 * 60 * 1_000_000_000
    max_count = 1
    left = 0
    for right in range(timestamp_ns_sorted.size):
        while timestamp_ns_sorted[right] - timestamp_ns_sorted[left] > window_ns:
            left += 1
        current = right - left + 1
        if current > max_count:
            max_count = current
    return int(max_count)


def average_pairwise_cosine(embeddings: np.ndarray) -> float:
    n = embeddings.shape[0]
    if n < 2:
        return 0.0
    emb64 = embeddings.astype(np.float64, copy=False)
    vector_sum = emb64.sum(axis=0)
    ordered_off_diagonal_sum = float(np.dot(vector_sum, vector_sum) - n)
    return ordered_off_diagonal_sum / (n * (n - 1))


def compute_user_features(df: pd.DataFrame, embeddings: np.ndarray) -> pd.DataFrame:
    user_to_indices = df.groupby("User_ID").indices
    results: list[dict[str, float | int]] = []

    for user_id, idx in tqdm(user_to_indices.items(), desc="Computing user features", unit="user"):
        idx_array = np.asarray(idx, dtype=np.int64)
        user_rows = df.iloc[idx_array]

        timestamps = user_rows["Timestamp"].values.astype("datetime64[ns]")
        timestamps_sorted = np.sort(timestamps)
        timestamp_ns_sorted = timestamps_sorted.astype("int64")

        if timestamp_ns_sorted.size < 2:
            avg_gap_hours = 0.0
        else:
            gaps_ns = np.diff(timestamp_ns_sorted)
            avg_gap_hours = float(gaps_ns.mean() / (60 * 60 * 1_000_000_000))

        product_counts = user_rows["Product_ID"].value_counts().to_numpy(dtype=np.float64)
        product_entropy = entropy_from_counts(product_counts)

        user_embeddings = embeddings[idx_array]
        intra_user_similarity = average_pairwise_cosine(user_embeddings)

        results.append(
            {
                "User_ID": user_id,
                "Intra_User_Semantic_Similarity": intra_user_similarity,
                "Max_Reviews_in_24_Hours": max_reviews_in_24h(timestamp_ns_sorted),
                "Average_Time_Gap_Between_Reviews_Hours": avg_gap_hours,
                "Entropy_of_Product_IDs_Reviewed": product_entropy,
            }
        )

    return pd.DataFrame(results).sort_values("User_ID").reset_index(drop=True)


def main() -> None:
    if not INPUT_CSV.exists():
        raise FileNotFoundError(f"Input file not found: {INPUT_CSV}")

    df = pd.read_csv(INPUT_CSV)
    missing = REQUIRED_COLUMNS.difference(df.columns)
    if missing:
        raise ValueError(f"Input CSV is missing required columns: {sorted(missing)}")

    df["Timestamp"] = pd.to_datetime(df["Timestamp"], errors="raise")
    df["Review_Text"] = df["Review_Text"].astype(str)

    try:
        from sentence_transformers import SentenceTransformer
    except ImportError as exc:
        raise ImportError(
            "sentence-transformers is required. Install with: pip install sentence-transformers"
        ) from exc

    try:
        model = SentenceTransformer("all-MiniLM-L6-v2")
    except OSError as exc:
        raise RuntimeError(
            "Failed to load model 'all-MiniLM-L6-v2'. Check internet access or local model cache."
        ) from exc

    embeddings = model.encode(
        df["Review_Text"].tolist(),
        batch_size=64,
        show_progress_bar=True,
        convert_to_numpy=True,
        normalize_embeddings=True,
    )
    if not np.isfinite(embeddings).all():
        raise ValueError("Non-finite values found in generated embeddings.")

    user_features = compute_user_features(df, embeddings)
    user_features.to_csv(OUTPUT_CSV, index=False)
    print(f"Saved user-level features to: {OUTPUT_CSV}")


if __name__ == "__main__":
    main()
