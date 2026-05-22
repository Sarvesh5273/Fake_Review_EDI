from pathlib import Path

# This dynamically finds the root 'Fake_Review_EDI' directory 
# by going one level up from the 'src' folder where this file lives.
BASE_DIR = Path(__file__).resolve().parent.parent

# Core Directories
DATA_DIR = BASE_DIR / "data"
RAW_DATA_DIR = DATA_DIR / "raw"
PROCESSED_DATA_DIR = DATA_DIR / "processed"
MODELS_DIR = BASE_DIR / "models"
ASSETS_DIR = BASE_DIR / "assets"

# Specific File Paths
SYNTHETIC_REVIEWS_PATH = PROCESSED_DATA_DIR / "synthetic_reviews.csv"
USER_FEATURES_PATH = PROCESSED_DATA_DIR / "user_features.csv"
FINAL_FEATURES_PATH = PROCESSED_DATA_DIR / "final_features.csv"

MODEL_PATH = MODELS_DIR / "random_forest_model.pkl"
SCALER_PATH = MODELS_DIR / "scaler.pkl"
CUSTOM_MODEL_PATH = MODELS_DIR / "custom_rf_model.pkl"
CUSTOM_SCALER_PATH = MODELS_DIR / "custom_scaler.pkl"
ROC_IMAGE_PATH = ASSETS_DIR / "academic_roc_curve.png"

# Hyperparameters
RANDOM_SEED = 42