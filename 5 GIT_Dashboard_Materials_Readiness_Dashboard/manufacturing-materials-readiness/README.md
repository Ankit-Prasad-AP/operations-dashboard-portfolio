# Manufacturing Materials Readiness Dashboard

## Portfolio Purpose
This public demo showcases a manufacturing planning decision system that converts a multi-line production schedule into material-readiness actions. It is designed for recruiters, hiring managers, and operations leaders who want to see how schedule demand, inventory, purchase-order timing, transitions, physical counts, first-in, first-out (FIFO) lot use, and date-wise case consumption can be turned into one planner-facing cockpit.

The public version is intentionally more presentation-oriented than the private production tool. It uses a polished executive layout, strong visual hierarchy, KPI cards, decision callouts, visual analytics, interactive filters, and synthetic data so the operational value is clear in roughly 90 seconds.

## What the Dashboard Demonstrates
- Converts scheduled production into Can, Case, Cap, Valve, and Batching Material requirements.
- Checks usable on-hand inventory and eligible purchase-order timing against scheduled runs.
- Separates true production shortages from overdue purchase-order cleanup and inventory-data issues.
- Applies old-to-new material transitions only when the replacement supply is eligible.
- Uses physical-count rules to distinguish trusted inventory from quantities that still need verification.
- Ranks material exposure by Schedule Volume %, while keeping on-hand usage as a separate pressure metric.
- Recommends FIFO lots where lot data is available.
- Splits runs at midnight so Case Consumption is assigned to the correct calendar day and grouped by Date + Case Code.

## Recruiter Walkthrough — About 90 Seconds
1. Click **Load Demo Data**.
2. Scan the KPI cards and Readiness Mix to understand the overall state.
3. Review the **Planner Action Queue** to see shortages, managed purchase-order/transition coverage, and data issues.
4. Review **Material Exposure** to see which materials dominate scheduled consumption.
5. Open **Action Callouts** and use the Risk / Supply-Transition / Data filters.
6. Switch Usage tabs to compare Schedule Volume % and on-hand pressure.
7. Review **Case Consumption by Calendar Day** to see midnight-aware 24-hour demand.
8. Finish with **Physical Can Verification** to see the inventory-confidence layer.

## Demo Data
The demo uses deterministic synthetic manufacturing data. It deliberately includes:
- healthy / covered conditions,
- true shortages,
- purchase-order timing dependencies,
- a material transition,
- overdue purchase-order cleanup,
- physical-count verification states,
- FIFO lot data,
- a run that crosses midnight.

Synthetic sample workbooks are included under `sample_data/` for portfolio context. The demo itself loads its synthetic scenario directly in the browser and does not require any upload.

## Visual / UX Design
The public dashboard is designed as a decision cockpit rather than a spreadsheet rendered in HTML. It includes:
- premium KPI cards,
- readiness-mix visualization,
- daily production-load bars,
- prioritized action cards,
- schedule-volume exposure bars,
- interactive filters and material search,
- switchable Usage views,
- polished decision tables,
- light/dark appearance toggle,
- annotations that explain why each view matters.

## Technologies
Single-file HTML, CSS, and JavaScript with no framework and no external assets. The public demo is fully client-side and contains:
- no analytics,
- no tracking,
- no remote fonts,
- no CDN dependency,
- no outbound network requests.

It is intended to work from both `file://` and GitHub Pages.

## Data Privacy
All public-facing names, item/material codes, customer labels, quantities, purchase orders, lot codes, dates, and transactions in this portfolio package are synthetic or generalized. No private employer source workbook is included in this repo-ready folder.

## Operational Value
The system demonstrates how a planner can reduce manual reconciliation, identify shortages earlier, distinguish true production risk from cleanup work, understand which supply actually arrives in time, prioritize high-volume materials, and translate a schedule into actionable material decisions.

## Screenshot note
`screenshots/demo-overview.png` is a static local render of the redesigned synthetic overview. After GitHub Pages deployment, a live browser screenshot may be substituted after the same privacy and metadata checks in `VERIFY_BEFORE_PUSH.md`.
