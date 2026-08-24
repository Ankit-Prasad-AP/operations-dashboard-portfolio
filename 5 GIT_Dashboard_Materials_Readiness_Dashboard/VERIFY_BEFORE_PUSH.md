# VERIFY BEFORE PUSH

Keep this file outside the repository folder. Do not copy it into `operations-dashboard-portfolio/dashboards/manufacturing-materials-readiness/`.

Before running the real-name scan, replace the placeholders only in your local shell command or in a private copy of this file kept outside Git.

## 1. Real-name scan
```bash
grep -rniE "REAL_COMPANY|REAL_CUSTOMER|REAL_SUPPLIER|REAL_EMPLOYEE" manufacturing-materials-readiness/
```
Expected result: zero hits.

## 2. Scan Office and ZIP archives internally
```bash
find manufacturing-materials-readiness/ \
  \( -name "*.xlsx" -o -name "*.xlsm" -o -name "*.zip" \) -print0 |
while IFS= read -r -d '' f; do
  echo "== $f"
  unzip -p "$f" | grep -aicE "REAL_COMPANY|REAL_CUSTOMER|REAL_SUPPLIER|REAL_EMPLOYEE"
done
```
Every count must be zero.

## 3. Runtime/network check
Open the extracted `manufacturing-materials-readiness/index.html` in a normal browser.

- Click **Load Demo Data**.
- Open DevTools → Network.
- Reload and interact with the demo.
- Expected: zero outbound requests; no remote fonts, analytics, scripts, APIs, or tracking.
- Test direct local/offline operation, including `file://` if required by the publication standard.

## 4. Functional demo check
Confirm the following all populate and behave correctly:
- [ ] KPI cards
- [ ] Readiness Mix
- [ ] Daily Production Load
- [ ] Planner Action Queue
- [ ] Material Exposure
- [ ] Action Callouts
- [ ] Risk / PO-Transition / Data-Cleanup filters
- [ ] Callout search
- [ ] Can / Case / Valve / Batching Material Usage tabs
- [ ] Case Consumption by calendar day
- [ ] Physical Can Verification
- [ ] light/dark appearance toggle
- [ ] Reset / Load Demo Data flow

## 5. Aesthetic / recruiter-quality check
The public demo is a portfolio showcase, not an internal spreadsheet clone. Verify:
- [ ] hero and headline look polished at first load
- [ ] KPI cards have consistent alignment, spacing, and hierarchy
- [ ] charts/visuals are readable and support decisions rather than decorate
- [ ] risk, caution, covered, and informational colors are consistent
- [ ] tables have clean headers, alignment, spacing, and status badges
- [ ] no text overlaps, clipping, accidental scrollbars, or broken mobile layout
- [ ] desktop and narrow/mobile widths both look intentional
- [ ] all visible wording is grammatically clean and typo-free
- [ ] synthetic demo includes healthy, managed, and at-risk conditions
- [ ] a recruiter can understand the problem → readiness → risks → action flow in about 90 seconds
- [ ] the portfolio page looks visually stronger than the production utility UI
- [ ] screenshots show only synthetic data and are visually portfolio-worthy

## 6. Privacy/content checklist
- [ ] real-name grep returns zero
- [ ] Office archives scanned internally
- [ ] filenames contain no real identifiers
- [ ] sample files contain only synthetic data
- [ ] screenshots visually inspected for names, branding, paths, emails, tabs, titles, and codes
- [ ] image metadata contains no identifying information
- [ ] no real employer data embedded as base64
- [ ] no real employer data baked into JavaScript arrays
- [ ] no real operational files exist anywhere inside the Git package
- [ ] no confidential exact operating threshold/rule is unintentionally exposed
- [ ] no real identifier appears in comments or documentation

## 7. Git/repository check
- [ ] `git status` contains only expected portfolio files plus the intentional root landing-page edit
- [ ] `VERIFY_BEFORE_PUSH.md` is NOT inside the repo folder
- [ ] the private `production/` folder is NOT copied into GitHub
- [ ] only the repo-ready `manufacturing-materials-readiness/` folder is placed under `dashboards/`
- [ ] the root landing-page link points to the correct slug

## 8. Known architecture limitation
The current public demo has **not** been proven to consume one extracted code-level business engine shared with production v48. Do not describe it as code-level identical to production unless that refactor/regression test is completed separately.

## Expected repo folder
Only copy:
```text
manufacturing-materials-readiness/
```
into:
```text
operations-dashboard-portfolio/dashboards/
```

Do not copy the production dashboard or this verification file into the public repository.
