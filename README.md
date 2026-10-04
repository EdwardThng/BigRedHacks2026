# Big Red Dex

A creature-collecting game for Cornell's campus, built for Big Red Hacks 2026 (theme: Navigation).
Six creatures live at real spots around campus and Collegetown. You find them by following
clues and a warmer/colder signal on the map, then catch them with a Big Red ball.

## How it plays

- **Day: Field Journal.** A paper-style map with watercolor habitat zones, "?" stamps and
  handwritten sighting notes. Each target gets a field note with its clue and distance.
- **Night: Radar.** After sunset the map flips to a dark radar. Creatures show up as signal blips
  that grow stronger as you get closer. The switch follows the real sunrise and sunset in Ithaca.
- **Rarity.** Common creatures appear throughout their window. Rare and ultra-rare ones have
  narrower windows and only a chance to spawn in each 20-minute slot, rolled the same for
  every player.
- **Journal.** Everything you catch is logged with where and when you found it.

| # | Creature | Inspired by | Spot | Rarity |
|---|---|---|---|---|
| 001 | Scryvern | Palantir | Malott Hall | Rare |
| 002 | Boostling | SpaceX | Engineering Quad | Rare |
| 003 | Pitchling | Cornell Entrepreneurship Club | eHub Collegetown | Common |
| 004 | Kiln | Anthropic | McGraw Tower | Ultra rare |
| 005 | Vaultling | Capital One | Day Hall | Common |
| 006 | Chilibao | Asian Chili Spot | Dryden Road | Common |

## Run it

```bash
npm install
npm run dev
```

Location needs HTTPS on phones, so test on a phone through a deployed link (for example Vercel).

Useful URL flags:

- `?demo`: every creature spawns, and tapping the map moves you (for recordings)
- `?time=0`: pin the clock to an hour (here midnight), which drives the theme and spawns
- `?theme=day` or `?theme=night`: force a map style

## Stack

React + TypeScript + Vite, Leaflet with OpenStreetMap tiles, SunCalc for sunrise/sunset.
Optional Supabase sync (anonymous auth, catches and habitat visits) when `VITE_SUPABASE_URL`
and `VITE_SUPABASE_ANON_KEY` are set; see `supabase/schema.sql` and `.env.example`.
Without them the game keeps progress on the device.

`archive/walk/` holds an earlier first-person 3D view that was cut; it is not built or shipped.
