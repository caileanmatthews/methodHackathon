# Allied Switchgear Corp. — Transformer Division
## Instruction Book IB-LTC-32R (1978) with VRC-2 Control Supplement (1979)

> Scanned copy. Original VRC-2 settings sheet for Harlan Creek T1 attached at end (handwritten, updated 2008).

---

### Section 2 — Tap Changer Ratings
- Regulation range: ±10% in 32 steps (16 raise, 16 lower) plus neutral.
- Step size: 0.625% per step, equal to **0.75 V per step on a 120 V base**.
- Arcing-in-oil, reactance-type switching. Arcing produces gases in the LTC compartment oil; dissolved gas trends should be reviewed against operation count.

---

### Section 5 — VRC-2 Voltage Regulating Control
The VRC-2 compares regulated voltage (120 V base) to the **voltage set point**. If voltage remains outside the bandwidth longer than the **time delay**, the control initiates one tap change.

**Bandwidth dial:** calibrated in **plus or minus (±) volts from the set point**. Example: set point 120 V and bandwidth dial 1.0 = band from 119.0 to 121.0 V (2.0 V total).

**IMPORTANT:** The total bandwidth must be greater than one tap step (0.75 V). If the total band is smaller than one step, a single tap change can move voltage from below the band to above it, and the control will raise and lower repeatedly ("hunting"). Allied recommends a total bandwidth of at least 1.5 times the step voltage.

---

### Section 6 — Maintenance
- Inspect contacts at 50,000 operations or 5 years.
- Excessive operations accelerate contact wear and increase gas generation in the LTC compartment.

---

### Attachment — VRC-2 Settings Sheet, Harlan Creek T1 (handwritten)

| Setting | Value |
|---|---|
| Voltage set point | 122.0 V |
| Bandwidth (dial) | 0.6 |
| Time delay | 45 s |
| Line drop compensation | Off |

Signed "R.T. 6/08 — raised VSP from 121 to 122 per planning."

---

### Attachment — Replacement Control Quick Reference (vendor card, filed in binder 2024)
Generic microprocessor LTC control.
- **Bandwidth:** entered as **total width of the band, in volts**, centered on the set point. Example: set point 120 V, bandwidth 2.0 = band from 119.0 to 121.0 V.
- Time delay: definite time, seconds.
- Operations counter and tap position log: viewable on front panel, Menu 4.
