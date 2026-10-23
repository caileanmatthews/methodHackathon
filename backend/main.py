"""Field assistant API: voice-friendly chat over the document library, live site conditions,
and field reports that feed back into the knowledge base."""
import json
import uuid
from collections.abc import Iterator
from datetime import datetime

import anthropic
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import knowledge
from conditions import prefetch_conditions, site_conditions
from transcribe import transcribe

load_dotenv()

# Briefings, typed questions and field reports get the most capable model. Live voice calls use a fast,
# lightweight model so replies start sooner; low effort suits short conversational turns.
MAIN_MODEL = {
    "model": "claude-opus-5-5",
    "output_config": {"effort": "medium"},
    "betas": ["server-side-fallback-2026-07-01"],
    "fallbacks": "default",
}
# Claude Haiku 5.5 has no server-side fallback, so no fallbacks here; a refusal is retried on MAIN_MODEL.
CALL_MODEL = {
    "model": "claude-haiku-5-5",
    "output_config": {"effort": "low"},
}
SCENARIO_TIME = "2027-01-19 02:30 (Tuesday)"
MAX_TOOL_ROUNDS = 8
NEARBY_WAIT_S = 2.0  # how long a briefing waits on OpenStreetMap before going ahead without it

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
- Dispatch watches a status panel fed by update_dispatch_status. Call it after your first briefing (usually
  "assessing") and again whenever your recommendation or what the tech needs changes. Keep it in step with
  what you tell the tech.
- When the tech says the job is done (or asks you to write it up), call save_field_report with a complete,
  accurate report built only from what was said and found in this conversation, plus the lessons the next tech
  needs. Then confirm in one or two sentences what was recorded.
- Messages that start with "(voice call)" come from a live hands-free call: the tech is talking to you and
  hearing you, like a phone call with a senior tech. Reply the way you would speak: two to four short sentences,
  one step or one question at a time, contractions, no lists or numbering, and a quick acknowledgement of what
  they just said ("Got it, eighteen degrees in the cabinet."). End by telling them what to do next or asking the
  one thing you need. Offer detail only when they ask for it. Safety warnings still come first.
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
        "name": "update_dispatch_status",
        "description": "Update the service recommendation shown to dispatch for the asset on this job.",
        "strict": True,
        "input_schema": {
            "type": "object",
            "properties": {
                "status": {
                    "type": "string",
                    "enum": ["assessing", "ok_in_service", "conditional", "remove_from_service"],
                    "description": "assessing: still diagnosing; ok_in_service: can stay in through the conditions; "
                                   "conditional: can stay in only if the listed conditions are met; "
                                   "remove_from_service: take it out / do not rely on it.",
                },
                "headline": {"type": "string", "description": "One sentence a dispatcher can act on"},
                "rationale": {"type": "string", "description": "Short why, citing evidence and conditions"},
                "needs": {"type": "array", "items": {"type": "string"},
                          "description": "Crew, parts, switching, or approvals the tech needs (empty if none)"},
            },
            "required": ["status", "headline", "rationale", "needs"],
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
        cond = site_conditions(site, session["scenario_mode"], nearby_wait=NEARBY_WAIT_S)
        session["conditions"] = cond
        return json.dumps(cond), False
    if name == "update_dispatch_status":
        session["dispatch"] = {**args, "updated": datetime.now().isoformat(timespec="seconds")}
        return json.dumps({"updated": True}), False
    if name == "save_field_report":
        report = save_report(session, args)
        session["report"] = report
        return json.dumps({"saved": True, "report_id": report["report_id"]}), False
    return f"Unknown tool {name}", True


TOOL_STATUS = {
    "get_site_conditions": "Checking site conditions",
    "update_dispatch_status": "Updating dispatch",
    "save_field_report": "Saving the field report",
}
# Dashboard state a tool changes, pushed to the client as soon as the tool runs.
TOOL_UPDATES = {"get_site_conditions": "conditions", "update_dispatch_status": "dispatch", "save_field_report": "report"}
INTERRUPTED = "Interrupted by the technician before this ran."
FINISH_TEXT = "The job is complete. Write and save the field report now using save_field_report."


def add_user_text(session: dict, text: str) -> None:
    # An interrupted turn can leave the history ending on a user message; fold the new text into it.
    msgs = session["messages"]
    if msgs and msgs[-1]["role"] == "user":
        content = msgs[-1]["content"]
        blocks = [{"type": "text", "text": content}] if isinstance(content, str) else list(content)
        msgs[-1] = {"role": "user", "content": blocks + [{"type": "text", "text": text}]}
    else:
        msgs.append({"role": "user", "content": text})


def close_dangling_tool_uses(session: dict) -> None:
    # If the client disconnected after a tool_use was recorded but before its results, answer it so the
    # history stays valid for the next request.
    msgs = session["messages"]
    if not msgs or msgs[-1]["role"] != "assistant":
        return
    pending = [b for b in msgs[-1]["content"] if getattr(b, "type", None) == "tool_use"]
    if pending:
        msgs.append({"role": "user", "content": [
            {"type": "tool_result", "tool_use_id": b.id, "content": INTERRUPTED, "is_error": True} for b in pending
        ]})


def converse_stream(session: dict, text: str, fast: bool = False) -> Iterator[dict]:
    """Run one technician turn, yielding events as they happen:
    {"type": "text", "text"} deltas, {"type": "status", "text"} while tools run,
    {"type": "conditions"|"dispatch"|"report", "data"} dashboard updates, and a final {"type": "done", "reply"}.
    fast=True runs the turn on the lightweight call model."""
    history_len = len(session["messages"])
    add_user_text(session, text)
    spoken: list[str] = []
    model = CALL_MODEL if fast else MAIN_MODEL
    try:
        for _ in range(MAX_TOOL_ROUNDS):
            round_text: list[str] = []
            try:
                # Tool inputs here are small and strict-validated, so eager input streaming is left off:
                # buffering them costs nothing the technician can see or hear.
                with client.beta.messages.stream(
                    max_tokens=16000,
                    system=session["system"],
                    tools=TOOLS,
                    messages=session["messages"],
                    **model,
                ) as stream:
                    for event in stream:
                        if event.type == "text":
                            if not round_text and spoken:
                                yield {"type": "text", "text": "\n\n"}
                            round_text.append(event.text)
                            yield {"type": "text", "text": event.text}
                    response = stream.get_final_message()
            except anthropic.RateLimitError:
                raise HTTPException(429, "The assistant is rate limited. Try again in a moment.")
            except anthropic.APIStatusError as e:
                raise HTTPException(502, f"Assistant error: {e.message}")
            except anthropic.APIConnectionError:
                raise HTTPException(503, "Can't reach the assistant service. Check signal and try again.")

            if response.stop_reason == "refusal" and model is CALL_MODEL:
                # The call model has no server-side fallback: redo this round on the main model instead.
                model = MAIN_MODEL
                yield {"type": "replace", "text": "\n\n".join(t for t in spoken if t)}
                continue
            if response.stop_reason == "refusal":
                del session["messages"][history_len:]
                yield {"type": "replace", "text": "I can't help with that request."}
                yield {"type": "done", "reply": "I can't help with that request."}
                return

            # Append the full content (including thinking blocks) so the history stays append-only.
            session["messages"].append({"role": "assistant", "content": response.content})
            if round_text:
                spoken.append("".join(round_text).strip())
            if response.stop_reason != "tool_use":
                yield {"type": "done", "reply": "\n\n".join(t for t in spoken if t)}
                return

            results = []
            for block in response.content:
                if block.type == "tool_use":
                    yield {"type": "status", "text": TOOL_STATUS.get(block.name, "Working")}
                    output, is_error = run_tool(session, block.name, block.input)
                    results.append({"type": "tool_result", "tool_use_id": block.id, "content": output,
                                    "is_error": is_error})
                    key = TOOL_UPDATES.get(block.name)
                    if key and not is_error:
                        yield {"type": key, "data": session.get(key)}
            session["messages"].append({"role": "user", "content": results})
        message = "I ran out of steps working on that. Please ask again."
        yield {"type": "text", "text": message}
        yield {"type": "done", "reply": message}
    finally:
        close_dangling_tool_uses(session)


def converse(session: dict, text: str, fast: bool = False) -> str:
    reply = ""
    for event in converse_stream(session, text, fast):
        if event["type"] == "done":
            reply = event["reply"]
    return reply


class SessionStart(BaseModel):
    substation_id: str
    asset_id: str | None = None
    technician: str = "Jordan Reyes"
    dispatch_note: str = ""
    scenario_mode: bool = True


class StreamIn(BaseModel):
    session_id: str
    kind: str = "message"  # "brief" (opening briefing), "message", or "finish" (write the field report)
    message: str = ""
    call: bool = False


class ChatIn(BaseModel):
    session_id: str
    message: str
    call: bool = False


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
    session["opener"] = opener
    prefetch_conditions(site, body.scenario_mode)
    return {"session_id": session_id}


@app.post("/api/chat")
def chat(body: ChatIn):
    session = SESSIONS.get(body.session_id)
    if not session:
        raise HTTPException(404, "Session expired. Start a new job.")
    before = session["report"]
    text = f"(voice call) {body.message}" if body.call else body.message
    reply = converse(session, text, fast=body.call)
    report = session["report"] if session["report"] is not before else None
    return {"reply": reply, "report": report, "conditions": session.get("conditions"),
            "dispatch": session.get("dispatch")}


@app.post("/api/session/{session_id}/report")
def finish_job(session_id: str):
    session = SESSIONS.get(session_id)
    if not session:
        raise HTTPException(404, "Session expired. Start a new job.")
    reply = converse(session, FINISH_TEXT)
    return {"reply": reply, "report": session["report"], "dispatch": session.get("dispatch")}



@app.post("/api/chat/stream")
def chat_stream(body: StreamIn):
    """Newline-delimited JSON events, so the client can show and speak the reply while it is written."""
    session = SESSIONS.get(body.session_id)
    if not session:
        raise HTTPException(404, "Session expired. Start a new job.")
    if body.kind == "brief":
        text = session["opener"]
    elif body.kind == "finish":
        text = FINISH_TEXT
    else:
        text = f"(voice call) {body.message}" if body.call else body.message

    def events():
        try:
            for event in converse_stream(session, text, fast=body.kind == "message" and body.call):
                yield json.dumps(event) + "\n"
        except HTTPException as e:
            yield json.dumps({"type": "error", "message": e.detail}) + "\n"

    return StreamingResponse(events(), media_type="application/x-ndjson",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
