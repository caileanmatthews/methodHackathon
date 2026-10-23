# Watt's Up Power Co. — Document Library Extract (simulated)

**Prompt:** Knowledge at the Breaker · **Client POC:** Mark Davidson, METHOD

All companies, people, equipment models, and records in this extract are fictional and created for this hackathon. Technical behavior (how breakers, relays, and tap changers work and fail) is modeled on real substation practice, but **nothing here is a real maintenance procedure.** Do not use it for actual field work.

## Start here

Read `SCENARIOS.md` first. It describes the job Jordan is on and what your demo should show.

## What's in the extract

| File or folder | What it is |
|---|---|
| `SCENARIOS.md` | The demo jobs |
| `assets.json` | Detailed records for the three assets in the scenarios, including aliases |
| `asset_register.csv` | All major equipment at Harlan Creek and Quarry Road |
| `substations.json` | Substation coordinates, access, and surroundings |
| `technicians.json` | Who wrote the work orders, by initials |
| `work_orders.csv` | Maintenance history, 2003 to 2026 |
| `scada_event_log.csv` | Operator and SCADA events for the scenarios |
| `weather_snapshot_cached.json` | Cached weather for Scenario 1, shaped like NWS API output |
| `manuals/` | Scanned manufacturer instruction books |
| `bulletins/` | Manufacturer service bulletins |
| `procedures/` | Company maintenance procedures |
| `memos/` | Engineering and operations memos |
| `transcripts/` | Exit interviews with retired senior technicians |

## Things to know

- **This is a document library, not an answer key.** Like the real one, it contains material that is outdated, meant for other equipment, or simply not relevant to the job. Part of the challenge is deciding what to trust.
- **Asset names are inconsistent.** Work orders refer to the same equipment in several ways. Use the `aliases` field in `assets.json` and the `asset_register.csv` to match them.
- **No single source has the answer.** The manuals have gaps, the work orders are vague, and the transcripts aren't tied to asset IDs.
- **Live data:** Call the [NWS API](https://www.weather.gov/documentation/services-web-api) (no key) and [OpenStreetMap Overpass](https://wiki.openstreetmap.org/wiki/Overpass_API) (no key) using the substation coordinates. The coordinates are placeholders in a real region, so Overpass returns real nearby features. Scenario 1 requires freezing conditions and an active winter storm, which live weather almost certainly won't show on hackathon day. Use `weather_snapshot_cached.json` for the scenario, and read only the fields you need (temperature, alert event) because the cached file is a simplified version of the real NWS format.
- **Units:** temperatures in °F, breaker timing in cycles at 60 Hz (1 cycle ≈ 16.7 ms), LTC voltages on a 120 V base (what the tap changer control reads through the voltage transformer on the 12.47 kV bus; 120 V = 12.47 kV nominal).
