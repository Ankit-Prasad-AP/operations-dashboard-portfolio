# Screenshot Capture List

No dashboard screenshots were generated in this build environment because the available headless Chromium process did not complete even for a minimal page. Do not treat that as a dashboard failure; capture the following locally after browser verification.

1. `demo_overview.png` — open `index.html?demo=1` at roughly 1440 px wide. Capture the header, What This Does, demo controls, KPI row, and Planner Decision Summary.
2. `demo_plan_and_risks.png` — with demo data loaded, scroll so the 13-Week Production Plan and Risks and Exceptions tables are both visible. Capture at roughly 1440 px wide.
3. Visually confirm every screenshot contains only synthetic identifiers such as `SKU-0001`, generic product families, and generic site/line labels.
4. Remove image metadata if your screenshot tool adds identifying author, device, or path information.
