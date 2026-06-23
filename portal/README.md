# HousePrice Portal

This folder contains the Task 2 Next.js portal.

## What it includes

- Shared App Router navigation and layout
- Property Value Estimator with validation, history, comparison, and model-backed prediction
- Property Market Analysis dashboard with filters, what-if analysis, exports, and table views
- Route handlers that proxy to Python and Java backend URLs when available, with local fallback behavior using the checked-in model and dataset

## Expected runtime services

- Python model service: `http://127.0.0.1:8000`
- Java market API: `http://127.0.0.1:8080`

Optional overrides:

- `PYTHON_API_URL`
- `JAVA_API_URL`

## Start locally

From the `portal` folder:

```bash
npm install
npm run dev
```

The portal uses the shared house dataset from `../data/House Price Dataset.csv` and the model metadata from `../models/model_meta.json` when the backend services are unavailable.