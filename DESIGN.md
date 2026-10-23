---
name: Field Assistant
description: Voice-first operations console for one live substation job, Watt's Up Power Co.
colors:
  shell-navy: "#0f2742"
  shell-navy-raised: "#173556"
  shell-text: "#e9f0f8"
  shell-muted: "#9fb3c8"
  utility-amber: "#f2b230"
  utility-amber-ink: "#1c1300"
  utility-amber-text: "#f6c862"
  ground: "#eef2f6"
  surface: "#ffffff"
  surface-sunken: "#f6f8fb"
  border: "#dbe2ea"
  border-strong: "#c3cdd8"
  ink: "#111a24"
  ink-secondary: "#3b4757"
  ink-muted: "#5e6b7c"
  action-blue: "#1d5fd6"
  action-blue-hover: "#174fb4"
  action-blue-ink: "#ffffff"
  action-blue-soft: "#e5eefc"
  ok: "#13795b"
  ok-soft: "#e3f4ed"
  warn: "#9a5b00"
  warn-soft: "#fdf1dc"
  crit: "#c22a2a"
  crit-soft: "#fce8e8"
  info: "#2a62b8"
  info-soft: "#e6effb"
  freeze: "#cfe0f5"
  mild: "#e8edf2"
  night-shell-navy: "#0b1d31"
  night-shell-navy-raised: "#132b46"
  night-ground: "#0b1119"
  night-surface: "#121a24"
  night-surface-sunken: "#17212d"
  night-border: "#243142"
  night-border-strong: "#324257"
  night-ink: "#e6edf5"
  night-ink-secondary: "#c2cdda"
  night-ink-muted: "#8d9bad"
  night-action-blue: "#4d8cf5"
  night-action-blue-hover: "#6a9ff7"
  night-action-blue-ink: "#06111f"
  night-action-blue-soft: "#15284a"
  night-ok: "#47c79a"
  night-ok-soft: "#10301f"
  night-warn: "#f0b04a"
  night-warn-soft: "#33250c"
  night-crit: "#ff6b6b"
  night-crit-soft: "#3a1416"
  night-info: "#7aa7f2"
  night-info-soft: "#14243f"
  night-freeze: "#1d3554"
  night-mild: "#1f2a37"
  night-user-bubble: "#16294a"
typography:
  display:
    fontFamily: "Public Sans Variable, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 650
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontFeature: "'tnum' 1"
  headline:
    fontFamily: "Public Sans Variable, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 650
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Public Sans Variable, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 650
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  title-panel:
    fontFamily: "Public Sans Variable, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 650
    lineHeight: 1.25
  body:
    fontFamily: "Public Sans Variable, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "'tnum' 1"
  body-chat:
    fontFamily: "Public Sans Variable, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "0.9875rem"
    fontWeight: 400
    lineHeight: 1.55
  body-sm:
    fontFamily: "Public Sans Variable, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Public Sans Variable, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.5
  caption:
    fontFamily: "Public Sans Variable, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.5
  micro:
    fontFamily: "Public Sans Variable, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 700
    lineHeight: "16px"
rounded:
  xs: "3px"
  tail: "4px"
  track: "6px"
  sm: "7px"
  md: "10px"
  lg: "14px"
  pill: "999px"
spacing:
  xxs: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "24px"
  xxl: "28px"
  page-bottom: "48px"
  appbar-height: "56px"
  rail-width: "400px"
components:
  app-bar:
    backgroundColor: "{colors.shell-navy}"
    textColor: "{colors.shell-text}"
    height: "56px"
    padding: "0 16px"
  job-pill:
    backgroundColor: "{colors.shell-navy-raised}"
    textColor: "{colors.shell-text}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.pill}"
    height: "36px"
    padding: "0 12px"
  button-primary:
    backgroundColor: "{colors.action-blue}"
    textColor: "{colors.action-blue-ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
    height: "40px"
    padding: "0 16px"
  button-primary-hover:
    backgroundColor: "{colors.action-blue-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    height: "40px"
    padding: "0 16px"
  button-secondary-hover:
    backgroundColor: "{colors.surface-sunken}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.action-blue}"
    rounded: "{rounded.sm}"
    height: "40px"
    padding: "0 16px"
  button-ghost-hover:
    backgroundColor: "{colors.action-blue-soft}"
  button-lg:
    height: "48px"
    padding: "0 22px"
  mic-button:
    backgroundColor: "{colors.action-blue}"
    textColor: "{colors.action-blue-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    width: "128px"
  mic-button-live:
    backgroundColor: "{colors.crit}"
    textColor: "#ffffff"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "9px 12px"
    height: "42px"
  tab:
    backgroundColor: "transparent"
    textColor: "{colors.ink-muted}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
    height: "34px"
    padding: "0 12px"
  tab-selected:
    backgroundColor: "{colors.action-blue-soft}"
    textColor: "{colors.action-blue}"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "16px"
  badge-ok:
    backgroundColor: "{colors.ok-soft}"
    textColor: "{colors.ok}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    height: "22px"
    padding: "0 8px"
  badge-warn:
    backgroundColor: "{colors.warn-soft}"
    textColor: "{colors.warn}"
    rounded: "{rounded.pill}"
    height: "22px"
    padding: "0 8px"
  badge-crit:
    backgroundColor: "{colors.crit-soft}"
    textColor: "{colors.crit}"
    rounded: "{rounded.pill}"
    height: "22px"
    padding: "0 8px"
  badge-info:
    backgroundColor: "{colors.info-soft}"
    textColor: "{colors.info}"
    rounded: "{rounded.pill}"
    height: "22px"
    padding: "0 8px"
  bubble-assistant:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-chat}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  bubble-user:
    backgroundColor: "{colors.action-blue-soft}"
    textColor: "{colors.ink}"
    typography: "{typography.body-chat}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
---

# Design System: Field Assistant

## Overview

**Creative North Star: "The Night-Shift Console"**

A working operations console for one live job, built to be read by a technician in a cold cab at 2 AM and by a dispatcher across the room. The conversation holds the centre; the facts dispatch needs (status, conditions, asset record, surroundings) are pinned in a sunken right rail beside it. The look is the professional dashboard the user asked for, played straight: a navy app bar with a single amber utility mark, cool tinted neutral grounds, white (or deep slate) panels with hairline borders, and one blue for action.

Density is moderate and legible rather than packed: 16px body, 0.875rem panel copy, generous 40px+ controls on the paths a gloved hand takes. Colour is quiet until it means something; ok, warn, crit and info tones appear only where they report state. Light and dark are first-class equals. Light serves projectors and daylight; dark serves night work, and the shell deepens rather than inverts so the app bar keeps its edge against the darker ground.

The system refuses the chatbot-in-a-card page and the KPI-tile dashboard: no hero metrics, no floating chat widget, no decorative colour.

**Key Characteristics:**
- Navy shell in both themes, amber reserved for the shell
- One action blue; semantic tones only on state
- Public Sans throughout, tabular numerals everywhere
- 10px panels, 1px borders, soft shadow that all but vanishes at night
- Conversation centre, 400px fact rail right, tabs below 900px
- Storm-window timeline as the signature data component

## Colors

Cool, desaturated slate neutrals carry almost every pixel; a navy shell frames them, one blue acts, and four semantic tones speak only when state changes. Each light token has a night counterpart (the `night-` keys) applied via `data-theme="dark"` or `prefers-color-scheme: dark`.

### Primary
- **Action Blue** (`action-blue`): primary buttons, the Tap-to-talk mic, switch-on tracks, selected tab and report-row text, ghost-button text, focus rings, text selection and caret. Its hover deepens (`action-blue-hover`) in light and brightens in dark. **Action Blue Wash** (`action-blue-soft`) backs the selected tab, selected report row, ghost hover, input focus halo, the report tips block, and the user's chat bubble.

### Secondary
- **Shell Navy** (`shell-navy`, night `night-shell-navy`): the 56px app bar only. **Raised Navy** (`shell-navy-raised`) is the job pill and hovered or active nav item. **Shell Text** and **Shell Muted** are the app bar's two ink levels.

### Tertiary
- **Utility Amber** (`utility-amber`): the 28px brand mark square (with `utility-amber-ink` glyph), the warn live-dot, and, at 18% alpha with `utility-amber-text`, the Scenario chip. It lives on the navy shell and nowhere else.

### Neutral
- **Tinted Ground** (`ground`): page and job-grid background.
- **Panel White** (`surface`): panels, tab bar, composer, inputs, assistant bubbles.
- **Sunken Slate** (`surface-sunken`): the right rail, hover fills, neutral badges.
- **Hairline** (`border`) and **Firm Hairline** (`border-strong`): panel and row dividers; input, secondary-button and switch-off strokes.
- **Ink** (`ink`), **Secondary Ink** (`ink-secondary`, panel titles and field labels), **Muted Ink** (`ink-muted`, meta, timestamps, source notes, placeholders).

### Semantic
- **Ok / Warn / Crit / Info** each pair a strong ink with a soft wash (`ok` + `ok-soft`, etc.). They map to dispatch status: Can stay in (ok), Conditional (warn), Remove (crit), Assessing (info).
- **Freeze** (`freeze`) tints at-or-below-freezing forecast periods on the timeline; **Mild** (`mild`) is the timeline's base track.

### Named Rules
**The Navy Shell Rule.** The app bar is navy in both themes. Dark mode deepens it (to `night-shell-navy`); it never flips to a surface colour.

**The One Blue Rule.** Action Blue is the only accent. It marks what can be done or what is selected, never decoration.

**The State-Only Tone Rule.** Ok, warn, crit and info appear only on badges, the dispatch status line, the narrow dispatch strip, weather alert boxes, error messages and the timeline. Always soft wash behind strong ink of the same tone; never a solid tone fill for body content.

**The Amber Stays Up Top Rule.** Utility Amber belongs to the shell (brand mark, Scenario chip, live-dot). Content grounds never use it; warnings in content use `warn`.

## Typography

**Display Font:** Public Sans Variable (with system-ui, Segoe UI, Roboto, sans-serif)
**Body Font:** Public Sans Variable
**Label/Mono Font:** none; labels use the same family

**Character:** US public-sector type, plain and civic. Hierarchy comes from weight steps (400, 550, 600, 650, 700) and modest size steps, never from a second family.

### Hierarchy
- **Display** (650, 2.25rem, 1, -0.02em): the current temperature readout only; its unit drops to 1rem/500 muted. Tightens to 1.875rem in the short-landscape rail.
- **Headline** (650, 1.5rem, 1.25, -0.015em): page titles ("Start a job"), with a 68ch muted lede beneath.
- **Title** (650, 1.25rem, -0.01em): field report document title. Asset name in the rail sits at 1.125rem bold.
- **Panel Title** (650, 0.875rem, secondary ink): panel headers, always preceded by a 16px muted icon.
- **Body** (400, 1rem, 1.5): base. **Chat Body** (0.9875rem, 1.55, pre-wrap) in bubbles, max min(720px, 92%) wide. **Small Body** (0.875rem) for panel copy, buttons, tabs, lists. Report fields run 0.9375rem at max 70ch.
- **Label** (600, 0.8125rem, secondary ink): form field labels, mic label, report field headings (650).
- **Caption** (0.75rem): message meta, source notes, badges (600), sub-heads (650, muted), fact terms.
- **Micro** (700, 0.6875rem, 16px line): timeline Now and alert marks; period labels at 400 muted.

### Named Rules
**The Tabular Everything Rule.** `font-feature-settings: 'tnum' 1` is set at the root. Temperatures, times, onset countdowns and IDs align without extra classes.

**The Sentence Case Rule.** Every heading, label, tab, button and badge is sentence case. No uppercase, no letter-spaced labels.

## Layout

An app shell of a sticky 56px app bar over a single content row. Two page types:

- **Pages** (home, field reports library): centred container, max 1240px, padding 28px 24px 48px. Home is a 1.5fr / minmax(320px, 1fr) grid; the library is a minmax(280px, 360px) list beside a fluid detail. Gaps 20px.
- **Job console**: full-height grid, fluid main column plus a 400px right rail (340px under 1100px). Main is a tab bar (Assistant / Field report, Finish action at the right end), the scrolling conversation, and a composer pinned to the bottom. The rail is sunken, scrolls independently and stacks panels at 16px gaps.

Spacing rhythm is 4px-based: 4, 8, 12, 16, 20, 24, 28, 48. Panel bodies pad 16px with 12px internal gaps; panel heads are at least 48px tall.

Responsive behaviour:
- **901px+ and height 820px or less** (landscape tablets): rail tightens (12px padding and gaps, 40px panel heads) so conditions stay above the fold.
- **900px and below**: single column. The rail becomes a third tab (Assistant / Site & asset / Report), a tone-coloured dispatch strip runs under the tabs, the composer stacks with a full-width 64px Tap-to-talk bar on top, the Finish label shortens, nav labels collapse to icons, and the org name drops.
- **520px and below**: brand name hides, fact rows stack.

## Elevation & Depth

Hybrid and restrained: panels sit on a tinted ground, outlined by a 1px hairline and lifted by a barely-there double shadow. In dark mode the shadow collapses to a single black hairline drop and borders plus tonal steps (ground, surface, sunken) do the work. Nothing floats; there are no modals, popovers or hover lifts.

### Shadow Vocabulary
- **Panel rest** (`box-shadow: 0 1px 2px rgb(16 32 56 / 0.06), 0 2px 8px rgb(16 32 56 / 0.05)`; night `0 1px 2px rgb(0 0 0 / 0.35)`): every panel.
- **Input focus halo** (`box-shadow: 0 0 0 3px var(--accent-soft)`): with an Action Blue border on focused fields.
- **Mic live pulse** (`box-shadow: 0 0 0 0 → 0 0 0 8px` crit at 35% to 0%, 1.6s): only while listening.
- **Job pill active** (`box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.18)`): pill when the job view is current.

### Named Rules
**The Border Carries Night Rule.** Never rely on shadow to separate surfaces; at night the shadow is nearly gone, so every container needs its 1px border or a tonal step.

## Shapes

Softly squared. Panels and chat bubbles round at 10px; buttons, inputs, tabs, status lines and alert boxes at 7px; the mic button at 14px so it reads as the one big object. Pills (999px) for the job pill, badges, the Scenario chip and switch tracks. Chat bubbles cut their speaker-side top corner to 4px (assistant top-left, user top-right) as a direction cue. Small marks use 2 to 6px (swatches, timeline track, Now and alert flags). Borders are always 1px; the only 2px line is the focus outline and the timeline's Now rule.

## Components

### Buttons
Plain, firm, and big enough for gloves.
- **Shape:** 7px radius, 40px tall, 0 16px padding, 0.875rem/600, 8px icon gap.
- **Primary:** Action Blue fill, white ink (dark ink at night). Hover deepens. One per region: Start job, Send, Finish job.
- **Secondary:** surface fill with a firm hairline; hover goes sunken. Used for Finish job once the report is saved.
- **Ghost:** transparent with blue text; hover gets the blue wash. Used for View all and Stop speaking.
- **Sizes:** small 30px (0.8125rem), large 48px (1rem). Disabled at 55% opacity, not-allowed cursor.
- **Hover / Focus:** 150ms ease-out colour transitions; global 2px focus outline offset 2px in the focus blue.

### Chips
- **Badges:** 22px pills, 0.75rem/600, soft-wash tone backgrounds with matching ink; neutral uses sunken slate and secondary ink.
- **Scenario chip:** amber at 18% on navy, amber text, shell only.

### Cards / Containers
- **Corner Style:** 10px.
- **Background:** Panel White (night surface).
- **Shadow Strategy:** panel rest shadow (see Elevation).
- **Border:** 1px hairline; header separated by a hairline.
- **Internal Padding:** head 0 16px, min 48px; body 16px with 12px gaps.

### Inputs / Fields
- **Style:** 42px min height, 9px 12px padding, 1px firm hairline, 7px radius, surface fill, 0.9375rem. Labels above at 0.8125rem/600 secondary ink, 6px gap.
- **Focus:** border turns Action Blue with a 3px blue-wash halo; caret is Action Blue.
- **Error / Disabled:** crit text at 0.8125rem below; error boxes are crit-soft with crit ink.
- **Switch:** 36x20 pill track, firm hairline grey off, Action Blue on, white 16px knob that slides on a 180ms cubic-bezier(0.2, 0.8, 0.2, 1).

### Navigation
- **App bar:** navy, 56px, sticky. Brand (amber square plus name and muted org), job pill (live-dot in dispatch tone, site and asset, Scenario chip), then right-aligned nav buttons (36px, 0.875rem/550, shell-muted; hover and active get raised navy and shell text), then a theme toggle.
- **Job tabs:** 34px, 0.875rem/600, muted; hover sunken; selected gets the blue wash and blue text. Disabled at 45%.

### Conversation
- Assistant bubbles: surface with hairline, 4px top-left corner. User bubbles: blue wash, 4px top-right, right-aligned. Live interim speech uses the user bubble in muted italic. Meta row above each (speaker name 650 secondary ink, time, replay icon). Thinking state is three 6px muted dots pulsing 1.2s.

### Tap-to-talk Mic (signature)
The biggest target on screen. 128px wide column beside the input on wide screens (icon over label), a full-width 64px bar under 900px. Action Blue at rest; crit red with a pulsing ring while listening; scales to 0.98 on press.

### Dispatch Status
A tone status line (7px, 650, timestamp right-aligned) on top, a 600-weight headline, muted rationale, then a "Tech needs" sub-head and list. Under 900px the same state repeats as a full-width tone strip under the tabs.

### Storm-window Timeline (signature)
A 44px track on the mild tint, forecast periods as segments separated by 1px surface lines with their temperature at 0.75rem/650; freezing periods tinted `freeze`; the alert window as a 6px crit band along the bottom; a 2px ink Now rule. Above the track: ink-filled "Now" flag and crit-soft alert flag (micro type). Below: period names, then a legend with 10px swatches.

## Do's and Don'ts

### Do:
- **Do** keep the app bar navy in both themes and deepen it at night.
- **Do** use Action Blue only for actions, selection, focus and the user's voice.
- **Do** pair every semantic tone as soft wash behind strong ink, and map dispatch states to ok / warn / crit / info.
- **Do** give every container a 1px border so it still separates when the night shadow disappears.
- **Do** keep glove-path controls 40px or taller (buttons 40, inputs 42, Tap-to-talk 64 when narrow).
- **Do** lead every panel title with a 16px muted line icon from the same set.
- **Do** cite the source under data panels in a 0.75rem muted note (Weather, Map).
- **Do** honour `prefers-reduced-motion`; all animation collapses to 1ms.

### Don't:
- **Don't** introduce a second accent colour or use amber on content grounds.
- **Don't** build KPI tiles or hero metric cards; facts live in panels as lists, fact rows and the timeline.
- **Don't** put the assistant in a floating chat card; the conversation is the main column.
- **Don't** use uppercase or letter-spaced labels; everything is sentence case.
- **Don't** add a second typeface or a display face; Public Sans carries all levels.
- **Don't** colour content with ok / warn / crit / info unless it reports state.
