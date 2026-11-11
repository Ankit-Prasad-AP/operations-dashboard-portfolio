# Replacements

Everything in `data/` is synthetic. It keeps the exact file layouts, sheet names, header rows and the planning situations of the real exports, and replaces every value that could identify the company, its customers, suppliers, people or products. No row was copied from a real file.

| Category | Real → demo | Method |
|----------|-------------|--------|
| Company, plant, locations | → "the plant", fictional cities and 27xxx zip codes | Word list |
| Finished-item codes | real pattern → `A` + 4 digits, original suffix kept (`-S`, `-A`, …) | One-to-one random map, consistent across all files and both tools |
| Material codes | real 5-digit codes → new 5-digit codes with the same leading digits (cans, caps, cases, ingredients keep their class) | One-to-one random map avoiding every real code |
| Item descriptions | brand words → generic or fictional brand words; fat %, style, pack and size kept | Token dictionary |
| Formula names | brand tokens → neutral tokens; family words (fat %, style) kept | Token dictionary |
| Customers, ship-tos, account executives, brokers | → fictional company and person names (e.g. Harborline Foods, Meridian Coffee Co, Northgate Dairy) | Fixed fictional pool; three contract customers mapped one-to-one so their plan files still work |
| Lot, PO, sales order, batch numbers | → new numbers of the same shape | Regenerated |
| Quantities (forecast, sold, on hand, orders, production) | → scaled 0.75–1.35 per item plus noise | Per-item factor so ratios inside an item stay believable |
| Dates | → shifted so the snapshot is Wed Oct 14, 2026 (schedule week Mon Oct 12) | Constant shift; weekday structure kept |
| File names | → neutral names with the same role | Renamed |
| System names (ERP, warehouse system, planning system), people, internal tool names | → generic role words | Word list, also applied to the tool HTML |
| Demo-only additions | three contract-customer plan files and next-year forecast files built from the synthetic set; five planning situations planted (an LTO item with orders above forecast, an item with its tightest material at zero on hand and a PO due in 9 days, a lot expiring in 21 days, a two-period forecast gap, a combo item with a short component) | Generated |

The replacement maps are not published. A scan of the published folder for the company, plant, customer, supplier and people names, the real item-code pattern, real material, lot, PO and order numbers, system names, work email and phone, real input dates and real file names returns zero hits (`SCAN.txt` at the repository root).
