from __future__ import annotations

import time
import joblib
import pandas as pd
import streamlit as st

# Core Inference Pipeline
from src.config import MODEL_PATH, SCALER_PATH
from src.inference import get_threat_features

st.set_page_config(page_title="Brand Intelligence | Trust & Safety", layout="wide", initial_sidebar_state="expanded")

# --- Enterprise SaaS Sidebar ---
st.sidebar.title("BrandShield AI")
st.sidebar.caption("Enterprise E-Commerce Review Intelligence")
st.sidebar.divider()
active_brand = st.sidebar.selectbox("Active Workspace", ["Nexus Electronics (D2C)", "Lumina Skincare", "Velocity Athletics"])
st.sidebar.radio("Navigation", ["Global Threat Dashboard", "SKU Monitoring", "Competitor Sabotage", "Platform APIs"])
st.sidebar.divider()
st.sidebar.success("Status: Multi-Channel Monitoring Active")

# --- Main Dashboard Header ---
st.title(f"{active_brand}: Threat Intelligence")
st.markdown("Detect and neutralize review bombing, bot networks, and coordinated sabotage across your sales channels.")

# --- High-Level Brand KPIs ---
col1, col2, col3, col4 = st.columns(4)
col1.metric("Monitored SKUs", "1,240", "+12 new variants")
col2.metric("Reviews Scanned (24h)", "8,405", "Across 4 Platforms")
col3.metric("Active Anomalies", "3", "-1 resolved")
col4.metric("Estimated Revenue Saved", "$14,200", "Based on conversion protection")

st.divider()

# --- Active Threat Feed (SaaS Context) ---
st.subheader("Active Review Bombing Alerts")
st.markdown("The system has flagged anomalous temporal bursts and semantic similarity patterns on the following SKUs.")

threat_feed = pd.DataFrame({
    "Platform": ["Amazon", "Shopify", "Walmart", "Amazon"],
    "SKU / ASIN": ["NEX-PRO-MAX (B08FX)", "NEX-LITE-W", "NEX-CHARGER", "NEX-PRO-MAX (B08FX)"],
    "Anomaly Type": ["Temporal Burst (72h)", "Semantic Duplication", "Rating Velocity Spike", "Bot Network Suspected"],
    "Associated Graph Node ID": [104, 342, 15, 89] # These map to your ML target_ids
})
st.dataframe(threat_feed, use_container_width=True, hide_index=True)

st.divider()

# --- Deep Investigation Engine (Your ML Hook) ---
st.subheader("Deep Investigation Engine")
st.markdown("Run a full bipartite graph and semantic extraction on a flagged threat node.")

# We use the Graph Node IDs from the table above to feed your actual ML pipeline
target_input = st.selectbox(
    "Select Threat Node to Investigate:", 
    options=[104, 342, 15, 89], 
    format_func=lambda x: f"Graph Node ID: {x} (Flagged Anomaly)"
)

analyze = st.button("Execute Threat Inference Pipeline", type="primary")

if analyze:
    with st.spinner(f"Extracting sub-graph features for Node {target_input}..."):
        time.sleep(1.5)

    try:
        scaler = joblib.load(SCALER_PATH)
        model = joblib.load(MODEL_PATH)
    except Exception as exc:
        st.error(f"Failed to load engine artifacts: {exc}")
        st.stop()

    try:
        # ML Inference Execution
        live_features = get_threat_features(target_input)
        transformed_features = scaler.transform(live_features)
        threat_probability = float(model.predict_proba(transformed_features)[0, 1])
    except Exception as exc:
        st.error(f"Inference failed. Ensure feature extraction pipeline has run for this Node: {exc}")
        st.stop()

    # --- Actionable SaaS Output ---
    st.subheader("Investigation Results")
    
    score_col, action_col = st.columns([2, 1])
    
    with score_col:
        st.progress(int(round(threat_probability * 100)))
        if threat_probability > 0.6:
            st.error(f"**Critical Threat Level:** {threat_probability:.1%} probability of coordinated attack.")
            st.markdown("""
            **Technical Signature Details:**
            * High Intra-User Semantic Similarity detected.
            * Degree Centrality anomaly in the User-Product bipartite graph.
            * Action Required: Export payload for platform dispute.
            """)
        elif threat_probability > 0.3:
            st.warning(f"**Moderate Threat Level:** {threat_probability:.1%} probability of fake review.")
        else:
            st.success(f"**Verified Organic:** {threat_probability:.1%} spam probability. Normal organic velocity.")

    with action_col:
        if threat_probability > 0.5:
            st.button("📥 Export Amazon Seller Dispute CSV", use_container_width=True)
            st.button("🛡️ Auto-Flag via Platform API", type="primary", use_container_width=True)
        else:
            st.button("Mark as False Positive", use_container_width=True)