# HousePrice — ML Model + Unified Next.js Portal

This repository contains two tasks that work together:

- **Task 1 — Housing Price Prediction API** (`app/`): a FastAPI + scikit-learn regression service.
- **Task 2 — Unified Next.js Portal** (`portal/`): a single App Router portal hosting two applications,
  each backed by a different technology and both able to use the Task 1 model:
  - **App 1 — Property Value Estimator** (Python/FastAPI backend, proxied via Next.js route handler)
  - **App 2 — Property Market Analysis** (Java/Spring Boot backend in `java-backend/`)

## Architecture at a glance

```text
Browser ── Next.js Portal (App Router, RSC + client components)
              │
              ├── /api/property/predict ──► Python FastAPI  (PYTHON_API_URL, default :8000)
              │                                  └── scikit-learn LinearRegression
              │
              └── /api/market/* ──────────► Java Spring Boot (JAVA_API_URL, default :8080)
                                                 └── aggregate stats + caching
                                                 └── what-if calls Python model
```

Every portal route handler has a **local fallback** using the checked-in model metadata
(`models/model_meta.json`) and dataset (`data/House Price Dataset.csv`), so the UI works even
when one or both backends are offline.

## Run everything (interview demo order)

```bash
# 1) Python model service (Task 1)
python -m venv .venv
.venv\Scripts\Activate.ps1            # Windows PowerShell
pip install -r requirements.txt
uvicorn app.main:app --reload          # http://localhost:8000

# 2) Java market backend (Task 2 - App 2)
cd java-backend
mvn spring-boot:run                    # http://localhost:8080

# 3) Next.js portal (Task 2)
cd portal
npm install
copy .env.example .env.local           # optional: point at the backends
npm run dev                            # http://localhost:3000
```

Then open `http://localhost:3000` and navigate between the two applications.

## One-click startup on Windows

From the repository root you can launch all three development services with:

```powershell
.\start-dev.ps1
```

Or double-click / run:

```bat
start-dev.cmd
```

The script opens separate PowerShell windows for the Python API, Java backend, and Next.js portal. It also:

- reuses `.venv\Scripts\python.exe` for FastAPI,
- sets `PYTHON_API_URL=http://127.0.0.1:8000` and `JAVA_API_URL=http://127.0.0.1:8080` for the portal,
- prefers Maven `3.6.3+` and JDK `25+` for the Java backend.

Use a dry run to verify the detected toolchain without launching windows:

```powershell
.\start-dev.ps1 -DryRun
```

To stop the three services started by the launcher:

```powershell
.\stop-dev.ps1
```

Or:

```bat
stop-dev.cmd
```

The stop script reads the recorded PowerShell window PIDs from `.houseprice-dev-processes.json` and shuts down each service process tree. You can preview what it would stop with:

```powershell
.\stop-dev.ps1 -DryRun
```

---

# Task 1 — Housing Price Prediction API

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
