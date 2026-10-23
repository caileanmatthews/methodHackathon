# Watt's Up Field Assistant

Voice-first chatbot for substation technicians (hackathon prompt: "Lost Grid Knowledge").

- **Talks and listens**: press **Start call** for a hands-free conversation. The mic stays open, the app detects when you start and stop talking, replies are spoken in short conversational turns, and you can talk over a reply to cut in (a headset works best). Push to talk and typing still work. Call audio is transcribed locally with Whisper (`backend/transcribe.py`, model downloads on first use).
- **Streams**: replies stream from Claude (`/api/chat/stream`, newline-delimited JSON) and each sentence is spoken as soon as it is complete. Dashboard updates (conditions, dispatch status, report) appear the moment their tool runs. Site conditions are prefetched when a job starts, cached for 10 minutes, and the briefing waits at most 2 s for OpenStreetMap.
- **Models**: briefings, typed questions and field reports use Claude Opus 5.5; turns on a live call use Claude Haiku 5.5 at low effort so replies start sooner (a call-model refusal is retried on Opus). Both are set at the top of `backend/main.py` (`MAIN_MODEL`, `CALL_MODEL`).
- **Knows the site**: pulls live NWS forecast/alerts and OpenStreetMap features for the work site. If those fail, it uses the last cached response. "Scenario mode" replays the cached 2027-01-19 ice-storm snapshot for Scenario 1.
- **Knows the equipment**: the whole document library (`wattsup_document_library_extract/`) goes into Claude's context: manuals, work orders, SCADA log, memos and exit interviews.
- **Learns**: "Finish job & write report" has Claude write a structured field report to `backend/knowledge_base/field_reports/`. Every later session reads those reports.

## Run

```bash
# backend (from repo root)
.venv/Scripts/pip install -r backend/requirements.txt
cp backend/.env.example backend/.env   # add your ANTHROPIC_API_KEY
cd backend && ../.venv/Scripts/uvicorn main:app --reload --port 8000

# frontend
cd frontend/hackathonFrontend && npm install && npm run dev
```

Open http://localhost:5173. Vite proxies `/api` to the backend on port 8000.
