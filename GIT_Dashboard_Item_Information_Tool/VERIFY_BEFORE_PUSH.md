# VERIFY BEFORE PUSH — KEEP THIS FILE OUTSIDE THE REPOSITORY

This checklist is intentionally outside the repo-ready dashboard folder. Replace the placeholder tokens only in a private local copy or directly in your shell. Never save real employer/customer/supplier identifiers inside the Git repository.

## 1. Scan all public text/source files for real identifiers

From the folder that contains `item-readiness-material-planning/`:

```bash
grep -rniE "REAL_COMPANY|REAL_CUSTOMER|REAL_SUPPLIER|REAL_EMPLOYEE|REAL_ITEM_CODE|REAL_MATERIAL_CODE" item-readiness-material-planning/
```

Expected result: **zero hits**.

## 2. Scan Office and ZIP archives internally

```bash
find item-readiness-material-planning/   \( -name "*.xlsx" -o -name "*.xlsm" -o -name "*.zip" \) -print0 |
while IFS= read -r -d '' f; do
  echo "== $f"
  unzip -p "$f" | grep -aicE "REAL_COMPANY|REAL_CUSTOMER|REAL_SUPPLIER|REAL_EMPLOYEE|REAL_ITEM_CODE|REAL_MATERIAL_CODE"
done
```

Every printed count must be zero. The current package uses CSV synthetic samples rather than Office files, so this command may print nothing; keep it for future portfolio revisions.

## 3. Check for outbound network dependencies

```bash
grep -rniE "https?://|cdn\.|fetch[[:space:]]*\(|XMLHttpRequest|sendBeacon|google-analytics|gtag[[:space:]]*\(" item-readiness-material-planning/
```

Expected result: zero runtime-network dependencies. A URL appearing only as plain documentation text should still be reviewed manually.

## 4. Check for accidentally embedded operational files/data

```bash
find item-readiness-material-planning/ -type f -maxdepth 4 -print
find item-readiness-material-planning/ -type f   \( -name "*.xlsx" -o -name "*.xlsm" -o -name "*.pbix" \) -print
```

Only expected portfolio files and synthetic samples should appear.

## 5. Git review

After copying only `item-readiness-material-planning/` into `operations-dashboard-portfolio/dashboards/`:

```bash
git status --short
git diff -- dashboards/item-readiness-material-planning/
```

Review every changed file before committing.

## Manual checklist
- [ ] Aesthetic Excellence: redesigned command center renders cleanly at desktop width
- [ ] KPI cards, demand comparison, material-health visual, and action center populate after Load Demo Data
- [ ] recruiter-facing copy is proofread and no placeholder text remains
- [ ] real-name grep returns zero
- [ ] Office archives scanned internally
- [ ] filenames contain no real identifiers
- [ ] sample files contain only synthetic data
- [ ] screenshots visually inspected for names, branding, paths, emails, tabs, titles, codes
- [ ] image metadata contains no identifying information
- [ ] Load Demo Data produces the complete demo
- [ ] no upload is required in demo mode
- [ ] zero outbound network requests
- [ ] no real employer data embedded as base64
- [ ] no real employer data baked into JavaScript arrays
- [ ] no real operational files exist anywhere inside the Git package
- [ ] `git status` contains only expected portfolio files
- [ ] `VERIFY_BEFORE_PUSH.md` is NOT inside the repo folder
- [ ] no real identifier appears in any file inside `item-readiness-material-planning/`, including comments and docs
