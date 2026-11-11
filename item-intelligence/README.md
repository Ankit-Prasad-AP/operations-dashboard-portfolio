# Item Intelligence

**One item, every planning fact, one screen.** Type an item code and the page shows its forecast, sold-to-date, on hand, open orders, bill of materials with material stock, lots and expiry, packaging transitions, where it sits on this week's and next week's schedule, and what was produced this week.

![Item Intelligence, page 1](screenshots/01-item-information.png)

[Open the demo](./index.html) · it loads the sample plant on open (about 10 seconds) and starts on item A2210.

## The problem

Every planning question at the plant touched the same half-dozen ERP exports: the forecast, the sold-to-date report, product availability (open orders), on hand and purchase orders, the bill of materials, lots on hand, plus the week's production schedule. Answering "can we run A2210 next week, and should we?" meant opening all of them, filtering each to one item and reconciling the numbers by hand, for every item, every day. The same files also fed the daily production report and the weekly schedule email, which were rebuilt by hand too.

## The pages

| # | Page | What the planner gets |
|---|------|-----------------------|
| 1 | [Item information](./index.html#item-information) | Everything about one item: status, pack, formula family, forecast vs sold by period, open orders, on hand, materials with tightest-material flag, lots, account executives selling it. |
| 2 | [BOM viewer](./index.html#bom-viewer) | The item's bill of materials as a tree, with on hand and open purchase orders for each component, and what else uses them. |
| 3 | [Relationship web](./index.html#relationship-web) | Where-used in both directions: item → materials, material → items, combo parents and children. |
| 4 | [Callout sheet](./index.html#callout-sheet) | For the next weeks: items with orders above forecast, items with no forecast, items whose tightest material runs out before the pickup date. Copyable as a list. |
| 5 | [Transitions](./index.html#transitions) | Packaging and code transitions: which lots and materials belong to the old code, when the new one starts, what to run out first. |
| 6 | [Accounts](./index.html#accounts) | Forecast vs sold by account executive and customer, so over- and under-forecast accounts are visible before the period closes. |
| 7 | [Rework](./index.html#rework) | Rework candidates and the rework plan, built from the same lot and order data. |
| 8 | [Daily production report](./index.html#daily-production-report) | Loads the daily production reports and the weekly schedules; shows produced vs scheduled by day, line and item, holds and plant summary. |
| 9 | [Weekly email](./index.html#weekly-email) | Builds the weekly schedule email from this week's schedule workbook, with callouts, and lets you edit the sheet in place and download it. |
| 10 | [Days of supply](./index.html#days-of-supply) | Days of supply per item and per material, on hand and on hand + purchase orders, with the tightest material for each item. |

## Where it's used

- Used for weekly planning in a multi-site food plant: 4 production lines across 3 sites.
- One search replaces looking an item up across six separate ERP exports.
- Orders above forecast, items with no forecast and materials that run out before pickup are flagged on one callout sheet before the schedule is released.
- The daily production report and the weekly schedule email are built from the same files instead of being rebuilt by hand.

## Inputs → logic → outputs

```
ERP exports (xlsx)                      Logic (in the browser)                  Outputs
──────────────────────────────          ─────────────────────────────────       ────────────────────────────
Master code / weights & measures   ─┐   join everything on item code            Item page (1), BOM tree (2),
Forecast (normal + LTO)             │   period calendar (P1–P12, 4-5 weeks)     where-used web (3)
Sold-to-date, Difference by item    │   forecast vs sold, over-forecast         Callout sheet (4) with copy
Product availability (open orders)  ├─▶ open orders vs forecast per period  ─▶  Transitions view (5)
On hand + PO, Equivalent on hand    │   tightest material = min over BOM        Accounts view (6)
Bill of materials (two layouts)     │   of (on hand + PO due) ÷ need            Rework plan (7)
Lots on hand, Packaging transition  │   lot expiry vs pickup, transition rules   Daily production report (8)
Production schedules (this/next wk) │   schedule rows → runs per item/line      Weekly email + edited xlsx (9)
Daily production reports           ─┘   produced vs scheduled per day            Days of supply tables (10)
```

Nothing leaves the browser. Each page reads the loaded workbooks with SheetJS and recomputes when a file is replaced.

## My role

I planned production at the plant and I am the user of this tool. I decided which files it reads, what each page shows and in what order, wrote the rules (period calendar, tightest-material definition, callout thresholds, transition handling), and validated every page against the live exports and what the plant actually ran, page by page, over several months of daily use.

> Designed, specified and validated by me on live production data. Built with an AI coding assistant.

## Tech notes

- One HTML file, no build step, no server; SheetJS reads the Excel exports in the browser. Pages 7–9 are sealed sub-apps inside the same file.
- This demo adds a loader that fetches the sample files from `data/` on open, fixes the clock to the snapshot morning (Oct 14, 2026), and routes each page to its own URL hash. The planning logic is unchanged.
- Sample data: 815 finished items (486 aerosol items with full detail), 5 daily production reports, 2 schedule weeks. See [REPLACEMENTS.md](REPLACEMENTS.md) for what was replaced and how.
- Codes in the demo are `A####` (suffix kept, e.g. `A2210-S`); lines are A–D.
