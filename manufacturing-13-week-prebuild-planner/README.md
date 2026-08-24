# 13-Week Production Readiness Planner

## Business Problem
Manufacturing planners often have forecast, inventory, fixed production commitments, planner overrides, minimum-run constraints, and special demand rules spread across separate files. The hard part is not adding the numbers; it is deciding what must be produced first, what can move earlier, and what should remain protected.

## What the Dashboard Does
- Converts forecast, inventory, sold-to-date, locked production, planner overrides, and protected prebuild quantities into a 13-week production plan.
- Prioritizes forecast completion before weekly smoothing.
- Treats negative inventory as zero for planning and surfaces the data issue.
- Applies pallet and minimum-batch rounding and consolidates low-volume requirements into one run.
- Keeps protected inputs separate from normal system-generated production.
- Surfaces limited-duration demand carry, missing master data, and soft weekly-balance exceptions.

## Inputs
The public demo uses synthetic CSV files for item master, forecast, inventory, sold-to-date, locked production, manual plan, protected prebuild, and limited-duration demand. The **Load Demo Data** button embeds the same deterministic synthetic structures so no upload is required.

## Key Decisions and Outputs
A planner can see which forecast requirements are covered, which exact inputs are protected, where production was moved earlier for balance, which weeks remain below a soft target, and which items need master-data or exception review.

## Workflow
1. Load synthetic demo data or the sample CSV files.
2. Reduce current-period requirement by sold-to-date and usable inventory.
3. Protect locked, manual, and approved prebuild quantities.
4. Complete earlier-period forecast before later forecast.
5. Apply the limited-duration carry window where relevant.
6. Apply pallet and minimum-batch rounding and the low-volume one-run rule.
7. Normalize eligible normal production only after forecast completion.
8. Review exceptions and planner actions.

## Technologies Used
Single-file HTML, CSS, and vanilla JavaScript. The demo is fully client-side, has no framework, no build step, and no network dependency.

## Operational Value
The system demonstrates how a planner can standardize forecast-completion decisions, reduce repeated spreadsheet reconciliation, make exceptions visible earlier, and keep weekly balancing subordinate to actual demand coverage. <!-- TODO: real number -->

## Data Privacy and Synthetic Data Notice
All portfolio data is synthetic. No employer, customer, supplier, employee, item, material, purchase-order, sales-order, or internal path data is included. The demo runs fully client-side and makes no outbound network requests. Confidential operating parameters were intentionally generalized in the public configuration.

### Generalized portfolio parameters
The public demo uses generic values for weekly normalization, low-volume threshold, pallet minimums, minimum batch size, limited-demand carry horizon, and final buffer. These are demonstration settings and are intentionally different from the private production configuration.
