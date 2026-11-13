"""Check every D&D Toolbox site: local repo clean and pushed, last deploy green,
live pages up, and the shared header/footer/CSS/theme matching shared/.

Run from anywhere:  python Y:/Dev/GitHub/dnd/tools/check_sites.py
Exit code 0 = all OK, 1 = something to fix (printed as FAIL lines).
"""
import json, re, subprocess, sys, urllib.request
from pathlib import Path

HUB = Path(__file__).resolve().parents[1]
ROOT = HUB.parent
SITES = ["dnd", "dnd-druid-wildshapes", "dnd-items", "dnd-multiclass-planner"]
BASE = "https://wernercd.github.io/"
UA = {"User-Agent": "dnd-toolbox-check/1"}

fails = []
def ok(site, what): print(f"  ok   {what}")
def bad(site, what): print(f"  FAIL {what}"); fails.append(f"{site}: {what}")

def run(args, cwd):
    r = subprocess.run(args, cwd=cwd, capture_output=True, text=True, encoding="utf-8")
    return r.returncode, r.stdout.strip()

def fetch(url):
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=20) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except Exception as e:
        return getattr(e, "code", 0) or 0, ""

def shared_block(css):
    m = re.search(r"/\* === dnd-shared v[\d.]+.*?/\* === end dnd-shared v[\d.]+ === \*/", css, re.S)
    return m.group(0).replace("\r\n", "\n").strip() if m else None

canon_css = shared_block((HUB / "shared" / "dnd-shared.css").read_text(encoding="utf-8"))
canon_ver = re.search(r"dnd-shared (v[\d.]+)", canon_css).group(1)
foot_links = re.findall(r'<li><a href="(https://wernercd\.github\.io/[^"]+)"', (HUB / "shared" / "footer.html").read_text(encoding="utf-8"))
root_tokens = None

for site in SITES:
    print(f"\n== {site}")
    repo = ROOT / site
    # --- local repo ---
    _, st = run(["git", "status", "--porcelain"], repo)
    (ok if not st else bad)(site, "working tree clean" if not st else "uncommitted changes:\n         " + st.replace("\n", "\n         "))
    run(["git", "fetch", "-q"], repo)
    _, ab = run(["git", "rev-list", "--left-right", "--count", "HEAD...@{u}"], repo)
    ahead, behind = (ab.split() + ["?", "?"])[:2]
    (ok if ahead == behind == "0" else bad)(site, f"in sync with origin (ahead {ahead}, behind {behind})")
    _, head = run(["git", "rev-parse", "--short=8", "HEAD"], repo)
    # --- last deploy ---
    _, runs = run(["gh", "run", "list", "-R", f"WernerCD/{site}", "--limit", "5", "--json", "headSha,status,conclusion"], repo)
    runs = json.loads(runs or "[]")
    done = [r for r in runs if r["status"] == "completed" and r["conclusion"] != "cancelled"]
    last = done[0] if done else None
    if last and last["conclusion"] == "success" and last["headSha"].startswith(head):
        ok(site, f"latest commit {head} deployed (run green)")
    else:
        bad(site, f"deploy for {head} not green: {last and (last['headSha'][:8], last['conclusion'])}; in progress: {[r['headSha'][:8] for r in runs if r['status'] != 'completed']}")
    # --- shared CSS in the repo ---
    css = (repo / "site" / "styles.css").read_text(encoding="utf-8")
    blk = shared_block(css)
    (ok if blk == canon_css else bad)(site, f"styles.css shared block matches {canon_ver}" if blk == canon_css else f"styles.css shared block differs from {canon_ver} (found {blk and re.search(r'v[\d.]+', blk).group(0)})")
    toks = re.search(r":root\s*\{.*?\}", css, re.S)
    toks = toks.group(0) if toks else ""
    shared_toks = {k: v for k, v in re.findall(r"(--[\w-]+):\s*([^;]+);", toks) if not k.startswith("--src")}
    if root_tokens is None: root_tokens = shared_toks
    diff = {k for k in set(root_tokens) | set(shared_toks) if root_tokens.get(k) != shared_toks.get(k)}
    (ok if not diff else bad)(site, ":root tokens match the hub" if not diff else f":root tokens differ: {sorted(diff)}")
    # --- live pages ---
    for page in ["", "changes.html"]:
        url = BASE + site + "/" + page
        code, html = fetch(url)
        if code != 200: bad(site, f"{url} -> HTTP {code}"); continue
        probs = []
        if 'class="wrap hub-bar"' not in html: probs.append("no shared header")
        if 'class="site-footer"' not in html: probs.append("no shared footer")
        if "getItem('dnd.theme')" not in html: probs.append("no dnd.theme head script")
        if 'href="changes.html"' not in html: probs.append("no Changes link")
        missing = [l for l in foot_links if f'href="{l}"' not in html and not (l.rstrip("/").endswith("/" + site) and 'href="./"' in html)]
        if missing: probs.append("footer missing " + ", ".join(m.replace(BASE, "") for m in missing))
        if page == "" and site != "dnd" and 'href="https://wernercd.github.io/dnd/"' not in html: probs.append("no back-link to hub")
        v = re.search(r'styles\.css\?v=([0-9a-z]+)', html)
        if v and v.group(1) != "dev" and not head.startswith(v.group(1)[:7]): probs.append(f"live page is {v.group(1)}, repo HEAD is {head}")
        (ok if not probs else bad)(site, f"/{page or ''} live" + ("" if not probs else ": " + "; ".join(probs)))
    code, live_css = fetch(BASE + site + "/styles.css")
    (ok if shared_block(live_css) == canon_css else bad)(site, f"live styles.css carries shared {canon_ver}")

# hub lists every site
_, hub = fetch(BASE + "dnd/")
for site in SITES[1:]:
    if f'class="tool" href="{BASE}{site}/"' not in hub: bad("dnd", f"hub has no live card for {site}")

print("\n" + ("ALL OK" if not fails else f"{len(fails)} problem(s):\n- " + "\n- ".join(fails)))
sys.exit(1 if fails else 0)
