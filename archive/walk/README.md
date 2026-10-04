# Archived: first-person "Walk" view

Removed from the app on 2026-10-03; the map/radar is the main way to play.
Nothing here is compiled or shipped.

- FirstPerson.tsx: the three.js first-person view
- world/: OSM block world, Google Photorealistic 3D Tiles loader, time-of-day sky
- data/cornell.json: campus geometry (was served from public/world/)
- build_world.py: regenerates cornell.json from OpenStreetMap

To restore: move the files back into src/ and public/world/, reinstall three, @types/three and
3d-tiles-renderer, and add the Walk tab back in App.tsx.
