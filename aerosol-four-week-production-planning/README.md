# Four-Week Production Planning Demo

## Business Problem
Production planners often have to reconcile forecast, available inventory, customer orders, locked weekly commitments, manual planner overrides, and manufacturing minimums across multiple files before they can decide what should be produced next. This demo shows a structured way to turn those inputs into a tentative four-week production summary while preserving hard commitments and surfacing exceptions.

## What the Dashboard Does
- Preserves an exact locked first production week.
- Preserves active manual planner rows exactly for later weeks.
- Calculates uncovered demand after inventory and locked production.
- Carries eligible prior-period limited-run demand forward within a bounded window.
- Uses open customer orders as a coverage floor and flags timing rollovers.
- Applies generalized pallet and batch minimums and then balances low weeks using eligible future normal demand.

## Inputs
The demonstration uses synthetic item master data, forecast, available inventory, an exact locked week, open customer orders, and manual planner overrides. Sample CSV files are included in `sample_data/`. The public demo loads deterministic synthetic inputs directly and does not require an upload.

## Key Decisions and Outputs
The dashboard helps a planner decide which items need production, which quantities are protected by planner input, which prior-period shortages remain valid, where an order timing risk exists, whether a manufacturing minimum changes the suggested quantity, and which eligible future demand can be pulled forward to stabilize weekly production. The main output is a tentative production summary by item and week, not a final line-level schedule.

## Workflow
1. Lock the first production week exactly.
2. Apply planner-entered manual rows exactly.
3. Net current-period demand against available supply.
4. Carry only eligible prior-period limited-run shortage.
5. Protect customer-order coverage and flag timing rollovers.
6. Round non-manual recommendations to manufacturable quantities.
7. Pull only eligible future normal demand into low weeks.
8. Review master-data and timing exceptions before execution.

## Technologies Used
Single-file HTML, CSS, and vanilla JavaScript. The demo runs entirely in the browser and requires no server or build step.

## Operational Value
The workflow demonstrates how a planner can reduce repetitive spreadsheet reconciliation, standardize demand-to-production decisions, identify order risks earlier, preserve planner overrides, and create a more disciplined handoff from demand planning into production scheduling. <!-- TODO: real number -->

## Data Privacy and Synthetic Data Notice
All portfolio data is synthetic. No employer, customer, supplier, item, order, or source-system data is included. The demo runs fully client-side and makes no outbound network requests. Confidential operating parameters from the production environment were intentionally generalized, including weekly volume goals, carry horizon, pallet minimums, batch minimums, and limited-run thresholds. The public version also loads normalized synthetic inputs directly rather than exposing internal source-file parsing structures.
