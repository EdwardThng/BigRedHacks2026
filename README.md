# Big Red Dex: A Creature Hunt Across Cornell
## Big Red Hacks 2026 · Theme: Navigation

<!-- Add a screenshot or demo GIF here -->

## Inspiration
Most students walk the same few buildings for four years. Maps tell you how to get somewhere, but not why you'd go. I wanted navigation to feel like **exploration**: a reason to walk to Malott at 9pm or the clock tower at midnight, and to learn the campus along the way.

---

## How It Works
**Big Red Dex** is a location-based creature hunt. Creatures live at real spots on campus and in Collegetown, each tied to a Big Red Hacks sponsor, a Cornell club or a local favorite.

1. **Follow the clue**
   - Each creature has a riddle and a **warmer/colder** signal pointing you to its spot.
   - By day the map is a **Field Journal**; after sunset it flips to a **Radar**, following the real Ithaca sunset.
2. **Get close**
   - Walk into a creature's habitat and an alert pops up, then opens the encounter automatically.
3. **Catch it**
   - Face the creature in a full-screen **battle arena** themed after its company.
   - **Flick** the Big Red ball to throw. Catches are logged in your **Journal** with where and when.

---

## How I Built It
### Map & Navigation
- **React + TypeScript + Vite**, **Leaflet** on OpenStreetMap tiles, restyled per theme.
- On-device **geofencing**: the phone decides when you enter a zone, so GPS never streams to a server.
- **SunCalc** drives the day/night switch from the real sunrise and sunset.

### Spawns & Rarity
- Each creature has a time window plus a **per-20-minute spawn roll** (common → ultra rare), shared by every player so rare sightings are campus events.
- **Kiln (Anthropic)** has a six-try, three-state fight: dozing → awake → furious → escaped.

### Encounters
- Full-screen sponsor **logo arenas** that react to throws, misses and catches.
- Optional **Supabase** sync (anonymous auth, catches, visits); without it, progress stays on the device.

---

## Challenges I Faced
- **GPS is noisy for tight zones**
  - Laptop and indoor fixes are off by 30m or more, but catch rings are 25–35m.
  - **Solution**: count up to 20m of the phone's reported GPS error toward reaching a ring.
- **Camera AR felt flat**
  - Web AR can't anchor objects in the world on iPhone Safari. I tried a live camera backdrop and a compass-based camera search, but neither added much to the hunt.
  - **Solution**: dropped the camera and put the effort into full-screen sponsor arenas, so arriving at a spot leads straight into the battle.
- **I cut my own 3D view**
  - I built a first-person walk mode (OpenStreetMap buildings, Google 3D Tiles) but the map was clearer and more fun.
  - **Solution**: archived it (`archive/walk/`) and doubled down on the map and encounters.
- **Testing without walking across campus**
  - **Solution**: a demo mode that spawns everything, moves you by tapping the map, and can script an encounter.

---

## Accomplishments I'm Proud Of
- A day **Field Journal** and night **Radar** that switch with the real sun.
- **Sponsor-themed battle arenas** built from each company's logo.

---

## What's Next?
- **Club event creatures**: clubs drop limited-time creatures at their events.
- **Orientation quests**: a first-week route for new students.
- **Friends & raids**: catch rare creatures together at a set time and place.
- **Any campus**: new spots and creatures without code changes.

---

## Try it
Play it on your phone at **https://bigreddex.vercel.app**.

To run it locally:
```bash
npm install && npm run dev
```

## Demo video
[Big Red Hacks 2026 demo](https://youtu.be/hqPBTUIEI4s)
