from __future__ import annotations

import ast
import joblib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, roc_auc_score, roc_curve
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

# Import dynamic paths and settings from config
from src.config import (
    FINAL_FEATURES_PATH,
    SYNTHETIC_REVIEWS_PATH,
    ASSETS_DIR,
    MODELS_DIR,
    RANDOM_SEED
)

FINAL_FEATURES_CSV = FINAL_FEATURES_PATH
REVIEWS_CSV = SYNTHETIC_REVIEWS_PATH
ROC_PLOT_PATH = ASSETS_DIR / "roc_curve_custom_rf.png"

# Added Model Persistence Paths
CUSTOM_MODEL_PATH = MODELS_DIR / "custom_rf_model.pkl"
CUSTOM_SCALER_PATH = MODELS_DIR / "custom_scaler.pkl"

LABEL_COLUMN = "Is_Spam"


def parse_array_like(value: object) -> object:
    if not isinstance(value, str):
        return value
    text = value.strip()
    if not text or text[0] not in "[(":
        return value
    try:
        parsed = ast.literal_eval(text)
    except (ValueError, SyntaxError):
        return value
    if isinstance(parsed, (list, tuple, np.ndarray)):
        return np.asarray(parsed, dtype=float)
    return value


def expand_array_columns(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    object_cols = df.select_dtypes(include=["object"]).columns.tolist()

    for col in object_cols:
        parsed = df[col].map(parse_array_like)
        has_arrays = parsed.map(lambda x: isinstance(x, np.ndarray)).any()
        if not has_arrays:
            continue

        arrays = parsed.map(lambda x: x if isinstance(x, np.ndarray) else np.array([], dtype=float))
        max_len = int(arrays.map(len).max())
        if max_len == 0:
            df = df.drop(columns=[col])
            continue

        expanded = pd.DataFrame(
            arrays.map(
                lambda arr: np.pad(
                    arr.astype(float, copy=False),
                    (0, max_len - len(arr)),
                    mode="constant",
                    constant_values=np.nan,
                )
            ).tolist(),
            index=df.index,
            columns=[f"{col}_{i}" for i in range(max_len)],
        )
        df = pd.concat([df.drop(columns=[col]), expanded], axis=1)

    return df


def load_and_prepare_data() -> tuple[np.ndarray, np.ndarray]:
    if not FINAL_FEATURES_CSV.exists():
        raise FileNotFoundError(f"Missing file: {FINAL_FEATURES_CSV}. Run pipeline first.")

    df = pd.read_csv(FINAL_FEATURES_CSV)
    df = expand_array_columns(df)

    if LABEL_COLUMN not in df.columns:
        if not REVIEWS_CSV.exists():
            raise ValueError(f"{LABEL_COLUMN} not found in final_features.csv.")
        reviews = pd.read_csv(REVIEWS_CSV)
        if LABEL_COLUMN not in reviews.columns or "User_ID" not in reviews.columns:
            raise ValueError(f"{REVIEWS_CSV} must contain User_ID and {LABEL_COLUMN}.")
        user_labels = (
            reviews.groupby("User_ID")[LABEL_COLUMN]
            .max()
            .astype(int)
            .reset_index()
        )
        df = df.merge(user_labels, on="User_ID", how="left")

    df[LABEL_COLUMN] = pd.to_numeric(df[LABEL_COLUMN], errors="coerce").fillna(0).astype(int)

    feature_cols = [c for c in df.columns if c != LABEL_COLUMN]
    if "User_ID" in feature_cols:
        feature_cols.remove("User_ID")

    X_df = df[feature_cols].apply(pd.to_numeric, errors="coerce").fillna(0)
    y = df[LABEL_COLUMN].to_numpy(dtype=np.int64)

    if X_df.empty:
        raise ValueError("No feature columns available after preprocessing.")

    return X_df.to_numpy(dtype=np.float32), y


def main() -> None:
    X, y = load_and_prepare_data()

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=RANDOM_SEED,
        stratify=y if len(np.unique(y)) > 1 else None,
    )

    scaler = StandardScaler()
    X_train = scaler.fit_transform(X_train)
    X_test = scaler.transform(X_test)

    model = RandomForestClassifier(
        n_estimators=100,
        class_weight="balanced",
        random_state=RANDOM_SEED,
    )
    model.fit(X_train, y_train)

    # Serialize and save the model artifacts for production inference
    joblib.dump(scaler, CUSTOM_SCALER_PATH)
    joblib.dump(model, CUSTOM_MODEL_PATH)
    print(f"Custom Scaler saved to: {CUSTOM_SCALER_PATH}")
    print(f"Custom Model saved to: {CUSTOM_MODEL_PATH}")

    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]

    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, digits=4))

    if len(np.unique(y_test)) > 1:
        fpr, tpr, _ = roc_curve(y_test, y_proba)
        auc = roc_auc_score(y_test, y_proba)

        plt.figure(figsize=(7, 5))
        plt.plot(fpr, tpr, label=f"ROC Curve (AUC = {auc:.4f})")
        plt.plot([0, 1], [0, 1], linestyle="--", color="gray")
        plt.xlabel("False Positive Rate")
        plt.ylabel("True Positive Rate")
        plt.title("ROC-AUC Curve (Custom Pipeline)")
        plt.legend(loc="lower right")
        plt.tight_layout()
        plt.savefig(ROC_PLOT_PATH)
        plt.close()
        print(f"ROC curve saved to: {ROC_PLOT_PATH}")
    else:
        print("ROC-AUC curve skipped (single class in y_test).")


if __name__ == "__main__":
    main()