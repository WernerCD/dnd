# D&D Toolbox

The home page for a set of free D&D 5e helper sites (2014 and 2024 rules).

**Live:** https://wernercd.github.io/dnd/

| Tool | Site | Repo |
|---|---|---|
| Wild Shape Beast List | https://wernercd.github.io/dnd-druid-wildshapes/ | [dnd-druid-wildshapes](https://github.com/WernerCD/dnd-druid-wildshapes) |
| Item Finder | https://wernercd.github.io/dnd-items/ | [dnd-items](https://github.com/WernerCD/dnd-items) |
| Multiclass Planner | https://wernercd.github.io/dnd-multiclass-planner/ | [dnd-multiclass-planner](https://github.com/WernerCD/dnd-multiclass-planner) |

Static HTML/CSS in `site/`, with no build step. Every push to `main` deploys through `.github/workflows/pages.yml`.

Shared look and behaviour across all the sites is defined in [`STYLE.md`](STYLE.md), with canonical header, footer, CSS and theme files in `shared/`. Each site has a separate `changes.html` change log.

To add a tool: add a card to `site/index.html` and a row to this table, then give the tool's header a "D&D Toolbox" link back to `https://wernercd.github.io/dnd/`.

Unofficial fan content. Rules text in the tools comes from SRD 5.1 and 5.2 (CC BY 4.0) by Wizards of the Coast LLC.
