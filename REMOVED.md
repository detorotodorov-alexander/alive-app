# Removed from Alive, and how to bring it back

Current screen: the title text on top, the web fixed behind it, the cards in front (resting at the bottom). Scrolling the
cards up covers the web and the title, which blur and fade as they pass. The web's nodes still take taps; wheel and drag
gestures that start on the web or title are forwarded to the scroller.

## Hidden for now (still in `index.html`)

The screen is only: title, web, cards, record button. Everything below is hidden by CSS. Delete the selector to bring it back.

| What | Hidden by | Notes |
|------|-----------|-------|
| **Patterns / insights group** ("Patterns" heading, "Find my patterns" button, and the Overview / Mood / Themes / Patterns / Toward purpose / Next steps cards) | `.blk` | Logic untouched (`claudeInsights`, `localInsights`, `renderInsights`). Markup is the first `.blk` in `#scroller`. |
| **Time-capsule switch** (the "Seal next entry as a time capsule +" pill and its date row) | `.blk` (it is `.blk.capblk`) | Without it no new capsule can be armed. Existing sealed cards still work. |
| "Sealed until…" note above the record button | `.armed` | Shows when a capsule is armed. |
| **"Alive" logo and the settings gear** (the whole top bar) | `.topbar` | Settings is still reachable: **press and hold the title for ~0.7 s**. |
| The web's caption "Your web" and its subtitle sentence | `#webLayer .hub-title`, `#webLayer .hub-sub` | They'd sit on top of the headline. |
| The "less … more" colour scale under the web | `#web .legend.scale` | The empty-state message ("Speak for a few days…") is not hidden. |

The `.blk, .armed, .topbar` rule sits right after the scroller pass-through rules in the CSS.

## Hidden permanently (still in `index.html`)

| What | Hidden by | Notes |
|------|-----------|-------|
| *(nothing yet; the web caption and colour scale are listed above)* | | |

## Removed earlier (gone from the page)

| What | Where it went / how to restore |
|------|--------------------------------|
| Bottom tab bar (Speak / Journal / Insights) | Deleted. The v1 snapshot has it: `archive/v1-voice-journal/index.html`. |
| "Journal" button in the middle of the ring and the full-screen journal overlay | Deleted when the cards moved onto the home screen. |
| The background **ring** (blurred on one side, variable blur) | Removed from the shader; rebuild on request (tilted ellipse, sharp bright edge, outward smear that breathes, voice makes it swell). |
| The old orb | Replaced by the ring, then removed. In `archive/v1-voice-journal/index.html`. |
| Onboarding (void, rising morphing bubble, letter-by-letter "Your life is happening while you're busy getting through it.") | Built, then undone on request. Not saved anywhere; rebuild on request. The bubble's question became the first prompt. |
| Small round button beside the record button, and the **pop-up sheet** it opened (web, insights, time capsule) | Deleted when those moved into the page. The sheet's styles (`#hub`) are still in the CSS, unused. |
| Play button and progress ring on the cards | Deleted. Playback still exists in the reader (tap a card). |
| "min" label after the card duration | Deleted. |
| Waveform ticks on the cards | Replaced by per-type gauges (Mood / People / Plan / Work / Voice). The waveform is still in the reader. |
| "Ready" status text | Not shown when idle. "Listening" / "Transcribing" still show. |
| Journal cards as full-width text blocks with key points, tags and delete | Replaced by the squircle cards; those details live in the reader sheet. |
| "Minimal mode" (only the web over the cards, no title/logo/patterns/capsule) | Tried, then undone on request. |

## Where things live in `index.html`

- Cards: `cardEl`, `uiFor`, `keywordsOf`, `renderEntries`
- Reader (transcript + playback): `renderReader`, `openReader`, `paintReader`
- Web: `buildWeb`, markup in `#webLayer`
- Scroll layout and bottom-resting stack: `layout`, `restTop`, `scrollToRest`
- Patterns block: `.blk` (second one) in the scroller; time-capsule switch: `.blk.capblk`. Both sit above the cards, off-screen at rest, and
  slide in when you scroll up.
