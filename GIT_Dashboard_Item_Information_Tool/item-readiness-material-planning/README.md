# Manufacturing Readiness Command Center

A recruiter-facing, synthetic portfolio demo of an item-level production and material planning system. It turns disconnected demand, inventory, schedule, bill-of-materials, inbound-supply, shelf-life, and transition signals into a single readiness decision.

## Why it exists
Production planners rarely make decisions from one clean dataset. Forecasts, sold volume, open orders, finished-goods inventory, planned production, material balances, purchase orders, lot life, and packaging changes often live in separate extracts. This dashboard brings those signals together so a planner can answer four questions quickly:

1. **What must be ready now and next?**
2. **What is already scheduled versus only proposed?**
3. **Which material becomes the constraint?**
4. **What action should happen before the schedule is released?**

## Portfolio experience
The public version opens with a polished **Readiness Command Center** designed for a 60–90 second recruiter walkthrough. After **Load Demo Data** is selected, it shows:

- a composite production-readiness score and release recommendation;
- current-period demand exposure and immediate-next-period preparedness;
- actual scheduled production kept separate from future proposed production;
- material coverage for the selected scenario;
- a two-period demand and planning comparison chart;
- a material-health visual with the current bottleneck;
- a prioritized planner action center;
- quick switching across multiple synthetic finished items;
- deeper item, bill-of-materials, lot-life, transition, and shared-component analysis.

The detailed planning pages remain available below the command center for technical depth.

## Demo data
All public data is deterministic and synthetic. The included sample state intentionally contains both healthy and at-risk conditions so the dashboard demonstrates why the planning system matters rather than presenting a perfect dataset.

Representative demo scenarios include:

- an item with an actual schedule and a timing-sensitive component risk;
- a seasonal item with an ingredient constraint and later inbound supply;
- a customer-directed item with a future production command;
- shelf-life lots with editable remaining-life thresholds;
- a packaging transition requiring cutover confirmation;
- a shared component that can be explored through the relationship view.

Use **Inspect Sample Inputs** to view the synthetic CSV structures. No operational workbooks are required for the public demo.

## Decision logic demonstrated publicly
The portfolio edition intentionally explains the planning concepts without exposing confidential operating parameters.

- Current open orders come from the active open-order dataset.
- Historical sales is readiness context only; it is never treated as current open demand.
- Current and immediate-next planning periods are shown together; farther periods are not pulled into the readiness calculation.
- Actual scheduled production and future proposed production are separate scenarios.
- Material analysis can compare either scenario.
- On-hand inventory and eligible inbound supply are evaluated against scenario consumption.
- Cream and water remain visible in the detailed model but are treated as non-limiting planning references.
- Public thresholds and identifiers are generalized demonstration values, not employer policy.

## Pages
### Page 1 · Item Information
Executive readiness cockpit plus detailed finished-item demand, schedule, proposed-production, materials, lot-life, and transition analysis.

### Page 2 · Bill of Materials
Interactive component hierarchy with per-case consumption, inventory support, inbound supply context, and material details.

### Page 3 · Material Relationships
Where-used relationship view for understanding shared components and the finished items they can affect.

## Privacy and architecture
- Static HTML, CSS, and JavaScript.
- No build step.
- No external runtime libraries.
- No outbound network requests.
- No analytics or tracking.
- All demo data is synthetic.
- No employer, customer, supplier, item, material, order, schedule, or source-file identifiers from the production environment are included.

The public package uses generic configuration and generalized parameters while retaining the same planning concepts and shared decision engine used by the private production tool.

## Operational value
The system demonstrates how a planner can reduce manual cross-file reconciliation, surface material risk earlier, separate actual schedules from preparedness scenarios, make transition decisions more visible, and create a repeatable item-readiness review before production is finalized.

## Local use
Open `index.html` in a browser and select **Load Demo Data**. For the portfolio site, place this entire folder under:

`operations-dashboard-portfolio/dashboards/item-readiness-material-planning/`

The expected GitHub Pages path is documented in the outer handoff package.
