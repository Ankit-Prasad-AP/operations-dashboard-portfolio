# Production Quantity & Material Readiness Planner

## Business Problem
Production planners often manage weekly quantities separately from material inventory, purchase orders, physical counts, and bill-of-material requirements. That separation makes it difficult to answer a simple operational question quickly: can each planned production run execute on the intended date, and if not, what is the earliest safe alternative?

## What the Dashboard Does
- Connects weekly production quantities to packaging and batching requirements.
- Compares material demand with system inventory, validated physical can counts, and dated purchase orders.
- Allocates shared same-day material from the largest requirement to the smallest requirement.
- Recommends a later run date when known inbound supply can remove a shortage.
- Flags runs that require future or new supply when no sufficient purchase order exists.
- Keeps non-stock utilities visible without allowing them to create false purchasing actions.

## Inputs
The production version consumes forecast and finished-goods context, weekly production quantities, packaging mappings, bill-of-material usage, material inventory, physical can counts when available, and open purchase orders. This portfolio version contains deterministic synthetic CSVs in `sample_data/`.

## Key Decisions and Outputs
A planner or materials leader can see whether each planned run is ready, which material is constraining it, how many cases could run with current supply, whether the run should move later, and where new supply is required. The portfolio view emphasizes the operational decision rather than exposing confidential internal parameters.

## Workflow
1. Load the deterministic synthetic demo.
2. Review forecast, finished-goods inventory, open-order context, and the weekly production plan.
3. Edit production quantities if needed.
4. Run the material readiness check.
5. Review readiness KPIs, the action queue, material-risk distribution, and inbound-supply timeline.
6. Drill into detailed run readiness and short-material exceptions.
7. Export a concise decision summary if needed.

## Technologies Used
Single-page HTML, CSS, and vanilla JavaScript. The dashboard requires no build step, runs fully client-side, works from `file://` and GitHub Pages, and makes zero outbound network requests.

## Operational Value
This design standardizes the connection between production planning and material readiness, reduces manual cross-file reconciliation, surfaces shortages earlier, and gives planners a repeatable run-date decision process. It creates a common decision view for production, materials, sourcing, and operations leadership.

<!-- TODO: real number -->

## Data Privacy and Synthetic Data Notice
All portfolio data is synthetic. No employer, customer, supplier, product, material, purchase-order, sales-order, employee, file-path, or internal source data is included. Confidential operating parameters from the production environment are intentionally generalized while preserving the decision concept.

The public demo uses the same material-readiness decision concepts as the production tool, but exact confidential thresholds and operating parameters are generalized for portfolio use.
