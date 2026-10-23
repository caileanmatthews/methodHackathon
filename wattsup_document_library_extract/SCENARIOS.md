# Demo Scenarios — Watt's Up Power Co. (simulated)

Build your demo around **Scenario 1**. Scenarios 2 and 3 are optional stretch goals that prove your solution generalizes to other assets. Everything needed to reach a correct answer is somewhere in this extract; no single file has all of it.

---

## Scenario 1 (primary): "Can B-12 stay in for the storm?"

**When:** Tuesday, 2027-01-19, 02:30 AM.

**What happened:** During pre-storm switching at Harlan Creek, the system operator sent B-12 a SCADA trip command. It did not open. The operator sent a second trip command 28 seconds later and it opened. The operator then closed it back in to restore the normal configuration (see `scada_event_log.csv`).

**Jordan's assignment from dispatch:** "Go to Harlan Creek and tell me whether B-12 can stay in service through the ice storm tonight. If not, tell me what you need."

**What Jordan has:** the truck, a tablet with one bar of signal at the gate, standard breaker test equipment (timer, feeler gauges, micro-ohmmeter, variable DC supply), and this extract.

**Your demo should show Jordan getting to:**
1. What is most likely wrong with B-12 and why, specific to this asset.
2. What to check first on site, and what to do (and not do) next.
3. A clear recommendation to dispatch, informed by tonight's conditions at the site.
4. How what Jordan learns tonight is captured so the next tech is better off.

---

## Scenario 2 (stretch): "Why didn't the B-phase target drop?"

**When:** 2026-09-28, 2:22 PM.

**What happened:** A tree contacted Feeder 3 at Quarry Road, causing a B-C phase fault of about 3,000 A primary. The Phase C overcurrent relay operated in 1.76 s and cleared the fault. The Phase B relay saw the same current but its target did not drop.

**Jordan's as-found test results on the Phase B relay (QRY-F3-51):**
- Pickup: 5.58 A (tap setting 5.0 A)
- Operating time at 5x tap (25 A): 2.38 s

**Question:** Is the Phase B relay healthy? If not, what is the likely cause, how should Jordan fix it safely, and what should change so it doesn't happen again?

---

## Scenario 3 (stretch): "The tap changer won't sit still."

**When:** 2027-01-18, 6:10 to 6:50 PM.

**What happened:** SCADA shows the T1 load tap changer at Harlan Creek alternating between positions 7R and 8R 48 times in 40 minutes, with regulated voltage swinging between about 121.6 V and 122.35 V. Operations has asked about high LTC operation counts before (see work orders).

**Question:** Why is it doing this, what setting should Jordan change and to what value, and is there anything else that needs follow-up?
