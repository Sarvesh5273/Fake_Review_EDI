# VertexShield

VertexShield is a review-authenticity and brand-protection platform for SaaS teams and consumers. It combines a model-backed quick check, a dashboard for marketplace monitoring, and a browser extension for page-level review capture.

## What’s included

- **Landing site** for product positioning and navigation
- **Dashboard** for marketplace monitoring, alerts, reports, and settings
- **Quick Check** for pasted reviews and CSV uploads
- **Playwright-backed page scraper** for demo-friendly consumer scanning
- **Chrome/Edge extension** for scanning the current product page
- **Python ML pipeline** for feature extraction and model inference

## Project structure

- `frontend/` — Next.js app, dashboard, quick check, and API routes
- `extension/` — Manifest V3 browser extension scaffold
- `src/` — Python feature engineering, training, and inference scripts
- `models/` — Saved model artifacts
- `data/` — Raw and processed datasets
- `app.py` / `api.py` — Python demo apps for Streamlit and FastAPI

## Requirements

- Node.js 18+
- Python 3.10+

## Python setup

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Frontend setup

```bash
cd frontend
npm install
```

## Run the app

### Next.js web app

```bash
cd frontend
npm run dev
```

### FastAPI model API

```bash
uvicorn api:app --reload
```

### Streamlit demo

```bash
streamlit run app.py
```

## Consumer quick check

1. Open the **Quick Check** page in the web app.
2. Paste reviews or upload a CSV.
3. Submit to get a model-backed AI risk score and authenticity score.

## Browser extension

The extension lives in `extension/` and is designed for Chrome and Edge.

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `extension/` folder
5. Open a product/reviews page
6. Click the VertexShield extension icon
7. Choose **Scan current page**

## Notes

- The current consumer flow uses a **Playwright-backed scraper** for demo use.
- The ML pipeline is trained on the dataset stored in `data/`.
- For production use, you would typically replace scraping with approved marketplace integrations or a licensed provider.
