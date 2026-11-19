"""Make the app icons and link-preview images for every D&D Toolbox site (STYLE.md 6h).

Writes shared/images/<repo>/: icon-192.png, icon-512.png, maskable-512.png, apple-touch-icon.png (180),
favicon-32.png, og.png (1200x630) and manifest.webmanifest. Each site copies its folder's files to
site/icons/ (the icons and favicon), site/og.png and site/manifest.webmanifest.

Run:  python tools/make_images.py   (needs Playwright + Chromium, like smoke_test.py). Re-run after
changing a site's name, blurb or glyph below; the output is committed.
"""
import json
from pathlib import Path

HUB = Path(__file__).resolve().parents[1]
OUT = HUB / "shared" / "images"

# repo: (name, short name, blurb, glyph paths in a 32x32 box) -- glyphs are the hub cards' icons
SITES = {
    "dnd": ("D&D Toolbox", "D&D Toolbox", "Free helper tools for D&D 5e, 2014 and 2024 rules: build characters, plan spells, look up rules, monsters and items.",
            '<path d="M16 2l11 7v14l-11 7-11-7V9z" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/><path d="M16 10l5.5 3.3v6.4L16 23l-5.5-3.3v-6.4z"/>'),
    "dnd-multiclass-planner": ("Multiclass Planner", "Multiclass", "Plan a multiclass build of up to three classes, level by level, for 2014 or 2024 rules.",
            '<path d="M16 3l3.5 8.5L28 13l-6.5 6 1.8 9L16 23.5 8.7 28l1.8-9L4 13l8.5-1.5z"/>'),
    "dnd-magic": ("Spell Planner", "Spells", "Browse every class and subclass spell list, then pick and rank the spells you want.",
            '<path d="M14 3c1 6.5 4.5 10 11 11-6.5 1-10 4.5-11 11-1-6.5-4.5-10-11-11 6.5-1 10-4.5 11-11z"/><path d="M25 19c.5 3 2 4.5 5 5-3 .5-4.5 2-5 5-.5-3-2-4.5-5-5 3-.5 4.5-2 5-5z"/>'),
    "dnd-feats": ("Feats & Origins", "Feats", "Feats, species and backgrounds for 2014 and 2024 in one searchable place.",
            '<path d="M16 3l3.2 6.6 7.3 1-5.3 5.1 1.3 7.2L16 19.5l-6.5 3.4 1.3-7.2-5.3-5.1 7.3-1z"/><path d="M8 26h16v3H8z"/>'),
    "dnd-druid-wildshapes": ("Wild Shape Beast List", "Wild Shape", "Every beast a druid can become, filtered by level for standard and Circle of the Moon druids.",
            '<path d="M20 4a12 12 0 1 0 8 20A10 10 0 0 1 20 4z"/>'),
    "dnd-items": ("Item Finder", "Items", "Magic items and gear, searchable by type, rarity, attunement and source book.",
            '<path d="M16 2l11 7v14l-11 7-11-7V9z"/>'),
    "dnd-rules": ("Rules Reference", "Rules", "A fast, searchable quick reference for the table: conditions, actions, combat and more.",
            '<path d="M2 7c4.7-1.3 9.4-.7 14 2.2C20.6 6.3 25.3 5.7 30 7v18c-4.7-1.3-9.4-.7-14 2.2C11.4 24.3 6.7 23.7 2 25z"/>'),
    "dnd-monsters": ("Monster Lookup", "Monsters", "Every creature in the free SRDs with full stat blocks, and an encounter builder.",
            '<path d="M6 3c4 7 5 16 2 26h3c3-10 2-19-5-26zM14 2c4 8 5 17 2 28h3c3-11 2-20-5-28zM22 3c4 7 5 16 2 26h3c3-10 2-19-5-26z"/>'),
}
BG, SURF, INK, MUTED, GOLD, ACCENT, LINE = "#12171a", "#1a2125", "#e8ece6", "#8d9a93", "#d9b84a", "#6fbf95", "#2a343a"
FONTS = '<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700&family=Inter:wght@500&display=swap" rel="stylesheet">'
esc = lambda s: s.replace("&", "&amp;").replace("<", "&lt;")


def icon_html(glyph, size, pad):
    # pad = share of the canvas kept clear (maskable icons need a 20% safe margin each side)
    g = int(size * (1 - 2 * pad) * 0.62)
    radius = 0 if pad >= 0.1 else int(size * 0.22)
    return f"""<html><body style="margin:0;background:transparent">
<div style="width:{size}px;height:{size}px;background:{BG};border-radius:{radius}px;display:grid;place-items:center">
<svg viewBox="0 0 32 32" width="{g}" height="{g}" style="color:{GOLD};fill:{GOLD}">{glyph}</svg></div></body></html>"""


def og_html(name, blurb, glyph, hub):
    return f"""<html><head>{FONTS}</head><body style="margin:0">
<div style="width:1200px;height:630px;box-sizing:border-box;background:{BG};color:{INK};padding:84px 96px;font-family:Inter,sans-serif;display:flex;flex-direction:column;justify-content:space-between;border-bottom:14px solid {GOLD}">
 <div style="display:flex;align-items:center;gap:22px;color:{MUTED};font-size:30px;font-weight:500">
  <svg viewBox="0 0 32 32" width="40" height="40" style="fill:{GOLD}"><path d="M16 2l11 7v14l-11 7-11-7V9z"/></svg>D&amp;D Toolbox{'' if hub else ' &middot; wernercd.github.io'}</div>
 <div style="display:flex;align-items:center;gap:56px">
  <div style="flex:0 0 200px;height:200px;border-radius:44px;background:{SURF};border:2px solid {LINE};display:grid;place-items:center">
   <svg viewBox="0 0 32 32" width="124" height="124" style="color:{GOLD};fill:{GOLD}">{glyph}</svg></div>
  <div><div style="font-family:Fraunces,serif;font-weight:700;font-size:84px;line-height:1.02;letter-spacing:-.01em">{esc(name)}</div>
   <div style="font-size:33px;line-height:1.35;color:{MUTED};margin-top:20px;max-width:760px">{esc(blurb)}</div></div>
 </div>
 <div style="font-size:26px;color:{ACCENT}">Free &middot; 2014 and 2024 rules &middot; works offline</div>
</div></body></html>"""


def main():
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch()
        page = b.new_page()
        for repo, (name, short, blurb, glyph) in SITES.items():
            d = OUT / repo
            d.mkdir(parents=True, exist_ok=True)
            for fname, size, pad in (("icon-192.png", 192, 0.04), ("icon-512.png", 512, 0.04), ("maskable-512.png", 512, 0.2),
                                     ("apple-touch-icon.png", 180, 0.12), ("favicon-32.png", 32, 0.0)):
                page.set_viewport_size({"width": size, "height": size})
                page.set_content(icon_html(glyph, size, pad))
                page.screenshot(path=str(d / fname), omit_background=True)
            page.set_viewport_size({"width": 1200, "height": 630})
            page.set_content(og_html(name, blurb, glyph, repo == "dnd"), wait_until="networkidle")
            page.screenshot(path=str(d / "og.png"))
            man = {
                "name": name if repo == "dnd" else f"{name} - D&D Toolbox", "short_name": short, "description": blurb,
                "start_url": "./", "scope": "./", "display": "standalone", "background_color": BG, "theme_color": BG,
                "icons": [{"src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png"},
                          {"src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png"},
                          {"src": "icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}],
            }
            (d / "manifest.webmanifest").write_text(json.dumps(man, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
            print("made", d.relative_to(HUB))
        b.close()


if __name__ == "__main__":
    main()
