# LiveKit Agents "Hello World" (Python)

This is a tiny starter so you can experiment with the **LiveKit Agents** framework locally.

## What it does

- Starts an `AgentServer` from `agent.py`
- Uses a standard **STT → LLM → TTS** voice pipeline (via LiveKit Inference models)
- Supports the built-in CLI modes: `download-files`, `console`, `dev`, `start`

## Prereqs

- Python **3.10+**
- A **LiveKit Cloud** project (or a self-hosted LiveKit server) with:
  - `LIVEKIT_URL`
  - `LIVEKIT_API_KEY`
  - `LIVEKIT_API_SECRET`

## Setup

1) Create `.env.local`

Copy `env.local.example` to a new file named `.env.local` and fill in values.

2) Install deps

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

3) Download model files (VAD, turn detector, noise cancellation)

```bash
python agent.py download-files
```

## Run it

### Talk to it in your terminal (fastest)

```bash
python agent.py console
```

### Connect it to LiveKit (for the Agents Playground / external clients)

```bash
python agent.py dev
```

## Notes

- If you want to use a single speech-to-speech **Realtime** model (like OpenAI Realtime), we can switch this to `openai.realtime.RealtimeModel(...)` and add `OPENAI_API_KEY`.

