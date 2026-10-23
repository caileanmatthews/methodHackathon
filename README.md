# Watt's Up Field Assistant

Voice-first chatbot for substation technicians (hackathon prompt: "Lost Grid Knowledge").

- **Talks and listens**: tap-to-talk or hands-free mode, replies read aloud. Chrome/Edge use the browser's speech recognition; Firefox records audio and the backend transcribes it locally with Whisper (`backend/transcribe.py`, model downloads on first use).
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
