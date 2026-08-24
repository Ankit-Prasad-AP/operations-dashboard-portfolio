# VERIFY BEFORE PUSH — KEEP OUTSIDE THE REPOSITORY FOLDER

Run these checks on a local copy before publishing. Replace the placeholder patterns with real identifiers only in your local shell or in a private copy of this file. Do not place the filled-in verification file inside the Git repository.

## Real-identifier scan

```bash
grep -rniE "REAL_COMPANY|REAL_CUSTOMER|REAL_SUPPLIER|REAL_EMPLOYEE" production-quantity-material-readiness-planner/
```

Expected result: zero hits.

## Office/archive internal scan

```bash
find production-quantity-material-readiness-planner/   \( -name "*.xlsx" -o -name "*.xlsm" -o -name "*.zip" \)   -print0 |
while IFS= read -r -d '' f; do
  echo "== $f"
  unzip -p "$f" | grep -aicE "REAL_COMPANY|REAL_CUSTOMER|REAL_SUPPLIER|REAL_EMPLOYEE"
done
```

Every count must be zero.

## Manual checklist
- [ ] real-name grep returns zero
- [ ] Office archives scanned internally
- [ ] filenames contain no real identifiers
- [ ] sample files contain only synthetic data
- [ ] screenshots visually inspected for names, branding, paths, emails, tabs, titles, and codes
- [ ] image metadata contains no identifying information
- [ ] Load Demo Data produces the complete demo
- [ ] no upload is required in demo mode
- [ ] zero outbound network requests
- [ ] no real employer data embedded as base64
- [ ] no real employer data baked into JavaScript arrays
- [ ] no real operational files exist anywhere inside the Git package
- [ ] `git status` contains only expected portfolio files
- [ ] `VERIFY_BEFORE_PUSH.md` is NOT inside the repo folder
- [ ] no real identifier appears in any file inside `production-quantity-material-readiness-planner/`, including comments and docs
