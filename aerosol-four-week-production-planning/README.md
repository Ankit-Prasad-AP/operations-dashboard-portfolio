# Four-Week Production Planning Decision Cockpit

## Business Problem
Production planners often have to reconcile forecast, available inventory, customer orders, exact weekly commitments, planner overrides, and manufacturing minimums across separate files before they can decide what should be produced next. The decision is not simply a forecast calculation: hard commitments must be protected, exceptions must remain visible, and flexible demand must be used carefully so the tentative plan is both supported and manufacturable.

## What the Dashboard Does
- Preserves an exact first production week before any system balancing occurs.
- Preserves active manual planner rows exactly for later weeks.
- Nets available inventory and committed production against current demand.
- Carries eligible prior-period limited-run demand within a bounded, generalized window.
- Uses open customer orders as a coverage floor and surfaces timing rollovers.
- Applies generalized manufacturing minimums, then uses eligible future normal demand to stabilize low weeks.

## Inputs
The public demonstration uses deterministic synthetic versions of the information a production planner would normally reconcile: item master attributes, forecast, available inventory, an exact locked week, open customer orders, and manual planner overrides. Inspectable CSV samples are included in `sample_data/`. The recruiter demo does not require uploads; one click loads the complete synthetic scenario locally.

## Key Decisions and Outputs
The dashboard helps a planner determine which items require production, which quantities are protected by planner input, which prior-period shortages remain valid, where an order timing risk exists, whether a manufacturing minimum changes a recommendation, and when eligible future demand can be pulled forward to stabilize workload. It summarizes the result as a tentative production plan by item and week, supported by workload visuals, source-of-volume analysis, exception callouts, and item-level drill-downs. It is intentionally not a final line-level production schedule.

## Workflow
1. Protect the exact locked production week.
2. Apply planner-entered manual rows exactly.
3. Net current demand against available inventory and committed production.
4. Carry only eligible prior-period limited-run shortage.
5. Protect open-order coverage and surface timing rollovers.
6. Round system-generated quantities to generalized manufacturability minimums.
7. Pull only eligible future normal demand into under-loaded weeks.
8. Review timing and master-data exceptions before detailed scheduling.

## Technologies Used
Single-file HTML, CSS, inline SVG, and vanilla JavaScript. No framework, build step, server, analytics, remote font, CDN, or outbound request is required.

## Operational Value
The workflow demonstrates how a planner can reduce repetitive spreadsheet reconciliation, standardize demand-to-production decisions, identify order risks earlier, preserve planner intent, improve workload visibility, and create a clearer handoff from demand planning into detailed production scheduling. <!-- TODO: real number -->

## Data Privacy and Synthetic Data Notice
All portfolio data is synthetic. No employer, customer, supplier, item, order, employee, source-system, or production-file data is included. The demo runs fully client-side and is designed to make zero outbound network requests. Confidential operating parameters from the production environment were intentionally generalized, including weekly workload goals, carry horizon, pallet minimums, batch minimums, and limited-run thresholds. The portfolio presentation layer is intentionally more visual and explanatory than the operational production tool so a hiring manager can understand the decision system quickly without exposing confidential implementation details.
