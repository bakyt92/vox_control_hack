
## Application reference

This repository includes the financial FastAPI app (`app/main.py`) using **MongoDB**.

### Docker (recommended)

From `sami-backend-technical-test/`:

- **Build + start API and MongoDB**: `docker compose up -d --build`
- **Follow logs**: `docker compose logs -f`
- **Stop + remove containers**: `docker compose down`

### Local setup (without Docker)

From `sami-backend-technical-test/`:

- **Create a virtual environment**: `python -m venv venv`
- **Activate it (macOS/Linux)**: `source venv/bin/activate`
- **Activate it (Windows PowerShell)**: `.\venv\Scripts\Activate.ps1`
- **Install dependencies**: `python -m pip install -r requirements.txt`

#### Environment variables

For the sake of the demo, a `.env` file is already provided in `sami-backend-technical-test/`.

If you need to recreate it, `pydantic-settings` will load a `.env` file from `sami-backend-technical-test/` with:

- `MONGODB_URI`
- `MONGODB_DB`

#### Run the API

From `sami-backend-technical-test/`:

- `python -m uvicorn app.main:app --reload --port 8000`

### Agents API

- `POST /agents`: store an arbitrary JSON object as a MongoDB document
- `GET /agents`: list agents (up to 1000)
- `GET /agents/{id}`: fetch a single agent by id (Mongo ObjectId)

### LiveKit token endpoint (for frontends)

Implements the LiveKit standardized token endpoint (used by `TokenSource.endpoint(...)`):

- `POST /livekit/token` → returns `{ "server_url": "...", "participant_token": "..." }`
