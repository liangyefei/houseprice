# Housing Price Prediction API

FastAPI + scikit-learn regression service for housing price prediction.

## Features

- `POST /predict`: Single and batch predictions
- `GET /model-info`: Model coefficients + performance metrics
- `GET /health`: Service health check
- `GET /validate`: Runs prediction on validation CSV (`data/Test Data For Prediction.csv`)
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
    House Price Dataset.csv
    Test Data For Prediction.csv
  models/
    model.joblib       # generated on first startup
    model_meta.json    # generated on first startup
  Dockerfile
  requirements.txt
```

## Dataset

By default, the app looks for `data/House Price Dataset.csv` with:

- target column: `price` (configurable via `TARGET_COLUMN`)
- numeric feature columns (all numeric columns except the target)
- optional dropped columns (default drops `id` via `DROP_COLUMNS`)

Environment variables:

- `DATASET_PATH` (default: `data/House Price Dataset.csv`)
- `VALIDATION_PATH` (default: `data/Test Data For Prediction.csv`)
- `TARGET_COLUMN` (default: `price`)
- `DROP_COLUMNS` (default: `id`)
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
    "square_footage": 1550,
    "bedrooms": 3,
    "bathrooms": 2,
    "year_built": 1997,
    "lot_size": 6800,
    "distance_to_city_center": 4.1,
    "school_rating": 7.6
  }
}
```

Batch prediction:

```json
{
  "instances": [
    {
      "square_footage": 1550,
      "bedrooms": 3,
      "bathrooms": 2,
      "year_built": 1997,
      "lot_size": 6800,
      "distance_to_city_center": 4.1,
      "school_rating": 7.6
    },
    {
      "square_footage": 2200,
      "bedrooms": 4,
      "bathrooms": 2.5,
      "year_built": 2008,
      "lot_size": 9600,
      "distance_to_city_center": 7,
      "school_rating": 8.8
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
  -e DATASET_PATH=/app/data/House\ Price\ Dataset.csv \
  -e VALIDATION_PATH=/app/data/Test\ Data\ For\ Prediction.csv \
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
6. Call `GET /validate` to run validation on `Test Data For Prediction.csv`
