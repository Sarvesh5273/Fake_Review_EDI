from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import logging
import os
import subprocess
import json

from src.config import MODEL_PATH, SCALER_PATH
from src.inference import get_threat_features

app = FastAPI(title="BrandShield AI API")

# Dynamically handle CORS. Defaulting to '*' to unblock your deployment.
# For production, set the ALLOWED_ORIGINS env var in Railway to your Vercel domain.
allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
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
        live_features = get_threat_features(request.node_id)
        transformed_features = scaler.transform(live_features)
        threat_probability = float(model.predict_proba(transformed_features)[0, 1])
        
        return {
            "node_id": request.node_id,
            "threat_probability": threat_probability,
            "status": "Critical Threat" if threat_probability > 0.6 else "Moderate" if threat_probability > 0.3 else "Verified Organic"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# NEW ENDPOINT: Shifted from Next.js to FastAPI
class QuickCheckRequest(BaseModel):
    reviews: list

@app.post("/quick-check")
async def run_quick_check(request: QuickCheckRequest):
    try:
        payload = json.dumps({"reviews": request.reviews})
        # Railway has the Python environment to execute this safely
        python_script = "src/quick_check_inference.py"
        
        result = subprocess.run(
            ["python3", python_script],
            input=payload,
            text=True,
            capture_output=True,
            check=True
        )
        return json.loads(result.stdout)
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Inference script failed: {e.stderr}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))