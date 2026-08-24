# VERIFY BEFORE PUSH — KEEP OUTSIDE THE REPOSITORY

This file must remain outside `cream-tanker-planning/`. Do not copy it into GitHub. Replace the placeholder scan terms only in your local copy or shell command.

## 1. Confirm package location

```bash
ls -la cream-tanker-planning/
test ! -e cream-tanker-planning/VERIFY_BEFORE_PUSH.md && echo "PASS: verification file is outside repo folder"
```

## 2. Scan text files for real identifiers

Substitute your real names only when you run this command locally.

```bash
grep -rniE "REAL_COMPANY|REAL_CUSTOMER|REAL_SUPPLIER|REAL_EMPLOYEE|REAL_BRAND|REAL_ITEM_CODE|REAL_MATERIAL_CODE" cream-tanker-planning/
```

Expected result: zero hits.

## 3. Scan Office/ZIP archives internally

```bash
find cream-tanker-planning/ \( -name "*.xlsx" -o -name "*.xlsm" -o -name "*.zip" \) -print0 |
while IFS= read -r -d '' f; do
  echo "== $f"
  unzip -p "$f" | grep -aicE "REAL_COMPANY|REAL_CUSTOMER|REAL_SUPPLIER|REAL_EMPLOYEE|REAL_BRAND|REAL_ITEM_CODE|REAL_MATERIAL_CODE"
done
```

Every count must be zero. This dashboard currently uses CSV sample data and should contain no Office files inside the repo folder.

## 4. Check forbidden tracked file types and filenames

```bash
find cream-tanker-planning/ -maxdepth 3 -type f -print | sort
find cream-tanker-planning/ -type f \( -name "*.xlsx" -o -name "*.xlsm" -o -name "*.pbix" \) -print
```

The second command should return nothing. Synthetic CSV files are allowed only under `sample_data/`.

## 5. Check for outbound network code

```bash
grep -rniE "https?://|fetch\(|XMLHttpRequest|WebSocket|google-analytics|gtag\(" cream-tanker-planning/ --exclude="*.png"
```

Expected result: zero hits.

## 6. Git status before commit

From the portfolio repository root:

```bash
git status --short
git check-ignore -v dashboards/cream-tanker-planning/sample_data/synthetic_schedule.csv || true
```

Review every changed file. `config.real.js`, production dashboards, and real operational files must not appear.

## Manual checklist
- [ ] real-name grep returns zero
- [ ] Office archives scanned internally
- [ ] filenames contain no real identifiers
- [ ] sample files contain only synthetic data
- [ ] screenshots visually inspected for names, branding, paths, emails, tabs, titles, and codes
- [ ] portfolio overview looks polished at desktop width: hero, KPI cards, allocation bars, and planner takeaway are aligned and readable
- [ ] Page 1 and Page 2 show no production-only disabled upload/export controls in the public demo
- [ ] visible copy contains no TODOs, placeholders, awkward wording, or inconsistent terminology
- [ ] image metadata contains no identifying information
- [ ] Load Demo Data produces the complete demo
- [ ] no upload is required in demo mode
- [ ] zero outbound network requests verified in browser DevTools Network tab during a full demo run
- [ ] no real employer data embedded as base64
- [ ] no real employer data baked into JavaScript arrays
- [ ] no real operational files exist anywhere inside the Git package
- [ ] `git status` contains only expected portfolio files
- [ ] `VERIFY_BEFORE_PUSH.md` is NOT inside the repo folder
- [ ] no real identifier appears in any file inside `cream-tanker-planning/`, including comments and docs
- [ ] open `index.html` locally from `file://` and run Load Demo Data successfully
- [ ] after publishing, verify the GitHub Pages URL in a clean/incognito browser
