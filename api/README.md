# Votuna API

FastAPI backend for Votuna's collaborative playlist workflows.

## Current Scope

- OAuth login/callback + session cookie auth
- Provider playlist listing and creation APIs
- Votuna playlist enablement and settings
- Suggestions and voting with collaborator/member support
- Playlist management transfer endpoints (import/export with preview and execute)

Runtime provider client support currently includes **Spotify** and **SoundCloud** (`get_music_provider`), while API schemas also include additional provider enums for forward compatibility.

## Playlist Management (Implemented)

Owner-only transfer workflows are available under `/api/v1/votuna/playlists/{playlist_id}/management/*`:

- `POST /source-tracks`
  - Browse source tracks for song-level selection
  - Search by title/artist/genre
  - Offset/limit pagination
- `POST /preview`
  - Non-mutating transfer preview
  - Supports `all`, `genre`, `artist`, `songs` filters
  - Reports matched/to-add/duplicate counts
  - Enforces max 500 tracks per action
- `POST /execute`
  - Runs the transfer with duplicate skip behavior
  - Optional destination playlist creation on export
  - Best-effort add with per-track fallback on chunk failure
  - Returns added/skipped/failed summary

## Project Layout

```text
api/
  main.py
  requirements.txt
  app/
    api/v1/routes/
    auth/
    config/
    crud/
    db/
    models/
    schemas/
    services/
  alembic/
  tests/
```

## Local Setup

### 1. Install dependencies

```bash
cd api
python -m venv .venv
# Linux/macOS
source .venv/bin/activate
# Windows PowerShell
# .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 2. Configure environment

Use the repository root `.env.example` and create `.env` at repo root.

Required values:

- `DATABASE_URL`
- `AUTH_SECRET_KEY`
- One provider OAuth set (or both):
  - `SPOTIFY_CLIENT_ID`
  - `SPOTIFY_CLIENT_SECRET`
  - `SPOTIFY_REDIRECT_URI`
  - Optional overrides: `SPOTIFY_API_BASE_URL`, `SPOTIFY_TOKEN_URL`
  - `SOUNDCLOUD_CLIENT_ID`
  - `SOUNDCLOUD_CLIENT_SECRET`
  - `SOUNDCLOUD_REDIRECT_URI`

### 3. Run migrations

```bash
cd api
alembic upgrade head
```

### 4. Start API

```bash
cd api
python main.py
```

or

```bash
cd api
uvicorn main:app --reload
```

## Docs and Health

- API root: `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- Health: `http://localhost:8000/health`

## Route Groups

- `/api/v1/auth/*` - login/callback/logout
- `/api/v1/users/*` - profile, settings, avatars
- `/api/v1/playlists/*` - provider playlist list/create
- `/api/v1/votuna/*` - Votuna playlists, settings, tracks, suggestions, votes, members, invites, management

## Tests

```bash
cd api
python -m ruff check main.py app tests
python -m black --check main.py app tests
pytest -q
```

## CI/CD automation

- Pull requests and pushes to `main` run backend and frontend quality checks in GitHub Actions.
- Release deploys run from published GitHub Releases (non-prerelease) and deploy to Railway using service-specific project/environment IDs from repository secrets.
- Railway push-triggered auto-deploy should be disabled for `api` and `frontend` so production deploys are release-driven.
