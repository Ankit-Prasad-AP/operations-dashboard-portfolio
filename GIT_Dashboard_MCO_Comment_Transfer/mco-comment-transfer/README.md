# MCO Comment Transfer & Shortage Risk Cockpit

This is a public GitHub portfolio demo of a manufacturing planning workflow. It uses synthetic data only and is designed to show how a planner can combine demand, current-week production, next-week schedules, forecast context, item metadata, and negative-balance-through-date logic into one decision cockpit.

## What the demo shows

- Current-week production and next-week scheduled production applied to demand.
- Negative balance through a selected cutoff date.
- Ship-date fallback logic when pick date is blank.
- Placeholder/R-order exclusion logic for cleaner shortage reporting.
- Item metadata at the decision point: formula, expiry days, dairy/non-dairy status, small/large can, and historical lines.
- Visual decision support through KPI cards, coverage mix, production allocation, forecast trend, risk timeline, and polished tables.

## How to run

Open `index.html` in a browser and click `Load Demo Data`. No server, external API, CDN, or real workbook is required.

## Portfolio confidentiality

This repository contains only synthetic names, synthetic item codes, synthetic customers, and generalized business rules. It does not include real employer files, real source workbooks, real customer names, real SKU codes, or confidential parameters.

## Files

- `index.html` — dashboard page.
- `styles.css` — visual design and layout.
- `config.sample.js` — public demo configuration.
- `sample_data/demo_data.js` — synthetic manufacturing data.
- `src/engine.js` — reusable business-logic engine.
- `src/app.js` — UI rendering, charts, filters, and export logic.
- `LANDING_PAGE_ENTRY.md` — card/snippet for the root portfolio landing page.
- `docs/PORTFOLIO_NOTES.md` — notes for reviewers.

## Verification reminder

Before publishing, keep `VERIFY_BEFORE_PUSH.md` outside the repository folder and run the checks from the outer handoff package. Do not upload production files to GitHub.
