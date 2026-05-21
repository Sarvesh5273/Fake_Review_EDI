from __future__ import annotations

import networkx as nx
import numpy as np
import pandas as pd
from tqdm.auto import tqdm

# Import dynamic paths from config
from src.config import SYNTHETIC_REVIEWS_PATH, USER_FEATURES_PATH, FINAL_FEATURES_PATH

REVIEWS_CSV = SYNTHETIC_REVIEWS_PATH
USER_FEATURES_CSV = USER_FEATURES_PATH
OUTPUT_CSV = FINAL_FEATURES_PATH
BURST_WINDOW_DAYS = 7


def validate_columns(df: pd.DataFrame, required: set[str], name: str) -> None:
    missing = required.difference(df.columns)
    if missing:
        raise ValueError(f"{name} is missing required columns: {sorted(missing)}")


def compute_burst_review_weights(reviews: pd.DataFrame, window_days: int) -> pd.DataFrame:
    reviews = reviews.sort_values("Timestamp").reset_index(drop=True).copy()
    reviews["Burst_Review_Weight"] = 1.0
    window_ns = int(pd.Timedelta(days=window_days).value)

    for _, product_group in tqdm(
        reviews.groupby("Product_ID", sort=False),
        desc="Computing burst weights",
        unit="product",
    ):
        idx = product_group.index.to_numpy(dtype=np.int64)
        times = product_group["Timestamp"].astype("int64").to_numpy()
        n = len(times)
        if n == 0:
            continue

        burst_scores = np.ones(n, dtype=np.float64)
        left = 0
        right = 0

        for i in range(n):
            if right < i:
                right = i
            while times[i] - times[left] > window_ns:
                left += 1
            while right + 1 < n and times[right + 1] - times[i] <= window_ns:
                right += 1
            burst_scores[i] = float(right - left + 1)

        reviews.loc[idx, "Burst_Review_Weight"] = burst_scores

    return reviews


def build_temporal_bipartite_graph(edge_df: pd.DataFrame) -> nx.Graph:
    graph = nx.Graph()

    user_ids = edge_df["User_ID"].drop_duplicates().astype(int).tolist()
    product_ids = edge_df["Product_ID"].drop_duplicates().astype(int).tolist()

    graph.add_nodes_from((f"user_{u}", {"node_type": "user", "bipartite": 0}) for u in user_ids)
    graph.add_nodes_from((f"product_{p}", {"node_type": "product", "bipartite": 1}) for p in product_ids)

    for row in tqdm(edge_df.itertuples(index=False), total=len(edge_df), desc="Adding edges", unit="edge"):
        graph.add_edge(
            f"user_{int(row.User_ID)}",
            f"product_{int(row.Product_ID)}",
            weight=float(row.Burst_Weight),
        )

    return graph


def main() -> None:
    if not REVIEWS_CSV.exists():
        raise FileNotFoundError(f"Input review file not found: {REVIEWS_CSV}")
    if not USER_FEATURES_CSV.exists():
        raise FileNotFoundError(f"Input user feature file not found: {USER_FEATURES_CSV}")

    reviews = pd.read_csv(REVIEWS_CSV)
    user_features = pd.read_csv(USER_FEATURES_CSV)

    validate_columns(reviews, {"User_ID", "Product_ID", "Timestamp"}, "synthetic_reviews.csv")
    validate_columns(user_features, {"User_ID"}, "user_features.csv")

    reviews["Timestamp"] = pd.to_datetime(reviews["Timestamp"], errors="raise")
    reviews["User_ID"] = pd.to_numeric(reviews["User_ID"], errors="raise").astype(int)
    reviews["Product_ID"] = pd.to_numeric(reviews["Product_ID"], errors="raise").astype(int)
    user_features["User_ID"] = pd.to_numeric(user_features["User_ID"], errors="raise").astype(int)

    if reviews.empty:
        raise ValueError("synthetic_reviews.csv has no rows.")

    reviews = compute_burst_review_weights(reviews, BURST_WINDOW_DAYS)

    # Aggregate per user-product edge. Sum emphasizes repeated, dense bursts.
    edge_weights = (
        reviews.groupby(["User_ID", "Product_ID"], as_index=False)["Burst_Review_Weight"]
        .sum()
        .rename(columns={"Burst_Review_Weight": "Burst_Weight"})
    )

    graph = build_temporal_bipartite_graph(edge_weights)
    degree_centrality = nx.degree_centrality(graph)
    pagerank_scores = nx.pagerank(graph, weight="weight")

    user_graph_features = pd.DataFrame(
        {
            "User_ID": sorted(reviews["User_ID"].unique().tolist()),
        }
    )
    user_graph_features["Degree_Centrality"] = user_graph_features["User_ID"].map(
        lambda uid: float(degree_centrality.get(f"user_{int(uid)}", 0.0))
    )
    user_graph_features["PageRank_Score"] = user_graph_features["User_ID"].map(
        lambda uid: float(pagerank_scores.get(f"user_{int(uid)}", 0.0))
    )

    final_features = user_features.merge(user_graph_features, on="User_ID", how="left")
    final_features["Degree_Centrality"] = final_features["Degree_Centrality"].fillna(0.0)
    final_features["PageRank_Score"] = final_features["PageRank_Score"].fillna(0.0)

    final_features.to_csv(OUTPUT_CSV, index=False)
    print(f"Saved final combined features to: {OUTPUT_CSV}")


if __name__ == "__main__":
    main()