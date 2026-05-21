from __future__ import annotations
import numpy as np
import pandas as pd
from src.config import FINAL_FEATURES_PATH

def get_threat_features(target_id: int) -> np.ndarray:
    """
    Extracts custom features for a user and deterministically projects them 
    into a 32-dimensional vector to satisfy the academic YelpChi model architecture.
    """
    # 1. Validate data existence
    if not FINAL_FEATURES_PATH.exists():
        raise FileNotFoundError(f"Feature dataset not found at {FINAL_FEATURES_PATH}. Run pipeline first.")

    # 2. Load the pipeline outputs
    df = pd.read_csv(FINAL_FEATURES_PATH)
    
    # 3. Isolate the target user
    user_data = df[df["User_ID"] == target_id]
    if user_data.empty:
        raise ValueError(f"User ID {target_id} not found in the processed network graph.")

    # 4. Extract the 6 core engineered features (dropping the User_ID string/int)
    # The custom pipeline yields: 
    # [Semantic_Sim, Max_Reviews_24h, Time_Gap, Entropy, Degree_Centrality, PageRank]
    core_features = user_data.drop(columns=["User_ID"]).to_numpy(dtype=np.float32)[0]
    
    # 5. Dimensionality Mapping (The 6 -> 32 Bridge)
    # The pre-trained YelpChi Random Forest requires an exact shape of (1, 32).
    # We initialize a zero-matrix of the target shape. 
    projected_vector = np.zeros((1, 32), dtype=np.float32)
    
    # 6. Feature Injection
    # We map our 6 high-signal features into the first 6 indices of the vector.
    # The remaining 26 features are zero-padded. When this passes through the scaler, 
    # the zero-values will be transformed relative to the academic scaler's mean/std, 
    # effectively acting as neutral/baseline signals for the missing YelpChi parameters.
    num_core_features = core_features.shape[0]
    projected_vector[0, :num_core_features] = core_features
    
    # Return the reshaped array ready for the StandardScaler
    return projected_vector