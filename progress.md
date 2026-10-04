# Big Red Dex: Progress Log

Detailed record of what has been built, decided and cut, for Big Red Hacks 2026 (theme: Navigation).
Judging: Sunday 2026-10-04, 9am. Repo: `EdwardThng/BigRedHacks2026` (branch `main`).

---

## 1. Ideation (2026-10-03)

| Idea | Outcome | Why |
|---|---|---|
| Wayfinder: indoor navigation from a floor-plan photo | Dropped | Indoor navigation for sighted users didn't solve a real enough need |
| Shopping "navigator" for best deals | Dropped | Weak fit with the theme, crowded space, scraping is fragile |
| Hillside: hill- and stair-aware campus routing | Considered | Real but niche audience |
| Homeward: guidance for people with dementia | Considered | Strong need, not the direction chosen |
| **Cornell creature hunt (Pokémon Go-style)** | **Chosen** | Strong fit with "Exploration & Discovery", fun to demo, Cornell-specific |

Name: **Big Red Dex**.

---

## 2. What's built

### 2.1 Map (day Field Journal / night Radar)
- Leaflet + OpenStreetMap tiles, restyled with CSS filters per theme.
- **Theme switch** follows the real sunrise/sunset in Ithaca (SunCalc). The header shows the next switch time. Override with `?theme=day|night`.
- **Day, Field Journal:** sepia paper map, blurred watercolor habitat zones, dashed "?" stamps for uncaught creatures, framed portraits for caught ones, small-caps spot labels, handwritten sighting notes (Caveat font), rarity tags ("uncommon", "rare!", "ultra rare!!"). The clue appears as a field-note card with distance and a warmer/colder word.
- **Night, Radar:** inverted dark map, radar rings with a rotating sweep around the player, creatures as signal blips sized by distance (WEAK, MEDIUM, STRONG, LOCKED), dormant creatures dimmed, caught ones marked "× LOGGED", and a signal card with 4-bar strength.
- Zoomed out, only the selected spot keeps its note and label, because Malott, Day Hall and McGraw Tower are close together.
- Controls: "show every spot" and "center on me" (follow mode). Habitat zones let taps through so demo teleport works inside them.
- GPS chip with accuracy (±m) and clear blocked/unavailable states.

### 2.2 Spawns & rarity
- Each creature has a **time window** and a **spawn chance per 20-minute slot**: common 100%, uncommon 60%, rare 35%, ultra rare 12%.
- The roll is seeded by creature and slot, so **every player sees the same spawns** and a rare sighting is a shared event.
- **Catch check:** distance ≤ catch radius + min(GPS accuracy, 20m).

### 2.3 Encounter flow
1. **Alert:** entering a catch ring pops a themed alert (day: taped paper note; night: "SIGNAL LOCKED" panel). It vibrates where the browser supports it, then opens the encounter after a **3-second countdown**. "Not now" mutes it until you leave the ring.
2. **Battle screen:** live **rear camera** (`getUserMedia`, `facingMode: environment`) with a camera toggle. If the camera is blocked or unavailable, a drawn backdrop shows instead. The header and styling are themed for day or night.
3. **Throw:** flick the Big Red ball up (or tap). The ball flies in, shakes 3 times on a catch, or 1–2 times before "It broke free!" on a miss.
4. **Result card:** journal card (day) or signal-log card (night) with **brand name** as the headline, the creature as subtitle, lore, and Keep exploring / Open Journal.

### 2.4 Kiln (Anthropic): three-state encounter
| Tries | State | Look and behavior | Catch rate |
|---|---|---|---|
| 1–3 | Dozing | Curled up asleep on a cushion, third eye open | 25% |
| 4–5 | Awake | Sitting up, flat half-lids, pale glowing third eye, dodges side to side | 15% |
| 6 | Furious | Wings spread, red eyes, glowing cracks, smoking horns, shaking. Last chance. | 30% |
| a miss on try 6 | Escaped | Flies off; escaped card; stays away for 3 hours | none |

- Overall catch chance across all six tries is about 79%. Rates are placeholders in `src/data/creatures.ts`.
- A try tracker groups Dozing 1–3 / Awake 4–5 / Furious 6. Transformations flash, and the switch to furious shakes the screen.
- Art follows the team's design sheets ("Kiln Dozing", "State 2 · Awake", "State 3 · Furious").

### 2.5 Battle arenas (themed per creature)
| Creature | Arena | Reacts to |
|---|---|---|
| Palantir (Scryvern) | Dark field, giant Palantir symbol in white with cyan glow, rippling rings, wordmark, cyan backlight | Throw flare, break-free shudder, catch glow |
| Anthropic (Kiln) | Wordmark "kiln": ivory (dozing) → amber (awake) → red-hot with embers (furious); tiled wordmark drifts faster as it escalates | Throws, misses, catch, and Kiln's state |
| SpaceX (Boostling) | Deep space, Earth's glowing limb, orbit trail, white X-and-swoosh, wordmark | Orange engine-burn flare on throw |
| Capital One (Vaultling) | Bright vault, logo in its real colors, vault-door rings, falling gold coins | Dial turns per throw, spins on catch |
| CEC (Pitchling) | "Prism": cream/blush, two rotating multicolor triangle outlines, rising facet triangles, logo as a sticker badge | Triangles spin fast on throw, swell on catch |
| Asian Chili Spot (Chilibao) | Deep red with flickering flames, embers and a pulsing heat glow | Flames roar up on throw |

The camera stays faintly visible under each arena; when the camera is off, the arena fills the screen.

### 2.6 Journal (day) / Signal Log (night)
- **Day:** two-column taped specimen cards. Catches show art, brand, creature name and a handwritten "where, when" note. Uncaught creatures are dashed "Unknown" cards with spot and window.
- **Night:** dark list with a segmented progress meter. Each entry shows ACTIVE NOW / DORMANT live status and rarity.
- Entry details open in the matching style. Tabs read Map / Journal by day and MAP / LOG at night.

### 2.7 Creatures

| # | Brand (creature) | Inspired by | Spot | Coordinates | Rarity | Window | Catch / habitat radius |
|---|---|---|---|---|---|---|---|
| 001 | Palantir (Scryvern) | Palantir | Malott Hall | 42.44819, -76.48019 | Rare | 9pm–midnight | 25 / 45 m |
| 002 | SpaceX (Boostling) | SpaceX | Engineering Quad | 42.44468, -76.48369 | Rare | 8–11am | 35 / 60 m |
| 003 | CEC (Pitchling) | Cornell Entrepreneurship Club | eHub Collegetown (409 College Ave) | 42.44235, -76.48499 | Common | 9am–10pm | 25 / 40 m |
| 004 | Anthropic (Kiln) | Anthropic | McGraw Tower | 42.44757, -76.48504 | Ultra rare | 11pm–1am | 25 / 40 m |
| 005 | Capital One (Vaultling) | Capital One | Day Hall | 42.44718, -76.48311 | Uncommon | 9am–5pm | 25 / 40 m |
| 006 | Asian Chili Spot (Chilibao) | Asian Chili Spot | Dryden Road | 42.44171, -76.48455 | Common | 11am–11pm | 25 / 40 m |

Art is hand-built vector (`src/CreatureArt.tsx`) in a soft-blob, dot-eye style:
- **Scryvern:** a dark dragon (a nod to Zekrom) with a cyan seeing stone and ringed tail.
- **Boostling:** a little rocket.
- **Pitchling:** CEC's faceted triangle with its face in the hollow.
- **Kiln:** three forms, from the team's design sheets.
- **Vaultling:** a navy vault.
- **Chilibao:** a red chili.

A PNG at `public/creatures/<id>.png` overrides any creature's art.

### 2.8 Backend (optional)
- Supabase schema in `supabase/schema.sql`: `profiles`, `catches` (with location and accuracy), `visits` (habitat entries), row-level security, and an auth trigger.
- `src/lib/supabase.ts`: anonymous sign-in, merge server and local catches, upload offline catches, log habitat visits. It is disabled unless `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set; local storage is always the fallback.
- **Not configured yet.**

---

## 3. Demo & testing flags
| Flag | Effect |
|---|---|
| `?demo` | All creatures spawn; tap the map to move; escape cooldown ignored |
| `?time=H` | Pin the clock to hour H (drives theme and spawns) |
| `?theme=day` / `?theme=night` | Force the map style |
| `?demo&encounter=<id>` | Open an encounter immediately (ids: `scryvern`, `boostling`, `pitchling`, `kiln`, `vaultling`, `chilibao`) |
| `&misses=N` | Script the run: N misses, then a sure catch (`kiln` with `misses=5` shows every state; `misses=6` shows the escape) |
| `?sure=<id>` | Real-GPS test run: that creature is always out, the first throw catches it, and its saved catch/escape is cleared on every load |
| `?fresh` | Clear every saved catch and escape timer on load |

Recording recipes:
- Day map: `?demo&time=10`
- Night map: `?demo&time=0`
- Full Kiln fight: `?demo&time=23&encounter=kiln&misses=5`

---

## 4. Cut or archived
- **First-person "Walk" view:** three.js world from OpenStreetMap (879 buildings, paths, lawns), pixelated rendering, real sun/moon/stars by time of day, creature sprites with a "!" notice, and an optional Google Photorealistic 3D Tiles mode. It was cut in favor of the map and archived in `archive/walk/` (not built or shipped).
- **Original creature roster** (Flyerling, Tomemoth, Bytewing, Gearhorn, Snoozle): replaced by sponsor, club and local creatures.
- **Monolurk** (scary clay cube): replaced by Kiln from the team's design.
- **Gemini-generated art:** the generator script (`scripts/gen_art.py`) exists, but the API key had no image quota, so the art is hand-built.

---

## 5. Design & docs
- Claude Design canvas (private): https://claude.ai/artifact/SMLf1cmcpGL6ocuQKhJJFN. Pages: creatures and system architecture, map direction options, day & night UI, encounter screens.
- System architecture and load/roadmap boards are on the canvas. Key point: geofencing on-device means the database only sees zone entries and catches.

---

## 6. Assets & credits
- Map data © OpenStreetMap contributors.
- Logos in `public/logos/` (see its README): Palantir, Anthropic, SpaceX and Capital One from Wikimedia Commons, unmodified apart from cropping, spacing and white inversion on dark arenas. The CEC logo was provided by the team. All are trademarks of their owners, used to credit sponsors and clubs.
- Encounter mockup photos on the canvas: Wikimedia Commons (P. Hughes, CC BY 4.0; Notyourbroom, CC BY 3.0).

---

## 7. Open items
- [ ] **Deploy** (e.g. Vercel). Phones need HTTPS for camera and GPS, so the live camera and real GPS are untested on a phone.
- [ ] Confirm the **eHub Collegetown** location (set to the Student Agencies Building, 409 College Ave).
- [ ] Higher-resolution **CEC logo** (current file is 78×92 px) at `public/logos/cec.png`.
- [ ] Check with the **Palantir and Anthropic** reps (and other sponsors) about logo use.
- [ ] Tune **Kiln catch rates** (placeholders).
- [ ] Optional: configure **Supabase** for cross-device progress.
- [ ] Update the **creature lineup** on the design canvas (still shows the original roster).
- [ ] Add a screenshot or GIF and the **Devpost link** to the README.

---

## 8. Commit history
| Commit | Change |
|---|---|
| `f749757` | Initial game: map, catch flow, Journal, Supabase scaffolding, archived Walk view |
| `be88778` | Journal follows the day/night theme |
| `6881ded` | Live-camera encounters, proximity alert, Kiln design |
| `0026f1b` | Kiln's three-state encounter (dozing, awake, furious, escape) |
| `721e42a` | Sponsor names; Palantir and Anthropic logo arenas |
| `a46d1bc` | SpaceX, Capital One, CEC arenas; Capital One becomes Uncommon |
| `7875468` | README: Capital One is Uncommon |
| `4c9cc25` | CEC creature and Prism arena; Asian Chili Spot flame arena |
