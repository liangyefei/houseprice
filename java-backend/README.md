# Market Backend

Spring Boot backend for the Task 2 Property Market Analysis app.

## Endpoints

- `GET /api/market/summary`
- `POST /api/market/what-if`
- `GET /health`

## Configuration

- `app.dataset-path` defaults to `../data/House Price Dataset.csv`
- `app.python-api-url` defaults to `http://127.0.0.1:8000`

## Run

From the `java-backend` folder:

```bash
mvn spring-boot:run
```