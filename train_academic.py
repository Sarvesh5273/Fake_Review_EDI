from __future__ import annotations

import joblib
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
from scipy.io import loadmat
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, roc_auc_score, roc_curve
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

# Define Paths
DATA_PATH = Path("/Users/sarvesh/Desktop/Fake_Review_EDI/YelpChi.mat")
ROC_PLOT_PATH = Path("/Users/sarvesh/Desktop/Fake_Review_EDI/academic_roc_curve.png")
MODEL_PATH = Path("/Users/sarvesh/Desktop/Fake_Review_EDI/random_forest_model.pkl")
SCALER_PATH = Path("/Users/sarvesh/Desktop/Fake_Review_EDI/scaler.pkl")
RANDOM_SEED = 42

def main() -> None:
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Missing dataset file: {DATA_PATH}")

    mat = loadmat(DATA_PATH)
    if "features" not in mat or "label" not in mat:
        raise KeyError("YelpChi.mat must contain 'features' and 'label' keys.")

    features = mat["features"]
    labels = mat["label"]

    if hasattr(features, "toarray"):
        X = features.toarray()
    else:
        X = np.asarray(features)

    y = np.asarray(labels).ravel()

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=RANDOM_SEED,
        stratify=y if len(np.unique(y)) > 1 else None,
    )

    # Scale and Save the Scaler
    scaler = StandardScaler()
    X_train = scaler.fit_transform(X_train)
    X_test = scaler.transform(X_test)
    
    joblib.dump(scaler, SCALER_PATH)
    print(f"Scaler saved to: {SCALER_PATH}")

    # Train and Save the Model
    model = RandomForestClassifier(
        class_weight="balanced",
        n_estimators=100,
        random_state=RANDOM_SEED,
    )
    model.fit(X_train, y_train)
    
    joblib.dump(model, MODEL_PATH)
    print(f"Model saved to: {MODEL_PATH}")

    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]

    print("Classification Report:")
    print(classification_report(y_test, y_pred, digits=4))

    auc = roc_auc_score(y_test, y_prob)
    print(f"ROC-AUC: {auc:.4f}")

    fpr, tpr, _ = roc_curve(y_test, y_prob)
    plt.figure(figsize=(7, 5))
    plt.plot(fpr, tpr, label=f"ROC Curve (AUC = {auc:.4f})")
    plt.plot([0, 1], [0, 1], linestyle="--", color="gray")
    plt.xlabel("False Positive Rate")
    plt.ylabel("True Positive Rate")
    plt.title("ROC Curve - YelpChi Academic Dataset")
    plt.legend(loc="lower right")
    plt.tight_layout()
    plt.savefig(ROC_PLOT_PATH)
    plt.close()
    print(f"ROC curve saved to: {ROC_PLOT_PATH}")

if __name__ == "__main__":
    main()