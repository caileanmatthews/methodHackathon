---
version: 1
slug: "frontend-hackathonfrontend-src-app-jsx"
primary_target: "frontend/hackathonFrontend/src/App.jsx"
related_targets: ["frontend/hackathonFrontend/src/JobView.jsx","frontend/hackathonFrontend/src/HomeView.jsx"]
---

# Field Assistant app (job dashboard, start screen, field reports)

Mode: Operate. Audience: substation technician on site (voice-first, tablet, night) plus dispatch reading status at a glance; judged on a desktop demo. Task: get from dispatch note to an asset-specific diagnosis and a service recommendation, then save a field report. Constraints: works with gloves and weak signal, voice in/out, typing fallback, Firefox via server-side Whisper.

## Direction contract

THESIS: A working operations console for one live job: conversation in the centre, the facts dispatch needs pinned beside it. Refuses the chatbot-in-a-card page and the KPI-tile dashboard.
OWN-WORLD: Navy app bar (#0f2742) with an amber utility mark; tinted cool-neutral grounds; one blue accent for primary actions; semantic ok/warn/crit/info tones only where they carry state. Public Sans (US public-sector type) throughout, tabular numerals. 10px panels, 1px borders, soft shadow. Light and dark themes; dark for night work.
STORY: The tech sees the briefing and what to check first; dispatch sees status (Assessing / Can stay in / Conditional / Remove) with needs; both see tonight's conditions and how long until the storm; finishing writes a report that feeds the next job.
FIRST VIEWPORT: App bar with job pill (site · asset · Scenario). Left: tabs (Assistant / Field report) and Finish action; conversation; composer with a large Tap-to-talk button, input, voice switches. Right 400px rail: Dispatch status, Site conditions with storm-window timeline, Asset record, Site & surroundings. Under 900px: tabs Assistant / Site & asset / Field report, a dispatch strip, full-width mic.
FORM: Pinned by the user ("clean like a professional dashboard"); category standard played straight. Signature move: storm-window timeline (forecast periods on one axis, freezing periods tinted, alert window in red, Now and onset marked). seed: none (unavailable)
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
