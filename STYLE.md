# D&D Toolbox: shared site conventions (v1.1)

Every site in the toolbox follows this, so they look and behave like one site:

- the hub, `WernerCD/dnd`
- the Wild Shape site, `dnd-druid-wildshapes`
- the Item Finder, `dnd-items`
- the Multiclass Planner, `dnd-multiclass-planner`

The canonical files live in this repo under `shared/`. Change them here first, then copy them to each site.

## 1. Pages
Each site has two pages:
- `index.html`: the tool.
- **`changes.html`**: its change log, a separate page. Remove the inline change log from `index.html`; the About section can say "See what's changed" and link to `changes.html`.

Both pages use the same header and footer. `changes.html` loads the site's own `styles.css` and no app JS, apart from the small theme script below.

## 2. Head
- `<title>`: on the tool page, just the site name (`Wild Shape Beast List`). On the change log, `Changes · <site name>`.
- Fonts: Fraunces (500, 700) and Inter (400, 500, 600) from Google Fonts. Use the exact link already in every site.
- A gold SVG favicon, a different shape for each site: hub = d20 hexagon, Wild Shape = moon, Items = gem, Planner = star or crest.
- The theme script goes in `<head>` before the stylesheet, so the page never flashes the wrong theme:
  ```html
  <script>try{var t=localStorage.getItem('dnd.theme');if(t==='dark'||t==='light')document.documentElement.dataset.theme=t;}catch(e){}</script>
  ```
- **One shared theme key, `dnd.theme`.** All the sites share the origin `wernercd.github.io`, so picking dark on one site carries to the others. When a site reads its theme, it migrates the old key once: if `dnd.theme` is empty and the old key (`ws.theme`, `di.theme`, `mcp.theme`) is set, copy it across. The toggle writes only `dnd.theme`.
- Stylesheet and script links keep `?v=dev`. CI replaces it with the commit id; the sed in each workflow must cover `changes.html` too.

## 3. Header (`shared/header.html`)
- A top bar: `← D&D Toolbox` on the left. On the right, a nav with `Tool` (index) and `Changes`, with `aria-current="page"` on the current one.
- The brand row: logo SVG with class `logo`, `<h1>` (linked to `./` on the changes page), tagline, and the theme button `#themeBtn` with the moon icon.
- On the hub, the left link is `D&D Toolbox` itself, marked `aria-current="page"` on its index, and the nav holds only `Changes`.

## 4. Footer (`shared/footer.html`)
The same on every page of every site:
- The link row: D&D Toolbox · Wild Shape Beast List · Item Finder · Multiclass Planner · Changes · Source code (the repo) · Report a problem (the repo's issues). Mark the current site with `aria-current="page"`.
- The license line, word for word, in the footer.
- A site that needs a longer SRD attribution or extra credits keeps those in its About or Sources section. The footer line is the minimum.

## 5. Change log format (`changes.html`)
- Newest first, grouped by date, one `<section class="change-day">` per day with `<h3><time datetime="YYYY-MM-DD">Month D, YYYY</time></h3>`.
- Each change is `<li><b>Short title.</b> One or two sentences in plain words about what a user notices.</li>`. No commit hashes, and no internal detail.
- Carry over all the existing entries. The first entry for this change is "Consistent design: the change log moved to its own page, and the header, footer and theme are now shared across the D&D Toolbox sites."

## 6. Shared CSS (`shared/dnd-shared.css`)
- Paste the block unchanged at the end of the site's `styles.css`, and delete the site's old `.hub-bar`, `.hub-row`, `.hub-link`, `.site-header`, `.header-inner`, `.brand` and changelog rules so nothing conflicts.
- The colour tokens in `:root` (light, dark media query and `[data-theme]`) must be the same on every site. Copy them from `dnd-druid-wildshapes/site/styles.css`.
- A site may add its own `--src-*` and similar tokens, but must not change the shared ones.

## 6a. Update notice (`shared/version.js`)
- Every page loads it last, right after the theme script: `<script src="theme.js?v=dev"></script>` then `<script src="version.js?v=dev"></script>`. Copy the file unchanged.
- It reads the build id that CI stamped into its own `?v=` link. When the tab becomes visible again (at most every 2 minutes) and every 15 minutes, it re-fetches the page with the cache bypassed. If the live page links a different `version.js?v=` build, it shows a small "A new version of this page is available. Reload" bar.
- No workflow change is needed: the existing `?v=dev` sed on the HTML pages covers it. It does nothing on a local copy (`?v=dev`).

## 7. Checks before pushing
- At 375 px and at desktop width, in light and dark, `index.html` and `changes.html` show no horizontal scroll and no console errors.
- Every footer link resolves. The theme carries across sites.

## 8. Sync routine
- After any change to a site, or to `shared/`, run `python tools/check_sites.py` from the hub repo. It must end with `ALL OK`.
- A change to `shared/` bumps the version in the CSS block's comments, gets a line under Revisions, and is copied to every site in the same pass.
- Sites that are already live are pushed without asking again. Only a new public repo needs Chris's yes.

## Revisions
- v1.2 (2026-11-13): added `shared/version.js`, the update notice (section 6a), loaded on every page of every site.
- v1.1 (2026-11-13): `.changes` no longer narrows the whole `.wrap`, so the change log lines up with the header logo; its children are limited to 780px instead.
