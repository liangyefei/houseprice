# Housing Price Prediction API

FastAPI + scikit-learn regression service for housing price prediction.

## Features

- `POST /predict`: Single and batch predictions
- `GET /model-info`: Model coefficients + performance metrics
- `GET /health`: Service health check
- OpenAPI/Swagger UI: `/docs`

## Tech Stack

- Python 3.12+
- FastAPI
- scikit-learn

## Project Structure

```text
houseprice/
  app/
    main.py
    model_service.py
    schemas.py
  data/
    housing.csv        # optional dataset (if absent, synthetic data is used)
  models/
    model.joblib       # generated on first startup
    model_meta.json    # generated on first startup
  Dockerfile
  requirements.txt
```

## Dataset

By default, the app looks for `data/housing.csv` with:

- target column: `price` (configurable via `TARGET_COLUMN`)
- numeric feature columns (all numeric columns except the target)

Environment variables:

- `DATASET_PATH` (default: `data/housing.csv`)
- `TARGET_COLUMN` (default: `price`)
- `MODEL_PATH` (default: `models/model.joblib`)
- `MODEL_META_PATH` (default: `models/model_meta.json`)

## Run Locally

```bash
python -m venv .venv
# Windows PowerShell
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Open:

- Swagger: `http://localhost:8000/docs`
- Health: `http://localhost:8000/health`

## Example Requests

Single prediction:

```json
{
  "features": {
    "feature_1": 0.12,
    "feature_2": -1.04,
    "feature_3": 0.53,
    "feature_4": 0.31,
    "feature_5": -0.10,
    "feature_6": 1.44,
    "feature_7": -0.52,
    "feature_8": 0.22
  }
}
```

Batch prediction:

```json
{
  "instances": [
    {
      "feature_1": 0.12,
      "feature_2": -1.04,
      "feature_3": 0.53,
      "feature_4": 0.31,
      "feature_5": -0.10,
      "feature_6": 1.44,
      "feature_7": -0.52,
      "feature_8": 0.22
    },
    {
      "feature_1": -0.55,
      "feature_2": 0.85,
      "feature_3": -1.10,
      "feature_4": 0.71,
      "feature_5": 0.03,
      "feature_6": 0.62,
      "feature_7": -0.27,
      "feature_8": 1.92
    }
  ]
}
```

## Docker

Build image:

```bash
docker build -t houseprice-api:latest .
```

Run container:

```bash
docker run --rm -p 8000:8000 houseprice-api:latest
```

If you want to use your real dataset at runtime:

```bash
docker run --rm -p 8000:8000 \
  -e DATASET_PATH=/app/data/housing.csv \
  -e TARGET_COLUMN=price \
  -v "${PWD}/data:/app/data" \
  houseprice-api:latest
```

## Interview Demo Flow

1. Start container: `docker run --rm -p 8000:8000 houseprice-api:latest`
2. Open Swagger at `http://localhost:8000/docs`
3. Call `GET /health`
4. Call `GET /model-info`
5. Call `POST /predict` with single and batch payloads
