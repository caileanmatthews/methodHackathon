"""Field assistant API: voice-friendly chat over the document library, live site conditions,
and field reports that feed back into the knowledge base."""
import json
import uuid
from datetime import datetime

import anthropic
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import knowledge
from conditions import site_conditions
from transcribe import transcribe

load_dotenv()

MODEL = "claude-opus-5-5"
SCENARIO_TIME = "2027-01-19 02:30 (Tuesday)"
MAX_TOOL_ROUNDS = 8

client = anthropic.Anthropic()
app = FastAPI(title="Watt's Up Field Assistant")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

INSTRUCTIONS = """You are the field assistant for Watt's Up Power Co. substation technicians. You are talking with a
technician who is on site, often at night, gloves on, with weak signal. They will usually SPEAK to you and hear your
replies read aloud by text-to-speech.

How to answer:
- Talk like an experienced senior tech on the phone. Short, plain sentences. Lead with the answer, then the why.
- Keep replies under about 150 words unless the tech asks for detail. Use short numbered steps for procedures.
- No markdown tables, headings, or bold; they read badly aloud. Spell out units ("degrees F", "cycles").
- Be specific to THIS asset: its model, history, aliases, and quirks. Match work-order references through the
  aliases in assets.json and asset_register.csv.
- The document library contains outdated, irrelevant, and wrong-model material. Decide what to trust and say so
  briefly (e.g. "the BOC-69-2000 manual is for a different model, ignore it"). Name the source when it matters
  ("per Ray Thompson's exit interview", "WO-09-00342").
- Safety first: call out hazards, energized equipment, stored spring energy, and anything that must not be done.
  Never invent test limits; if the manuals are silent, say so and say who to escalate to.
- Pull site conditions with get_site_conditions before judging risk or making a recommendation to dispatch, and
  factor tonight's weather (temperature, storm alerts, wind, icing) into how urgent the fix is and what could fail.
- Earlier field reports are the most recent knowledge from techs; check them for this asset first.
- As you go, keep track of what the tech reports: as-found readings, what they did, what worked.
- When the tech says the job is done (or asks you to write it up), call save_field_report with a complete,
  accurate report built only from what was said and found in this conversation, plus the lessons the next tech
  needs. Then confirm in one or two sentences what was recorded.
"""

TOOLS = [
    {
        "name": "get_site_conditions",
        "description": "Get current conditions at a substation: NWS forecast and active weather alerts, plus nearby "
                       "power infrastructure and land use from OpenStreetMap. Use before assessing risk or urgency.",
        "strict": True,
        "input_schema": {
            "type": "object",
            "properties": {"substation_id": {"type": "string", "description": "e.g. SUB-HCK or SUB-QRY"}},
            "required": ["substation_id"],
            "additionalProperties": False,
        },
    },
    {
        "name": "save_field_report",
        "description": "Save the end-of-job field report to the knowledge base so future technicians and this "
                       "assistant can use it. Call when the technician says the job is complete.",
        "strict": True,
        "input_schema": {
            "type": "object",
            "properties": {
                "asset_id": {"type": "string", "description": "Canonical asset ID, e.g. HCK-OCB-B12"},
                "title": {"type": "string", "description": "One-line summary of the job"},
                "symptom": {"type": "string", "description": "What was reported / why the tech was dispatched"},
                "site_conditions": {"type": "string", "description": "Weather and site conditions during the job"},
                "as_found": {"type": "string", "description": "Measurements and observations before work"},
                "root_cause": {"type": "string", "description": "Most likely cause and the evidence for it"},
                "actions_taken": {"type": "array", "items": {"type": "string"}},
                "as_left": {"type": "string", "description": "Measurements and state after work"},
                "recommendation": {"type": "string", "description": "Service decision / what was told to dispatch"},
                "follow_up": {"type": "array", "items": {"type": "string"},
                              "description": "Open items, parts, scheduled work"},
                "tips_for_next_tech": {"type": "array", "items": {"type": "string"},
                                       "description": "Asset-specific quirks and lessons learned"},
                "sources_used": {"type": "array", "items": {"type": "string"},
                                 "description": "Library documents / work orders that mattered"},
            },
            "required": ["asset_id", "title", "symptom", "site_conditions", "as_found", "root_cause",
                         "actions_taken", "as_left", "recommendation", "follow_up", "tips_for_next_tech",
                         "sources_used"],
            "additionalProperties": False,
        },
    },
]

SESSIONS: dict[str, dict] = {}


def find_site(substation_id: str) -> dict:
    for s in knowledge.substations():
        if s["substation_id"] == substation_id:
            return s
    raise HTTPException(404, f"Unknown substation {substation_id}")


def build_system() -> list[dict]:
    # Library is stable across sessions, so it sits before the cache breakpoint; reports change as techs add them.
    return [
        {"type": "text", "text": INSTRUCTIONS},
        {"type": "text", "text": f"<document_library>\n{knowledge.library_text()}\n</document_library>",
         "cache_control": {"type": "ephemeral"}},
        {"type": "text", "text": knowledge.reports_text()},
    ]


def save_report(session: dict, data: dict) -> dict:
    now = datetime.now()
    report = {
        "report_id": f"FR-{now:%Y%m%d-%H%M%S}-{data['asset_id']}",
        "created": now.isoformat(timespec="seconds"),
        "technician": session["technician"],
        "substation_id": session["substation_id"],
        "job_time": session["job_time"],
        **data,
    }
    path = knowledge.REPORTS_DIR / f"{report['report_id']}.json"
    path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    return report


def run_tool(session: dict, name: str, args: dict) -> tuple[str, bool]:
    if name == "get_site_conditions":
        site = find_site(args["substation_id"])
        cond = site_conditions(site, session["scenario_mode"])
        session["conditions"] = cond
        return json.dumps(cond), False
    if name == "save_field_report":
        report = save_report(session, args)
        session["report"] = report
        return json.dumps({"saved": True, "report_id": report["report_id"]}), False
    return f"Unknown tool {name}", True


def converse(session: dict, text: str) -> str:
    session["messages"].append({"role": "user", "content": text})
    for _ in range(MAX_TOOL_ROUNDS):
        try:
            response = client.beta.messages.create(
                model=MODEL,
                max_tokens=16000,
                system=session["system"],
                tools=TOOLS,
                messages=session["messages"],
                output_config={"effort": "medium"},
                betas=["server-side-fallback-2026-07-01"],
                fallbacks="default",
            )
        except anthropic.RateLimitError:
            raise HTTPException(429, "The assistant is rate limited. Try again in a moment.")
        except anthropic.APIStatusError as e:
            raise HTTPException(502, f"Assistant error: {e.message}")
        except anthropic.APIConnectionError:
            raise HTTPException(503, "Can't reach the assistant service. Check signal and try again.")

        if response.stop_reason == "refusal":
            session["messages"].pop()
            return "I can't help with that request."

        # Append the full content (including thinking blocks) so the history stays append-only.
        session["messages"].append({"role": "assistant", "content": response.content})
        if response.stop_reason != "tool_use":
            return "\n".join(b.text for b in response.content if b.type == "text").strip()

        results = []
        for block in response.content:
            if block.type == "tool_use":
                output, is_error = run_tool(session, block.name, block.input)
                results.append({"type": "tool_result", "tool_use_id": block.id, "content": output,
                                "is_error": is_error})
        session["messages"].append({"role": "user", "content": results})
    return "I ran out of steps working on that. Please ask again."


class SessionStart(BaseModel):
    substation_id: str
    asset_id: str | None = None
    technician: str = "Jordan Reyes"
    dispatch_note: str = ""
    scenario_mode: bool = True


class ChatIn(BaseModel):
    session_id: str
    message: str


@app.get("/api/sites")
def sites():
    return knowledge.substations()


@app.get("/api/assets")
def assets():
    return knowledge.assets()


@app.get("/api/conditions/{substation_id}")
def conditions(substation_id: str, scenario: bool = True):
    return site_conditions(find_site(substation_id), scenario)


@app.get("/api/reports")
def reports():
    return knowledge.list_reports()


@app.post("/api/transcribe")
def transcribe_audio(audio: UploadFile = File(...)):
    data = audio.file.read()
    if not data:
        raise HTTPException(400, "No audio received.")
    try:
        return {"text": transcribe(data)}
    except Exception as e:  # undecodable audio, model load failure
        raise HTTPException(500, f"Transcription failed: {type(e).__name__}")


@app.post("/api/session")
def start_session(body: SessionStart):
    site = find_site(body.substation_id)
    session_id = uuid.uuid4().hex
    job_time = SCENARIO_TIME if body.scenario_mode else datetime.now().strftime("%Y-%m-%d %H:%M (%A)")
    session = {
        "technician": body.technician,
        "substation_id": site["substation_id"],
        "scenario_mode": body.scenario_mode,
        "job_time": job_time,
        "system": build_system(),
        "messages": [],
        "report": None,
    }
    SESSIONS[session_id] = session

    asset_line = f"Asset: {body.asset_id}\n" if body.asset_id else ""
    opener = (
        f"Technician: {body.technician}\nSite: {site['name']} ({site['substation_id']})\n{asset_line}"
        f"Current time: {job_time}\nDispatch note: {body.dispatch_note or '(none)'}\n\n"
        "I'm on my way to / at the site. Check site conditions, then brief me: what's most likely wrong, "
        "what I should check first, and anything I must not do."
    )
    reply = converse(session, opener)
    return {"session_id": session_id, "reply": reply, "conditions": session.get("conditions")}


@app.post("/api/chat")
def chat(body: ChatIn):
    session = SESSIONS.get(body.session_id)
    if not session:
        raise HTTPException(404, "Session expired. Start a new job.")
    before = session["report"]
    reply = converse(session, body.message)
    report = session["report"] if session["report"] is not before else None
    return {"reply": reply, "report": report, "conditions": session.get("conditions")}


@app.post("/api/session/{session_id}/report")
def finish_job(session_id: str):
    session = SESSIONS.get(session_id)
    if not session:
        raise HTTPException(404, "Session expired. Start a new job.")
    reply = converse(session, "The job is complete. Write and save the field report now using save_field_report.")
    return {"reply": reply, "report": session["report"]}
