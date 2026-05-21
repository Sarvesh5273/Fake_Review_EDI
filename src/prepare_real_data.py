from __future__ import annotations

import re
import numpy as np
import openpyxl  # noqa: F401
import pandas as pd

# Import dynamic paths from config
from src.config import RAW_DATA_DIR, SYNTHETIC_REVIEWS_PATH

METADATA_XLSX = RAW_DATA_DIR / "Yelp Metadata.xlsx"
DATASET_XLSX = RAW_DATA_DIR / "Yelp dataset.xlsx"
OUTPUT_CSV = SYNTHETIC_REVIEWS_PATH
SAMPLE_SIZE = 15_000
RANDOM_STATE = 42


def _normalize_col_name(name: str) -> str:
    return re.sub(r"[^a-z0-9]", "", name.strip().lower())


def _resolve_columns(df: pd.DataFrame, required: list[str], df_name: str) -> dict[str, str]:
    normalized_to_actual = {_normalize_col_name(col): col for col in df.columns}
    resolved: dict[str, str] = {}
    missing: list[str] = []

    for col in required:
        key = _normalize_col_name(col)
        actual = normalized_to_actual.get(key)
        if actual is None:
            missing.append(col)
        else:
            resolved[col] = actual

    if missing:
        raise ValueError(f"{df_name} missing expected columns: {missing}")
    return resolved


def stratified_sample_exact(
    df: pd.DataFrame, label_col: str, n_samples: int, random_state: int = 42
) -> pd.DataFrame:
    if n_samples > len(df):
        raise ValueError(
            f"Requested sample size {n_samples} exceeds available rows {len(df)}."
        )

    counts = df[label_col].value_counts(dropna=False)
    if counts.empty:
        raise ValueError("No rows available for stratified sampling.")

    expected = counts / counts.sum() * n_samples
    per_class = np.floor(expected).astype(int)
    remainder = n_samples - int(per_class.sum())

    if remainder > 0:
        fractional = (expected - per_class).sort_values(ascending=False)
        for cls in fractional.index:
            if remainder == 0:
                break
            if per_class.loc[cls] < counts.loc[cls]:
                per_class.loc[cls] += 1
                remainder -= 1

    sampled_parts: list[pd.DataFrame] = []
    for i, (cls, group) in enumerate(df.groupby(label_col, dropna=False)):
        take = int(per_class.get(cls, 0))
        if take > len(group):
            take = len(group)
        if take > 0:
            sampled_parts.append(group.sample(n=take, random_state=random_state + i))

    sampled = pd.concat(sampled_parts, axis=0)

    if len(sampled) < n_samples:
        deficit = n_samples - len(sampled)
        remaining = df.drop(index=sampled.index)
        sampled = pd.concat(
            [sampled, remaining.sample(n=deficit, random_state=random_state + 1000)],
            axis=0,
        )

    sampled = sampled.sample(frac=1.0, random_state=random_state).reset_index(drop=True)
    return sampled


def main() -> None:
    if not METADATA_XLSX.exists():
        raise FileNotFoundError(f"Missing file: {METADATA_XLSX}. Place it in data/raw/.")
    if not DATASET_XLSX.exists():
        raise FileNotFoundError(f"Missing file: {DATASET_XLSX}. Place it in data/raw/.")

    metadata = pd.read_excel(METADATA_XLSX, engine="openpyxl")
    reviews = pd.read_excel(DATASET_XLSX, engine="openpyxl")

    meta_cols = _resolve_columns(
        metadata,
        ["Review_id", "Product_id", "Rating", "Label", "Review_Date"],
        "Yelp Metadata.xlsx",
    )
    review_cols = _resolve_columns(
        reviews,
        ["Review_id", "Product_id", "Review_Date", "Review_Text"],
        "Yelp dataset.xlsx",
    )

    metadata = metadata.rename(
        columns={
            meta_cols["Review_id"]: "Review_id",
            meta_cols["Product_id"]: "Product_id",
            meta_cols["Rating"]: "Rating",
            meta_cols["Label"]: "Label",
            meta_cols["Review_Date"]: "Review_Date",
        }
    )[["Review_id", "Product_id", "Review_Date", "Rating", "Label"]]

    reviews = reviews.rename(
        columns={
            review_cols["Review_id"]: "Review_id",
            review_cols["Product_id"]: "Product_id",
            review_cols["Review_Date"]: "Review_Date",
            review_cols["Review_Text"]: "Review_Text",
        }
    )[["Review_id", "Product_id", "Review_Date", "Review_Text"]]

    metadata["Review_Date"] = pd.to_datetime(metadata["Review_Date"], errors="coerce")
    reviews["Review_Date"] = pd.to_datetime(reviews["Review_Date"], errors="coerce")

    metadata = metadata.dropna(subset=["Review_id", "Product_id", "Review_Date", "Label", "Rating"])
    reviews = reviews.dropna(subset=["Review_id", "Product_id", "Review_Date", "Review_Text"])

    merged = pd.merge(
        reviews,
        metadata,
        on=["Review_id", "Product_id", "Review_Date"],
        how="inner",
    )
    if merged.empty:
        raise ValueError(
            "No rows after merge. Check key consistency for Review_id/Product_id/Review_Date."
        )

    merged["Label"] = pd.to_numeric(merged["Label"], errors="coerce")
    merged["Is_Spam"] = merged["Label"].map({-1: True, 1: False})
    invalid_labels = merged.loc[merged["Is_Spam"].isna(), "Label"].dropna().unique()
    if len(invalid_labels) > 0:
        raise ValueError(
            f"Unexpected Label values found (expected -1 or 1): {sorted(invalid_labels.tolist())}"
        )
    merged = merged.dropna(subset=["Is_Spam"])

    final_df = merged.rename(
        columns={
            "Review_id": "User_ID",
            "Product_id": "Product_ID",
            "Review_Date": "Timestamp",
        }
    )
    final_df["Timestamp"] = pd.to_datetime(final_df["Timestamp"], errors="coerce")
    final_df = final_df.dropna(subset=["Timestamp", "Review_Text"])
    final_df = final_df[final_df["Review_Text"].astype(str).str.strip().ne("")]

    final_df = final_df[["User_ID", "Product_ID", "Review_Text", "Timestamp", "Rating", "Is_Spam"]]

    sampled_df = stratified_sample_exact(
        final_df, label_col="Is_Spam", n_samples=SAMPLE_SIZE, random_state=RANDOM_STATE
    )

    sampled_df.to_csv(OUTPUT_CSV, index=False)
    spam_ratio = sampled_df["Is_Spam"].mean()
    print(f"Saved {len(sampled_df)} rows to: {OUTPUT_CSV}")
    print(f"Is_Spam ratio: {spam_ratio:.4f} ({spam_ratio * 100:.2f}%)")


if __name__ == "__main__":
    main()