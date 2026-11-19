# D&D Toolbox: shared site conventions (v1.5)

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

- **Tool menu (v1.11):** every page loads `nav.js` (copied unchanged from `shared/nav.js`) right after `theme.js`. It puts centred drop-down menus (Characters, Build, Play, Run) into the top bar by itself, with no markup needed; under 720 px they fold into one "Tools" menu. A new site or page is one line in `nav.js`'s MENU, then re-copy it to every site.

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

## 6b. Head tags, 404, license, README, print, CI (v1.3)
- **Head tags (`shared/head.html`):** every `index.html` and `changes.html` carries the theme-color pair, a canonical link and the Open Graph and Twitter tags right after the description. Fill in the title, the description and the page's full live URL.
- **404 page (`shared/404.html`):** every site has a `site/404.html` built from the template. It uses absolute `/REPO/...` asset links, because GitHub Pages serves it at any depth, and adds `noindex`. The workflow's `?v=dev` sed must cover it (`site/*.html` does).
- **License (`shared/LICENSE`):** copy it unchanged to the repo root as `LICENSE`. It is MIT for the code, with the SRD content staying CC BY 4.0.
- **README (`shared/README-template.md`):** every README uses these sections, in this order: Features, Data and copyright, Layout, Run locally, Credits and license. The hub's README is the one exception: it is a table of the tools.
- **Print:** the shared block's `@media print` makes pages paper-friendly and hides the header bar, theme button, footer links and all buttons. Each site adds its own print rules to hide its filters and controls, and to print its main content (cards, stat block, build table or list).
- **Tap targets:** header and footer links are at least 24px tall (shared CSS). Site-specific links and buttons in lists should meet the same minimum.
- **CI check (`shared/check_site.py`):** copy it unchanged to `tools/check_site.py`. Each workflow runs it as a step after the data build (if any) and before `configure-pages`: `- name: Check site` / `run: python tools/check_site.py`. A site's own tests (for example the planner's `node tools/check.js`) also run in that step.

## 6c. Shared characters (`shared/character.js`, v1.7)
A character made on one site is available on every other site. All the sites are on `wernercd.github.io`, so they share `localStorage`; the shared list lives under the key `dnd.characters`. The full format and API are documented at the top of `shared/character.js`.
- **Copy** `shared/character.js` unchanged to `site/character.js`, and load it on `index.html` **before** the site's own script: `<script src="character.js?v=dev"></script>`. `changes.html` and `404.html` don't load it.
- **Header:** `index.html` puts `<span class="char-pick" id="charPick"></span>` in the hub bar, right after the "D&D Toolbox" back-link (`shared/header.html` v2). The script fills it with a "Character" switcher. It stays empty on changes and 404 pages.
- **The shared record** holds name, edition, classes (class, level, subclass id and name) and the six ability scores. Each site keeps its own detail in its own keys and stores per-character extras only under `links['<its repo>']`, through `DndChar.setLink()`. It never edits another site's link.
- **Who writes what:**
  - The Multiclass Planner is the main editor of classes, levels, subclasses and scores.
  - Other sites may create a simple single-class character, but they only change classes and levels when the user asks.
  - Every site reads the active character and follows `DndChar.onChange()`.
- **Hand-offs:** link to another tool with `DndChar.url('<repo>', id)` (`?char=<id>`). Arriving with `?char=` makes that character active.
- **Share links (v1.7):** the header's Share button (and the hub's "Share link") copies `DndChar.shareUrl(ch, repo)`, a link whose `#dndchar=` fragment carries the shared record (name, edition, classes, scores; not `links`). Opening it in another browser shows a prompt to add the character, or to update it if that browser already has a different copy. **A site can add its own detail to the link:** call `DndChar.setShare(id, '<repo>', data)` whenever that detail changes (the Spell Planner puts the character's list, the Multiclass Planner its build; keep it under 6000 characters). When a share link is accepted, that data lands in the character's `inbox`; on load and in `onChange`, call `DndChar.takeInbox(activeId, '<repo>')` and, if it returns data, rebuild your own state from it (a new list or build, never overwriting an existing one without asking). character.js removes `#dndchar=` from the address before the site's own script runs, so a site's own `#` state (for example `#list=`) is untouched. Sites don't need to do anything.
- **Subclass ids differ between sites.** Match them with `DndChar.sameSub()`, never with `===`.
- **No character, or one without your class:** the site works exactly as before. A character only pre-fills; it never locks the user out of the site's own controls.
- **Syncing rules (v1.6.1, from the 2026-11-14 audit):**
  - **React to the fields you use, not to `updated`.** Another site re-saving the character (or setting its own link) changes `updated` and fires `onChange`. Compare the fields your site reads (for example class levels and subclass) with what you last applied, and do nothing if they are the same.
  - **Never drop what you don't recognise.** A class or subclass your site doesn't list stays in the shared record untouched when you save. Show it as read-only or "other", never erase it.
  - **Don't overwrite the user's unsaved work.** If the user has changed something on your site since the character was last applied, ask (or show a "Character changed: apply / keep mine" notice) instead of replacing it.
  - **A control the user set by hand wins** over the character until they choose to follow the character again. A "Follow character" toggle is the recommended way to show this.
  - **Debounce shared saves.** Write the shared record after a pause (about 500 ms) or on blur, never on every keystroke.
  - **Two tabs:** your own keys (lists, profiles, favourites) can change in another tab. Listen for the `storage` event on them, or re-read before you write, so one tab never overwrites the other's work.
  - **Deleted characters:** if a character you linked to no longer exists, keep your own data (lists, profiles) and just drop the link quietly. Deleting the active character leaves no character active (character.js v1.1).
  - **Unknown `?char=` id:** say so briefly ("That character isn't in this browser") rather than ignoring it.
- **Accessibility for drop-downs and pickers:** Escape closes them and returns focus to the button that opened them, they stay inside the screen at 375 px, and re-rendering a list after a filter change keeps focus on the control the user used.

## 6d. Motion and charts (`shared/motion.js`, `shared/ui.js`, `shared/chart.js`, v1.8)
Copy all three unchanged into `site/` (like `character.js`). Load them at the end of `<body>`, after the site's own scripts:
`<script src="motion.js?v=dev" defer></script><script src="ui.js?v=dev" defer></script>`, plus `<script src="chart.js?v=dev"></script>` before your own script if the site draws charts.
- **Motion** is [motion.dev](https://motion.dev)'s plain-JS build (14.9.0, MIT), vendored unchanged. Don't load it from a CDN. To upgrade, change it here and re-copy it.
- **Reveal:** put `data-reveal` on a container (a card grid, a result list). Its children fade and rise in as they reach the viewport; later re-renders just show. Lists you render after load are picked up automatically. Don't put it on a list of hundreds of rows; use it on cards and sections.
- **Spotlight:** `data-spot` on a card adds a soft light that follows the pointer (the Kokonut UI card look, done in CSS).
- **`DndUI`:** `enter(el)` for a new toast/dialog/card, `pop(el)` for a "copied" moment, `count(el, n)` to tween a number, `reveal(root)` after big changes, `DndUI.reduced`.
- **Charts (`DndPlot`):** `DndPlot.line(el, {...})` and `DndPlot.bars(el, {...})`, in the look of bklit UI: thin 2 px lines, soft area fill, a crosshair tooltip, arrow-key reading, and a "Show as table" view. Use `curve: 'step'` for per-level values. Up to 3 series; their colours (`--p1..--p3`, set in the shared CSS for both themes) were checked for colour-blind separation, and series 2 and 3 are also dashed and dotted, so colour is never the only cue. Give every chart a `title`, an `xLabel` and a heading on the page.
- **Rules:** motion is decoration, never content. With "reduce motion" on, or if Motion fails to load, everything shows at once (ui.js unhides after 2.5 s at most). Nothing animates on every keystroke. Print shows everything.

## 6e. Sheet summaries (`character.js` v1.4, for the Character Sheet and Party pages)
The hub's **Character Sheet** (`/dnd/sheet.html?char=<id>`) and **Party** (`/dnd/party.html`) pages show what every tool knows about a character, without loading any tool's code. Each tool publishes a small, read-only summary for the active character whenever its state for that character changes:
`DndChar.setSheet(id, '<repo>', summary)` (or `null` to clear it). Keep it under 6000 characters, plain JSON, and computed: final numbers, not inputs. Summaries travel inside share links, so a DM who opens a player's link sees the same sheet. The sheet pages never write to `sheet`; they keep play state (HP, slots used, conditions) in their own key.

Every summary has `v: 1`, plus `ed: '2014'|'2024'` when it depends on the edition. Fields per tool (leave out what doesn't apply):
- **dnd-multiclass-planner:** `lvl`, `pb` (proficiency bonus), `hp` (average max HP), `hd` (for example `"3d12+5d8"`), `saves` (`["str","con"]`), `ab` (final scores after ASIs, 6 numbers), `slots` (9 numbers, levels 1-9), `pact` (`{n, lvl}`), `dc` (`[{abil, dc, atk}]`, one per casting ability), `attacks` (attacks per Attack action), `res` (`[{name, max, per: "short"|"long"|"turn"|"day", note?}]`, for example Rage or Channel Divinity), `feats` (`[{lvl, name}]`), `features` (`[{lvl, cls, name}]`, names only), `prof` (`{armor, weapons, tools}` short strings).
- **dnd-magic:** `spells` (`[{n, lvl, conc, rit, t, r}]`, the chosen and prepared spells; `t` is the casting time such as `"1A"`, `"1BA"`, `"1R"` or `"10m"`; `r` is the range), `list` (the list's name).
- **dnd-druid-wildshapes:** `forms` (`[{n, cr, ac, hp, spd}]`, the starred or known forms), `uses` (Wild Shape uses), `maxcr`.
- **dnd-feats:** `feats` (`[{n, cat, status: "taken"|"planned"}]`), `species`, `background`.
- **dnd-items:** `items` (`[{n, rar, att}]`, items on the character's list), `attuned`.
Unknown fields are ignored, so a tool can add more later; tell the hub session so the sheet can use them.

## 6f. Source pickers (`shared/sources.js`, v1.10)
Every "Sources"/"Books" picker uses `DndSources` (copy `shared/sources.js` unchanged to `site/` and load it before your app script) so all sites behave the same:
- **Order:** `DndSources.sort(keys)`, shown under group headings (`DndSources.info(k).groupName`): Core rules, Official supplements, Settings and adventures, Partner and licensed. Use `<div class="src-group">` for a heading row.
- **Default:** only the core rules are ticked (`DndSources.defaults(keys)`: SRD 5.1/5.2, Player's Handbook, Dungeon Master's Guide, Monster Manual, both editions). Everything else stays listed and available, unticked.
- **Buttons:** "Core books" (back to the default), "Select all", "Clear all".
- **Remembering:** a reader's own choice (saved in your localStorage key, or in the URL) wins over the default. The default applies only when there is no saved choice; when the selection equals the default, leave it out of the URL. Changing edition or tab keeps the rule (core of the new list), never "all".
- Books the table doesn't know go in Settings and adventures; tell the hub session so it can add them.

## 6g. Imported characters (`character.js` v1.6: `imp`)
The hub's Characters page imports a character from D&D Beyond (link or pasted JSON), a Foundry VTT dnd5e actor export or a Fight Club 5 XML export. It creates or updates the shared record and stores a names-only summary in `ch.imp` (never descriptions or rules text):
`{v: 1, src: 'ddb'|'foundry'|'fc5', at: ISO date, ed, name, classes: [{cls, lvl, subName}], ab: [6], hp, ac, speed, init, saves: [], skills: {prof: [], exp: []}, passive: {prc, inv, ins}, resist: [], immune: [], species, background, feats: [names], spells: [{n, lvl, cls, p}], items: [{n, qty, eq, att}]}`.
A tool that can use it (spells, feats, items, the planner) checks `ch.imp` on load and in `onChange`: when `imp.at` is newer than the `impAt` it saved in its own `links[repo]`, it offers "Use the spells/feats/items imported from D&D Beyond" (never overwrites silently), then saves `impAt`. Match names case-insensitively against your own data and list anything it couldn't match. The importer also publishes `sheet.import` (ac, speed, init, passive, resist, immune, skills) for the Character Sheet.

## 6h. Offline, app icons and link previews (`shared/sw.js`, `shared/offline.js`, `shared/images/`, v1.13)
- Copy `shared/sw.js` and `shared/offline.js` unchanged to `site/`. Load `<script src="offline.js?v=dev"></script>` on every page, after `version.js`, **except 404.html** (it is served at any address, so a relative `sw.js` would register in the wrong place). If your app rewrites the address on load, keep query parameters it doesn't own (the smoke test opens `?sw=1`). It registers `sw.js?v=<deploy id>` (so each deploy re-saves the site) and hands it the files the page already loaded. Pages work offline after one visit; the hub's "Save every tool for offline use" saves all sites at once.
- The service worker saves the start page, every same-site file it links to, and anything listed in `site/offline.json` (optional: a JSON array of paths relative to the site root, e.g. `["data/items.json", "changes.html"]`). **List every data file your app fetches** that the start page doesn't link to, so a reader who never opened it online still gets it. Pages are network-first (3 s), other files are served from the cache and refreshed in the background.
- Copy `shared/images/<repo>/`: the five icons into `site/icons/`, `og.png` into `site/`, and `manifest.webmanifest` into `site/`. Head tags are in `shared/head.html` v1.4 (manifest, PNG favicon, apple-touch-icon, `og:image` with the absolute URL, `twitter:card` `summary_large_image`); drop the old inline SVG `data:` favicon. A 404 page uses absolute `/<repo>/` paths for these like it does for its CSS.
- The icons and previews are made by `tools/make_images.py` in the hub; change a site's name, blurb or glyph there, re-run it, and re-copy.

## 6i. Stat blocks (`shared/statblock.js`, CSS v1.10)
Every page that shows a creature's stat block draws it with `DndStatblock.html(m, {ed, head, mini, after, extra, source})` and the shared `.dsb` styles, so Monster Lookup, its encounter builder and Wild Shape look alike and print alike. It takes the toolbox data shapes as they are (`ab` array or `abilities` object, `bonus` or `bonusActions`, `hover` on the record or in `speed`) and leaves out anything missing, so facts-only entries show just their numbers. Site-specific notes (Wild Shape's "AC with Circle Forms", damage per round) go in `opts.after.ac` / `.hp` or `opts.extra`, not in a fork of the file. Retire your own `.statblock` CSS once nothing uses it.

## 6j. Hub search (`site/search.json`)
Each tool site publishes `site/search.json` for the hub's "Search every tool" box:
`{"v": 1, "items": [{"n": "Bag of Holding", "t": "Wondrous item, uncommon", "k": "Item", "u": "#item=bag-of-holding"}]}`
`n` name (required), `t` one short detail line, `k` kind label (Spell, Item, Monster, Feat, Species, Background, Rule, Condition, Beast, Class...), `u` link relative to the site root that opens that entry (a deep link your site already understands; add one if it has none). Names and short facts only, the same copyright rule as the rest of the site: no rules text. One entry per name (merge 2014/2024 into one with the edition in `t` if it differs). Keep it under 600 KB; generate it with the site's data build (commit it, or build it in both CI jobs). The smoke test checks the shape.

## 6k. Dice and links between tools (`shared/dice.js`, `shared/links.js`, CSS v1.11)
- Copy both unchanged to `site/` and load them on every page that shows game text, at least the main page: `<script src="dice.js?v=dev"></script>` and `<script src="links.js?v=dev"></script>` after `offline.js`. Neither needs code from you: they work inside every `.dsb` stat block, and inside any element you mark `data-dice` (rolls) or `data-links` (links). Content you render later is picked up automatically. Opt a block out with `data-nodice` / `data-nolink`.
- **Dice:** "+5 to hit", "Attack Roll: +5" and dice like "2d6 + 3" become tap-to-roll (`.dd-roll`). Mark your own numbers with `data-roll="1d20+4"` and `data-roll-label="Dex save"`; `data-roll-ctx="Goblin"` on a container names the creature, and a `.dsb-blk` or `data-roll-entry` gives the entry name ("Goblin: Scimitar, to hit"). d20 rolls also show the advantage and disadvantage result; damage rolls offer "roll again as a critical hit". The tray has a free-form roller and a log shared by every tool (`dnd.rolls`, last 30). `DndDice.open()` opens the tray from your own button.
- **Links:** names in italics (as the SRD prints spells and magic items) link to the Spell Planner, then the Item Finder; the first mention of each condition in a paragraph links to the Rules Reference; a stat block's creature type links to Monster Lookup filtered by type. Mark other names with `data-link="spell|item|condition|monster|feat"` (the element's text, or `data-link-name`). Links into your own site are left out. The names and addresses come from the tools' `search.json` lists (6j), so **a name links only if that tool's search list has an entry for it whose `u` opens it**; keep your list complete. With no connection and nothing cached, text stays plain.
- `statblock.js` v1.1 marks its ability modifiers, saves, skills, initiative and hit dice with `data-roll`, the block with `data-roll-ctx`, and the type with `.dsb-ctype`.

## 7. Checks before pushing
- At 375 px and at desktop width, in light and dark, `index.html` and `changes.html` show no horizontal scroll and no console errors.
- Every footer link resolves. The theme carries across sites.

- **Browser smoke tests (v1.12):** copy `shared/smoke_test.py` unchanged to `tools/smoke_test.py` and run it in a separate `test` job that `deploy` needs (copy the hub's `pages.yml`: the job runs in `mcr.microsoft.com/playwright/python:v1.65.2-noble`, which already has Chromium, so it takes under a minute; sites that build data in CI run that build in the test job too). A failing test stops the deploy. It checks every page at desktop and phone width: no JS or console errors, no broken same-site requests, header/footer/menu present and working, theme switch, no sideways scroll, nothing hidden with reduced motion, and the shared character save/picker/share-link flow. List extra pages in `tests/smoke.json` and add site checks in `tests/site_test.py` (`def run(page, base, check)`). **v1.1 (STYLE v1.13)** also checks, when the files exist: the site opens with the network off after one visit (`sw.js`), the manifest icons exist, `search.json` has the shape in 6j, and `statblock.js` draws a block with the shared styles. **v1.2 (STYLE v1.14)** also checks that `dice.js` turns dice in a `data-dice` block into rolls and shows a total, and that `links.js` loads. Run it locally before pushing: `python tools/smoke_test.py` (needs `pip install playwright` and `python -m playwright install chromium`).

## 8. Sync routine
- After any change to a site, or to `shared/`, run `python tools/check_sites.py` from the hub repo. It must end with `ALL OK`.
- A change to `shared/` bumps the version in the CSS block's comments, gets a line under Revisions, and is copied to every site in the same pass.
- Sites that are already live are pushed without asking again. Only a new public repo needs Chris's yes.

## Revisions
- v1.14 (2026-11-19): dice and links between tools (6k: `dice.js`, `links.js`, CSS v1.11, `statblock.js` v1.1) and smoke test v1.2.
- v1.13.2 (2026-11-19): `nav.js` v1.0.2: Run menu gains Encounter Builder (`dnd-monsters/#encounter`); menu entries with a #hash are marked current only on that view.
- v1.13.1 (2026-11-19): 6h: no `offline.js` on 404 pages; apps that rewrite the URL keep parameters they don't own (`?sw=1`).
- v1.13 (2026-11-19): offline sites, app icons and link previews (6h: `sw.js`, `offline.js`, `shared/images/`, head v1.4), the shared stat block (6i: `statblock.js`, CSS v1.10), the hub search list (6j: `search.json`) and smoke test v1.1.
- v1.12.1 (2026-11-19): smoke tests run in their own `test` job inside Playwright's container image (about 50 s instead of an 8-minute browser install); `deploy` needs it.
- v1.12 (2026-11-19): `shared/smoke_test.py`, a Playwright browser test suite every site runs in CI before deploying (section 7).
- v1.11.1 (2026-11-19): CSS v1.9.1: under 720 px the top bar wraps to "Toolbox · Tools · Changes" with the character picker on its own row, and the Tools menu stays inside the screen.
- v1.11 (2026-11-19): `shared/nav.js` and CSS v1.9: centred drop-down menus of every page in the top bar.
- v1.10 (2026-11-19): `shared/sources.js` and the source picker rule (6f: core books first and on by default, partner books listed but off); `character.js` v1.6 keeps `imp`, the imported-character summary (6g).
- v1.9.1 (2026-11-18): `character.js` v1.5: opening a share link for a character you already have (same classes and scores) now takes its newer sheet summaries instead of ignoring them.
- v1.9 (2026-11-18): `character.js` v1.4 adds `sheet` / `setSheet` (section 6e) for the new Character Sheet and Party pages; sheet summaries travel in share links (`s`).
- v1.8 (2026-11-18): motion and charts (section 6d): vendored Motion 14.9.0, `ui.js` (reveal, spotlight, enter/pop/count) and `chart.js` (`DndPlot` line/bar charts) ported from the Kokonut UI and bklit UI looks to plain JS; `character.js` v1.3 animates the share prompt; `.char-import` no longer centres with transform.
- v1.7 (2026-11-15): character share links (`character.js` v1.2: `shareUrl`, `copyShare`, `setShare`, `takeInbox`, the `#dndchar=` import prompt, and a Share button in the header switcher); CSS for `.char-share` and `.char-import`.
- v1.6.2 (2026-11-14): light `--muted` is #5c665f (was #6f7a72, 3.7-4.4:1; now 5.0:1 or better on every light surface).
- v1.6.1 (2026-11-14): `character.js` v1.1 (deleting the active character leaves none active) and the syncing and drop-down rules in section 6c.
- v1.6 (2026-11-13): shared characters. Adds `shared/character.js`, the `dnd.characters` store and the header's character switcher (section 6c).
- v1.5 (2026-11-13): print also resets --accent, --accent-ink, --gold, --warn, --warn-bg and --chip to their light values.
- v1.4 (2026-11-13): the print colours now also override the dark-mode media query (`:root:not([data-theme="light"])`), so a dark OS no longer prints dark pages.
- v1.3 (2026-11-13): 24px tap targets and a print layout in the shared CSS; head tags, 404 page, LICENSE, README layout and the CI smoke check (section 6b).
- v1.2 (2026-11-13): added `shared/version.js`, the update notice (section 6a), loaded on every page of every site.
- v1.1 (2026-11-13): `.changes` no longer narrows the whole `.wrap`, so the change log lines up with the header logo; its children are limited to 780px instead.
