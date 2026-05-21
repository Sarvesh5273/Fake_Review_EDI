from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import logging

from src.config import MODEL_PATH, SCALER_PATH
from src.inference import get_threat_features

app = FastAPI(title="BrandShield AI API")

# Allow the Next.js frontend to communicate with this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load artifacts on startup
try:
    scaler = joblib.load(SCALER_PATH)
    model = joblib.load(MODEL_PATH)
except Exception as e:
    logging.warning(f"ML artifacts not found. Make sure you have trained the model: {e}")
    scaler, model = None, None

class ThreatRequest(BaseModel):
    node_id: int

@app.post("/analyze")
async def analyze_threat(request: ThreatRequest):
    if not model or not scaler:
        raise HTTPException(status_code=500, detail="ML model is not loaded on the server.")
        
    try:
        # Extract features for the requested Node ID
        live_features = get_threat_features(request.node_id)
        transformed_features = scaler.transform(live_features)
        
        # Calculate Bipartite Graph Threat Probability
        threat_probability = float(model.predict_proba(transformed_features)[0, 1])
        
        return {
            "node_id": request.node_id,
            "threat_probability": threat_probability,
            "status": "Critical Threat" if threat_probability > 0.6 else "Moderate" if threat_probability > 0.3 else "Verified Organic"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))