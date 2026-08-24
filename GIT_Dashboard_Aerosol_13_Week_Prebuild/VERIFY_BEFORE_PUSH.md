# VERIFY BEFORE PUSH — KEEP OUTSIDE THE REPO FOLDER

Run these checks against `manufacturing-13-week-prebuild-planner/` before copying it into the public repository. Replace the placeholders in the scan command in your local shell only; do not save real identifiers inside the repo folder.

## Real-name scan
```bash
grep -rniE "REAL_COMPANY|REAL_CUSTOMER|REAL_SUPPLIER|REAL_EMPLOYEE" manufacturing-13-week-prebuild-planner/
```
Expected result: zero hits.

## Office/archive scan
```bash
find manufacturing-13-week-prebuild-planner/   \( -name "*.xlsx" -o -name "*.xlsm" -o -name "*.zip" \)   -print0 |
while IFS= read -r -d '' f; do
  echo "== $f"
  unzip -p "$f" | grep -aicE "REAL_COMPANY|REAL_CUSTOMER|REAL_SUPPLIER|REAL_EMPLOYEE"
done
```
Every count must be zero.

## Network scan
```bash
grep -rniE "https?://|fetch\(|XMLHttpRequest|navigator\.sendBeacon|analytics|googletag" manufacturing-13-week-prebuild-planner/
```
Review every hit. The dashboard itself should make zero outbound network requests.

## Manual checklist
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
- [ ] no real identifier appears in any file inside `manufacturing-13-week-prebuild-planner/`, including comments and docs
