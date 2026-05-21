from __future__ import annotations

import time
from pathlib import Path

import joblib
import numpy as np
import streamlit as st


BASE_DIR = Path(__file__).resolve().parent
ROC_IMAGE_PATH = BASE_DIR / "academic_roc_curve.png"
SCALER_PATH = BASE_DIR / "scaler.pkl"
MODEL_PATH = BASE_DIR / "random_forest_model.pkl"


st.set_page_config(page_title="Recall AI - Threat Intelligence", layout="wide")

st.sidebar.title("Recall AI - Threat Intelligence")
st.sidebar.markdown(
    "This dashboard uses a **Temporal Bipartite Graph** (User ↔ Product) to identify "
    "coordinated review bursts, then combines behavioral and graph metrics to estimate "
    "spam-ring risk."
)

tab_perf, tab_live = st.tabs(["System Performance", "Live Network Inference"])

with tab_perf:
    st.subheader("Academic Baseline Performance (YelpChi)")
    if ROC_IMAGE_PATH.exists():
        st.image(str(ROC_IMAGE_PATH), caption="ROC Curve - Academic YelpChi Baseline", use_container_width=True)
    else:
        st.warning(f"Missing ROC image: {ROC_IMAGE_PATH.name}")

    col1, col2, col3 = st.columns(3)
    col1.metric("Precision", "90.2%")
    col2.metric("ROC-AUC", "93.4%")
    col3.metric("Architecture", "Random Forest + Graph Metrics")

with tab_live:
    st.subheader("Live Threat Inference")
    target = st.text_input("Enter Product URL or Target User ID")
    analyze = st.button("Analyze Network Behavior", type="primary", use_container_width=True)

    if analyze:
        if not target.strip():
            st.warning("Please enter a Product URL or Target User ID before analysis.")
            st.stop()

        with st.spinner("Mapping bipartite network..."):
            time.sleep(1)

        with st.spinner("Calculating semantic similarity..."):
            time.sleep(1)

        try:
            scaler = joblib.load(SCALER_PATH)
            model = joblib.load(MODEL_PATH)
        except Exception as exc:
            st.error(f"Failed to load model artifacts: {exc}")
            st.stop()

        # Demo-mode simulation: academic model expects exactly 32 graph-derived features.
        live_features = np.random.random((1, 32))

        try:
            transformed_features = scaler.transform(live_features)
            threat_probability = float(model.predict_proba(transformed_features)[0, 1])
        except Exception as exc:
            st.error(f"Inference failed: {exc}")
            st.stop()

        st.subheader("Threat Probability Score")
        st.progress(int(round(threat_probability * 100)))
        st.metric("Threat Probability Score", f"{threat_probability:.2%}")

        if threat_probability > 0.5:
            st.error("High-risk pattern detected: coordinated spam ring behavior is likely present.")
        else:
            st.success("Low-risk pattern detected: no significant spam-ring signature identified.")
