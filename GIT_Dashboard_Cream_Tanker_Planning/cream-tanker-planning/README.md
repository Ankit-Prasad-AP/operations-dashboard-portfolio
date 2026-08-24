# Cream Demand & Tanker Allocation

## Business Problem
Manufacturing planners can know the total amount of a bulk ingredient required for a schedule and still make the wrong delivery decision when storage is separated by site. A physical tanker is an indivisible load: once assigned to one destination, leftover material at that site cannot automatically cover another site. The timing problem is also continuous because production consumes material throughout each run, not all at the start.

## What the Dashboard Does
- Converts a multi-line production schedule into time-phased Standard and Organic cream demand.
- Splits cross-midnight production into the correct calendar-day consumption.
- Compares aggregate tanker-equivalent demand with a physical whole-tanker site allocation plan.
- Projects continuous site balances and identifies when the next whole tanker must be available at the central receiving point.
- Shows destination, timing, active production, consumption rate, cumulative use, and remaining site balance for each tanker decision.
- Provides a deterministic one-click synthetic demonstration with both healthy coverage and the operational exception created by non-transferable site inventory.

## Inputs
The production system consumes a weekly production schedule plus optional item-master, bill-of-material, and inventory reference files. The public portfolio demo does not require uploads. `Load Demo Data` loads a deterministic synthetic schedule in memory, and the `sample_data/` folder contains inspectable CSV examples of the expected data concepts.

## Key Decisions and Outputs
A planner can use the dashboard to determine how much cream is required by day and line, how many aggregate tanker equivalents the schedule represents, how many physical whole tankers are actually required after site constraints, which destination receives each tanker, and the receiving deadline needed to avoid a site shortage. The demo intentionally shows a case where aggregate volume requires 9 tanker-equivalents while the physical site plan requires 10 whole tankers because remaining inventory cannot be transferred between independent sites.

## Workflow
1. Read scheduled quantity, production line, start/finish time, and cream-per-case requirement.
2. Allocate cream consumption continuously across each run and split cross-midnight usage by calendar day.
3. Combine production lines that share a configured destination balance while keeping independent sites separate.
4. Track cumulative site consumption against whole-tanker capacity already assigned to that site.
5. When the projected site balance would reach zero, assign another complete tanker to that destination.
6. Move the tanker deadline earlier by the configured receiving lead time so material is available before the site needs it.
7. Present both a quick aggregate view and a physical dispatch plan with auditable site balances.


## Portfolio Experience
The public version is intentionally designed as an executive-ready decision cockpit rather than an internal spreadsheet clone. A recruiter can load the scenario in one click, see the aggregate-versus-physical tanker gap, understand destination allocation visually, and then drill into the daily demand, whole-tanker dispatch plan, and site balance ledger. The synthetic scenario includes both a healthy no-short condition and a meaningful planning exception so the business value is visible immediately.

## Visual Story
1. **Context:** a multi-line schedule creates time-phased bulk-ingredient demand.
2. **Key signal:** aggregate tanker equivalents are compared with the physical whole-load plan.
3. **Constraint:** leftover material is non-transferable across independent destinations.
4. **Decision:** tanker deadlines are sequenced by earliest projected site shortage.
5. **Audit:** daily demand, run detail, and site balance ledgers explain every recommendation.

## Technologies Used
Browser-based HTML, CSS, and JavaScript; configuration-driven business rules; deterministic synthetic demo data; client-side time-phased calculations; local CSV examples. The public demo requires no framework, no build step, no analytics, and no server.

## Operational Value
The tool standardizes a planning decision that is easy to understate with aggregate volume math: total material may be sufficient while a specific site still shorts because a tanker cannot be split after assignment. It improves delivery timing visibility, site-level material readiness, schedule-to-material alignment, and planning discipline while reducing manual time-phased calculations.

## Data Privacy and Synthetic Data Notice
All data in this portfolio package is synthetic. No employer, customer, supplier, brand, item, material, purchase-order, sales-order, employee, email, network-path, or source-workbook data is included. The public demo runs fully client-side and makes no outbound network requests.

Confidential operating parameters are intentionally generalized in the public configuration. The demo uses synthetic settings of a 45,000 lb tanker capacity, a 6-hour receiving lead, and a 1.5% additional-use factor. These values demonstrate the decision method and are not production policy. Site names and material identifiers are also synthetic. The production and portfolio builds use the same `engine.js`; differences are confined to configuration, synthetic demo data, generalized parameters, and portfolio-only explanatory UI.
