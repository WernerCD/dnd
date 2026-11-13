# SITE NAME

One sentence: what the tool does, for 2014 and 2024 D&D 5e rules.

**Live:** https://wernercd.github.io/REPO/ · part of the [D&D Toolbox](https://wernercd.github.io/dnd/) · [Changes](https://wernercd.github.io/REPO/changes.html)

## Features
- Short bullets a player would care about.

## Data and copyright
Where the data comes from (SRD 5.1 / 5.2 via the Open5e API, facts-only indexes, original text) and what is deliberately left out.

## Layout
| Path | What |
|---|---|
| `site/` | The static site (no build step for the page itself) |
| `tools/` | Data build and checks |

## Run locally
```bash
python -m http.server 8765 --directory site
```
Checks (CI runs the same before every deploy): `COMMAND`.

## Credits and license
- Code: MIT, see [LICENSE](LICENSE).
- This work includes material from the System Reference Document 5.1 and 5.2 by Wizards of the Coast LLC, available at https://dnd.wizards.com/resources/systems-reference-document, licensed under the Creative Commons Attribution 4.0 International License (https://creativecommons.org/licenses/by/4.0/legalcode).
- Unofficial fan content. Not affiliated with or endorsed by Wizards of the Coast.
