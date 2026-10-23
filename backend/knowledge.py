"""Loads the document library and saved field reports into prompt text."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LIBRARY_DIR = ROOT / "wattsup_document_library_extract"
REPORTS_DIR = Path(__file__).resolve().parent / "knowledge_base" / "field_reports"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

# Files that make up the library, in a fixed order so the prompt prefix is stable (cache-friendly).
LIBRARY_FILES = [
    "assets.json",
    "asset_register.csv",
    "substations.json",
    "technicians.json",
    "work_orders.csv",
    "scada_event_log.csv",
]
LIBRARY_FOLDERS = ["manuals", "bulletins", "procedures", "memos", "transcripts"]


def load_json(name: str):
    return json.loads((LIBRARY_DIR / name).read_text(encoding="utf-8"))


def substations() -> list[dict]:
    return load_json("substations.json")


def assets() -> list[dict]:
    return load_json("assets.json")


def cached_weather() -> dict:
    return load_json("weather_snapshot_cached.json")


def library_text() -> str:
    parts = []
    paths = [LIBRARY_DIR / f for f in LIBRARY_FILES]
    for folder in LIBRARY_FOLDERS:
        paths += sorted((LIBRARY_DIR / folder).glob("*.md"))
    for p in paths:
        rel = p.relative_to(LIBRARY_DIR).as_posix()
        parts.append(f'<document path="{rel}">\n{p.read_text(encoding="utf-8").strip()}\n</document>')
    return "\n\n".join(parts)


def list_reports() -> list[dict]:
    reports = []
    for p in sorted(REPORTS_DIR.glob("*.json")):
        reports.append(json.loads(p.read_text(encoding="utf-8")))
    return reports


def reports_text() -> str:
    reports = list_reports()
    if not reports:
        return "<field_reports>\nNo field reports have been captured yet.\n</field_reports>"
    body = "\n\n".join(
        f'<field_report id="{r["report_id"]}">\n{json.dumps(r, indent=2)}\n</field_report>' for r in reports
    )
    return f"<field_reports>\n{body}\n</field_reports>"
