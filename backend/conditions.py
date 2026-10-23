"""Live site conditions: NWS weather/alerts and OpenStreetMap features, with cached fallbacks."""
import json
import threading
import time
from concurrent.futures import Future, ThreadPoolExecutor, as_completed
from concurrent.futures import TimeoutError as FutureTimeout
from pathlib import Path

import httpx

from knowledge import cached_weather

CACHE_DIR = Path(__file__).resolve().parent / "knowledge_base" / "api_cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

NWS_HEADERS = {"User-Agent": "(wattsup-field-assistant, hackathon-demo)", "Accept": "application/geo+json"}
OVERPASS_URLS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]
TIMEOUT = 12.0
OVERPASS_TIMEOUT = 6.0
CONDITIONS_TTL_S = 600

_pool = ThreadPoolExecutor(max_workers=8, thread_name_prefix="conditions")
# Mirror requests are awaited by _pool jobs, so they get their own pool and can never starve it.
_mirror_pool = ThreadPoolExecutor(max_workers=4, thread_name_prefix="overpass")
_lock = threading.Lock()
# (substation_id, scenario_mode) -> (fetched_at, weather future, nearby future)
_memo: dict[tuple[str, bool], tuple[float, Future, Future]] = {}


def _cache_write(key: str, data: dict) -> None:
    (CACHE_DIR / f"{key}.json").write_text(json.dumps(data), encoding="utf-8")


def _cache_read(key: str) -> dict | None:
    p = CACHE_DIR / f"{key}.json"
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else None


def _summarize_weather(alerts: list[dict], periods: list[dict]) -> dict:
    return {
        "alerts": [
            {k: a.get("properties", {}).get(k) for k in ("event", "severity", "onset", "ends", "headline", "instruction")}
            for a in alerts
        ],
        "forecast": [
            {k: p.get(k) for k in ("name", "startTime", "temperature", "temperatureUnit", "windSpeed", "shortForecast")}
            for p in periods[:4]
        ],
    }


def fetch_live_weather(lat: float, lon: float) -> dict:
    with httpx.Client(headers=NWS_HEADERS, timeout=TIMEOUT) as client:
        point = client.get(f"https://api.weather.gov/points/{lat},{lon}")
        point.raise_for_status()
        forecast_url = point.json()["properties"]["forecast"]
        forecast = client.get(forecast_url)
        forecast.raise_for_status()
        alerts = client.get("https://api.weather.gov/alerts/active", params={"point": f"{lat},{lon}"})
        alerts.raise_for_status()
    return _summarize_weather(alerts.json().get("features", []), forecast.json()["properties"]["periods"])


def get_weather(site: dict, scenario_mode: bool) -> dict:
    """Weather for a site. Scenario mode replays the cached storm snapshot (Scenario 1 needs a winter storm)."""
    snapshot = cached_weather()
    if scenario_mode and snapshot["location"]["substation_id"] == site["substation_id"]:
        data = _summarize_weather(snapshot["alerts"]["features"], snapshot["forecast"]["periods"])
        return {**data, "source": "cached scenario snapshot", "retrieved": snapshot["retrieved"]}

    key = f"weather_{site['substation_id']}"
    try:
        data = fetch_live_weather(site["latitude"], site["longitude"])
        _cache_write(key, data)
        return {**data, "source": "live NWS (api.weather.gov)"}
    except (httpx.HTTPError, KeyError, ValueError) as e:
        cached = _cache_read(key)
        if cached:
            return {**cached, "source": f"last cached NWS response (live call failed: {type(e).__name__})"}
        return {"alerts": [], "forecast": [], "source": f"unavailable ({type(e).__name__})"}


def _overpass_one(url: str, query: str) -> httpx.Response:
    r = httpx.post(url, data={"data": query}, timeout=OVERPASS_TIMEOUT, headers={"User-Agent": NWS_HEADERS["User-Agent"]})
    r.raise_for_status()
    r.json()
    return r


def _overpass(query: str) -> httpx.Response:
    # Ask every mirror at once and take the first good answer; a down mirror then costs nothing extra.
    futures = [_mirror_pool.submit(_overpass_one, url, query) for url in OVERPASS_URLS]
    error: Exception = httpx.HTTPError("no Overpass endpoint")
    for f in as_completed(futures):
        try:
            return f.result()
        except (httpx.HTTPError, ValueError) as e:
            error = e
    raise error


def get_nearby_features(site: dict, radius_m: int = 1500) -> dict:
    """Nearby power infrastructure and land use from OpenStreetMap Overpass."""
    lat, lon = site["latitude"], site["longitude"]
    query = f"""
    [out:json][timeout:20];
    (
      nwr["power"](around:{radius_m},{lat},{lon});
      nwr["landuse"~"quarry|forest|industrial|farmland"](around:{radius_m},{lat},{lon});
      nwr["natural"~"wood|water"](around:{radius_m},{lat},{lon});
      way["highway"~"primary|secondary|tertiary"](around:{radius_m},{lat},{lon});
    );
    out tags center 80;
    """
    key = f"osm_{site['substation_id']}"
    try:
        r = _overpass(query)
        counts: dict[str, int] = {}
        named = []
        for el in r.json().get("elements", []):
            tags = el.get("tags", {})
            kind = next((f"{k}={tags[k]}" for k in ("power", "landuse", "natural", "highway") if k in tags), "other")
            counts[kind] = counts.get(kind, 0) + 1
            if tags.get("name") and len(named) < 15:
                named.append(f"{tags['name']} ({kind})")
        data = {"radius_m": radius_m, "feature_counts": counts, "named_features": named}
        _cache_write(key, data)
        return {**data, "source": "live OpenStreetMap Overpass"}
    except (httpx.HTTPError, ValueError) as e:
        cached = _cache_read(key)
        if cached:
            return {**cached, "source": f"last cached Overpass response (live call failed: {type(e).__name__})"}
        return {"source": f"unavailable ({type(e).__name__})"}


def _failed(weather: Future) -> bool:
    # A finished fetch with no weather at all is retried rather than served from memory.
    return weather.done() and weather.result()["source"].startswith("unavailable")


def _futures(site: dict, scenario_mode: bool) -> tuple[Future, Future]:
    # One fetch per site per TTL window; callers that arrive while it is in flight share it.
    key = (site["substation_id"], scenario_mode)
    with _lock:
        entry = _memo.get(key)
        if entry and time.monotonic() - entry[0] < CONDITIONS_TTL_S and not _failed(entry[1]):
            return entry[1], entry[2]
        weather = _pool.submit(get_weather, site, scenario_mode)
        nearby = _pool.submit(get_nearby_features, site)
        _memo[key] = (time.monotonic(), weather, nearby)
        return weather, nearby


def prefetch_conditions(site: dict, scenario_mode: bool) -> None:
    """Start fetching in the background so the briefing doesn't wait on the weather and map APIs."""
    _futures(site, scenario_mode)


def site_conditions(site: dict, scenario_mode: bool, nearby_wait: float | None = None) -> dict:
    """Weather is always waited for. Map data waits at most nearby_wait seconds (None: until done), so a slow
    Overpass doesn't hold up an answer that mostly depends on the weather."""
    weather, nearby = _futures(site, scenario_mode)
    try:
        nearby_data = nearby.result(timeout=nearby_wait)
    except FutureTimeout:
        nearby_data = {"source": "still loading from OpenStreetMap"}
    return {
        "substation": {k: site[k] for k in ("substation_id", "name", "latitude", "longitude", "access_notes", "surroundings")},
        "weather": weather.result(),
        "nearby": nearby_data,
    }
