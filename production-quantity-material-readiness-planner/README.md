# Production Quantity & Material Readiness Planner

## Business Problem
Production planners often maintain weekly quantities separately from material inventory, purchase orders, physical counts, and bill-of-material requirements. That separation makes it difficult to answer a simple operational question quickly: can the planned production run on the intended date, and if not, what is the earliest safe alternative?

## What the Dashboard Does
- Connects weekly production quantities to packaging and batching requirements.
- Compares requirements with system inventory, validated physical can counts, and dated purchase orders.
- Allocates shared same-day material from the largest requirement to the smallest requirement.
- Recommends a later run date when an incoming purchase order can remove a shortage.
- Flags runs that require new future supply when no sufficient purchase order exists.
- Keeps non-stock utilities visible without allowing them to create false purchase-order actions.

## Inputs
The production version consumes forecast and finished-goods context, weekly production quantities, packaging mappings, bill-of-material usage, material inventory, physical can counts when available, and open purchase orders. This portfolio version ships only with deterministic synthetic CSVs in `sample_data/`.

## Key Decisions and Outputs
A planner or materials leader can see whether each planned run is covered, which component is constraining it, how many cases could run with current supply, whether the run should move later in the week, and where a new purchase order is required. The exception table is designed to make the next action obvious without reading every material line.

## Workflow
1. Load the synthetic demo or inspect the sample CSV inputs.
2. Review forecast, finished-goods inventory, open-order context, and the weekly production plan.
3. Edit production quantities if needed.
4. Run the material readiness check.
5. Review covered runs, move-date recommendations, and new-supply actions.
6. Export a concise decision summary if needed.

## Technologies Used
Single-page HTML, CSS, and vanilla JavaScript. The demo is fully client-side, requires no build step, and makes no outbound network requests.

## Operational Value
This design standardizes the link between production planning and material readiness, reduces manual cross-file reconciliation, surfaces shortages earlier, and gives planners a repeatable run-date decision process. It also creates a common decision view for production, materials, and operations leadership.

<!-- TODO: real number -->

## Data Privacy and Synthetic Data Notice
All portfolio data is synthetic. No employer, customer, supplier, item, material, purchase-order, sales-order, employee, file-path, or internal source data is included. The demo runs entirely in the browser. Confidential operating parameters from the production environment are intentionally generalized; the public version demonstrates the decision concept rather than exact internal policy.
