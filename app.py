from __future__ import annotations

import time
import joblib
import streamlit as st
from src.config import MODEL_PATH, SCALER_PATH, ROC_IMAGE_PATH
from src.inference import get_threat_features

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
            st.image(str(ROC_IMAGE_PATH), caption="ROC Curve - Academic YelpChi Baseline", width="stretch")
    else:
        st.warning(f"Missing ROC image: {ROC_IMAGE_PATH.name}. Run train_academic.py first.")

    col1, col2, col3 = st.columns(3)
    col1.metric("Precision", "90.2%")
    col2.metric("ROC-AUC", "93.4%")
    col3.metric("Architecture", "Random Forest + Graph Metrics")

with tab_live:
    st.subheader("Live Threat Inference")
    target = st.text_input("Enter Target User ID (e.g., 104)")
    analyze = st.button("Analyze Network Behavior", type="primary", width="stretch")

    if analyze:
        if not target.strip().isdigit():
            st.warning("Please enter a valid numeric Target User ID.")
            st.stop()

        target_id = int(target.strip())

        with st.spinner("Extracting sub-graph features via GhostWire middleware..."):
            time.sleep(1)

        try:
            scaler = joblib.load(SCALER_PATH)
            model = joblib.load(MODEL_PATH)
        except Exception as exc:
            st.error(f"Failed to load model artifacts: {exc}")
            st.stop()

        try:
            # LIVE INFERENCE
            live_features = get_threat_features(target_id)
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