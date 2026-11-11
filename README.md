# Planning Tools

Public portfolio of Ankit Prasad: production planning tools built by a planner, running on a synthetic plant dataset.

- **Landing page:** `index.html`
- **[Item Intelligence](item-intelligence/index.html)** — one item, every planning fact, one screen. Twelve pages. [How it works](item-intelligence/README.md)
- **[13-Week Plan](13-week-plan/index.html)** — calendar-driven 13-week production plan with the reason behind every number. [How it works](13-week-plan/README.md)

Each tool folder holds the tool (`index.html`), its sample data (`data/`), screenshots and a GIF (`screenshots/`), `README.md` / `README.html` and `REPLACEMENTS.md`. `SCAN.txt` is the leak scan of the whole site.

Hosting: GitHub Pages from the repository root. Both tools load their `data/` files with `fetch`, so they need to be served over http(s), not opened from disk.

Designed, specified and validated by me on live production data. Built with an AI coding assistant.
