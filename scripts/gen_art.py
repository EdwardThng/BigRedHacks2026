"""Generate Big Red Dex creature art with Gemini.

Usage: GEMINI_API_KEY=... python3 scripts/gen_art.py [creature_id ...]

The first creature is generated from text alone; the rest also get it as a
style reference so the set looks consistent. White backgrounds are flood-filled
to transparent and the result is saved to public/creatures/<id>.png.
"""

import base64
import io
import json
import os
import sys
import urllib.error
import urllib.request
from collections import deque

from PIL import Image

MODEL = os.environ.get("GEMINI_IMAGE_MODEL", "gemini-3.1-flash-image")
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "creatures")
RAW = os.path.join(os.path.dirname(__file__), "..", "art-raw")

STYLE = (
    "Official-style collectible monster creature art in the style of modern Pokemon key art: "
    "a single cute, chunky, appealing creature, full body, facing three-quarter toward the viewer, "
    "clean bold outlines, soft cel shading, vibrant but harmonious colors, big expressive eyes. "
    "Centered with generous margin, on a perfectly plain pure white (#FFFFFF) background. "
    "No text, no logos, no border, no ground shadow, no scenery."
)

CREATURES = {
    "flyerling": (
        "Flyerling, a Social-type creature from Cornell's Ho Plaza. A round, golden-yellow paper-craft "
        "creature whose body is made of overlapping club flyers and quarter-sheets in cream and Cornell red, "
        "with a pushpin crest on its head. It eagerly holds out a flyer in one little paw, cheerful and a bit pushy."
    ),
    "tomemoth": (
        "Tomemoth, a Scholar-type moth creature from Cornell's Uris Library. Fluffy plum-purple body, "
        "large wings made of antique yellowed book pages with faint handwriting, feathery gold antennae, "
        "tiny round reading glasses, gentle sleepy-wise expression, a few glowing dust motes around it."
    ),
    "bytewing": (
        "Bytewing, a Digital-type creature from Cornell's computing building. A small teal-and-mint dragon-bat "
        "with pixelated, glitching square wings, a glowing visor-like band across its eyes showing a '</>' symbol, "
        "a tail ending in a blinking cursor, holding a tiny coffee cup. Mischievous late-night energy."
    ),
    "gearhorn": (
        "Gearhorn, an Engineer-type creature from Cornell's Engineering Quad. A sturdy little rhino-like beast "
        "in Cornell red with a steel-grey spinning gear for a horn, rivets on its shoulders, tiny hard-hat, "
        "stubby legs, determined and slightly sleep-deprived expression."
    ),
    "snoozle": (
        "Snoozle, a Cozy-type creature from Collegetown. A soft pastel-blue round blob creature wrapped in a "
        "pink quilted blanket like a cape, eyes peacefully half-closed, little nightcap, holding a tiny glowing "
        "lantern, with a few tiny sleepy stars floating above its head."
    ),
}


def call_gemini(prompt: str, reference: bytes | None) -> bytes:
    key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not key:
        sys.exit("Set GEMINI_API_KEY")
    parts: list[dict] = []
    if reference:
        parts.append({"inline_data": {"mime_type": "image/png", "data": base64.b64encode(reference).decode()}})
        prompt = (
            "Use the attached creature only as a STYLE reference (line weight, shading, rendering, proportions); "
            "draw a completely different creature:\n" + prompt
        )
    parts.append({"text": prompt})
    body = {
        "contents": [{"parts": parts}],
        "generationConfig": {"responseModalities": ["IMAGE"], "imageConfig": {"aspectRatio": "1:1"}},
    }
    req = urllib.request.Request(
        f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "x-goog-api-key": key},
    )
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            data = json.load(r)
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"Gemini {e.code}: {e.read().decode()[:400]}") from None
    for cand in data.get("candidates", []):
        for part in cand.get("content", {}).get("parts", []):
            inline = part.get("inlineData") or part.get("inline_data")
            if inline:
                return base64.b64decode(inline["data"])
    raise RuntimeError(f"No image returned: {json.dumps(data)[:400]}")


def remove_white_background(png: bytes, tolerance: int = 28) -> Image.Image:
    """Flood-fill near-white pixels from the edges to transparent, keeping white inside the creature."""
    img = Image.open(io.BytesIO(png)).convert("RGBA")
    w, h = img.size
    px = img.load()

    def is_bg(x: int, y: int) -> bool:
        r, g, b, _ = px[x, y]
        return r > 255 - tolerance and g > 255 - tolerance and b > 255 - tolerance

    seen = bytearray(w * h)
    q = deque((x, y) for x in range(w) for y in (0, h - 1))
    q.extend((x, y) for y in range(h) for x in (0, w - 1))
    while q:
        x, y = q.popleft()
        i = y * w + x
        if seen[i] or not is_bg(x, y):
            continue
        seen[i] = 1
        px[x, y] = (255, 255, 255, 0)
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx]:
                q.append((nx, ny))

    # Crop to content with a small margin, then pad to square.
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
    side = int(max(img.size) * 1.08)
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.paste(img, ((side - img.width) // 2, (side - img.height) // 2))
    return square.resize((512, 512), Image.LANCZOS)


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(RAW, exist_ok=True)
    wanted = sys.argv[1:] or list(CREATURES)
    ref_path = os.path.join(RAW, "flyerling.png")
    reference = open(ref_path, "rb").read() if os.path.exists(ref_path) else None

    for cid in wanted:
        print(f"Generating {cid} with {MODEL}…", flush=True)
        use_ref = reference if cid != "flyerling" else None
        raw = call_gemini(f"{STYLE}\n\n{CREATURES[cid]}", use_ref)
        with open(os.path.join(RAW, f"{cid}.png"), "wb") as f:
            f.write(raw)
        if cid == "flyerling":
            reference = raw
        remove_white_background(raw).save(os.path.join(OUT, f"{cid}.png"), optimize=True)
        print(f"  saved public/creatures/{cid}.png", flush=True)


if __name__ == "__main__":
    main()
