"""Build public/world/cornell.json from OpenStreetMap for the first-person view.

Usage: python3 scripts/build_world.py [osm.json]
Without an argument it downloads the campus + Collegetown area from Overpass.
Coordinates are converted to metres around ORIGIN: x = east, z = south.
"""

import json
import math
import os
import sys
import urllib.parse
import urllib.request

ORIGIN = (42.4458, -76.4835)  # keep in sync with src/world/geo.ts
BBOX = "42.4385,-76.4920,42.4515,-76.4740"
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "world", "cornell.json")

QUERY = f"""[out:json][timeout:60];(
way["building"]({BBOX});
way["highway"]({BBOX});
way["leisure"~"park|pitch|garden"]({BBOX});
way["landuse"~"grass|recreation_ground|forest|meadow"]({BBOX});
way["natural"~"water|wood"]({BBOX});
way["waterway"]({BBOX});
);out geom tags;"""

ROAD_WIDTH = {
    "primary": 10, "secondary": 9, "tertiary": 8, "residential": 7, "unclassified": 7,
    "service": 4.5, "pedestrian": 7, "footway": 2.6, "path": 2.2, "cycleway": 2.6,
    "steps": 2.4, "living_street": 6, "track": 3,
}
DEFAULT_HEIGHT = {"house": 8, "garage": 3, "shed": 3, "roof": 4, "apartments": 15, "dormitory": 15, "church": 18}

M_PER_DEG_LAT = 110_540
M_PER_DEG_LNG = 111_320 * math.cos(math.radians(ORIGIN[0]))


def to_xz(lat: float, lng: float) -> list[float]:
    return [round((lng - ORIGIN[1]) * M_PER_DEG_LNG, 1), round(-(lat - ORIGIN[0]) * M_PER_DEG_LAT, 1)]


def height(tags: dict) -> float:
    for key in ("height", "building:height"):
        try:
            return float(str(tags[key]).split()[0])
        except (KeyError, ValueError):
            pass
    try:
        return float(tags["building:levels"]) * 3.6 + 1
    except (KeyError, ValueError):
        return DEFAULT_HEIGHT.get(tags.get("building", ""), 12)


def main() -> None:
    if len(sys.argv) > 1:
        data = json.load(open(sys.argv[1]))
    else:
        req = urllib.request.Request(
            "https://overpass-api.de/api/interpreter",
            data=urllib.parse.urlencode({"data": QUERY}).encode(),
            headers={"User-Agent": "bigreddex-hack/0.1"},
        )
        with urllib.request.urlopen(req, timeout=120) as r:
            data = json.load(r)

    buildings, roads, areas = [], [], []
    for el in data["elements"]:
        geom = el.get("geometry")
        if not geom:
            continue
        pts = [to_xz(p["lat"], p["lon"]) for p in geom]
        tags = el.get("tags", {})
        if "building" in tags:
            if len(pts) >= 4:
                buildings.append({"p": pts[:-1] if pts[0] == pts[-1] else pts, "h": round(height(tags), 1), "n": tags.get("name", "")})
        elif "highway" in tags:
            kind = tags["highway"]
            if kind in ROAD_WIDTH:
                roads.append({"p": pts, "w": ROAD_WIDTH[kind], "k": "foot" if kind in ("footway", "path", "steps", "pedestrian", "cycleway") else "road"})
        elif "waterway" in tags:
            roads.append({"p": pts, "w": 5 if tags["waterway"] in ("stream", "river") else 2, "k": "water"})
        else:
            kind = "water" if tags.get("natural") == "water" else "wood" if tags.get("natural") == "wood" or tags.get("landuse") == "forest" else "grass"
            if len(pts) >= 4:
                areas.append({"p": pts, "k": kind})

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as f:
        json.dump({"origin": ORIGIN, "buildings": buildings, "roads": roads, "areas": areas}, f, separators=(",", ":"))
    print(f"{len(buildings)} buildings, {len(roads)} paths, {len(areas)} areas → {os.path.relpath(OUT)} ({os.path.getsize(OUT)//1024} KB)")


if __name__ == "__main__":
    main()
