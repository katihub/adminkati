# Stock adjustment: test documents

Manual test cases for stock management (single-product adjustments, Export, Adjust stock with review,
stale-file detection). Fixtures are in `files/`. Run everything as a **direction** user, with the
backend and `nuxt dev` restarted so they know the new routes and components.

## Baseline

The fixtures reference these ten active products of the local dev database. The quantities are the
stock **when the files were generated (2026-10-01)**.

| Product id | Name | Stock |
| --: | :-- | --: |
| 725 | HP ProDesk 400 G4 PC, 4 GB de RAM, Core i5 , 500 Go de Dis | 20 |
| 739 | HP ProDesk 600 G4 10eme gen Small Form Factor 8 GB de RAM, | 10 |
| 748 | Laptop HP Pavilion 15 Core i3, 8GB RAM, 1 To de disque dur | 16 |
| 796 | LAPTOP LENOVO THINKBOOK 15, CORE I7-1135G7 2.40GHZ, 11ieme | 24 |
| 978 | Routeur Cisco 1941-K9 – 2 ports Gigabit – Sécurisé et modu | 40 |
| 1028 | Routeur & Modem D-link DIR-612 Wireless N300 , 4 ports | 30 |
| 1038 | Routeur modem BOLT Wireless 3G 4G Mobile , GPRS et EDGE to | 12 |
| 1095 | Routeur TP-Link Archer C59 AC1350 Wireless Wi-Fi Dual Band | 18 |
| 1101 | Routeur TP-LINK TDW9970, 6 ports gigabits , IPTV | 6 |
| 1135 | Switch D-Link DGS-1024D 24-Port Gigabit Ethernet Rackable  | 50 |

Every case that applies changes moves stock. To return to the baseline, run **Adjust stock, Count**
with `files/00-baseline-restore.csv` (reason is in the file; type anything in the form). Cases that depend on the
baseline are marked **(needs baseline)**. If your stock differs from the table, regenerate the
expected numbers or restore first.

## Files

| File | Mode | What it contains |
| :-- | :-- | :-- |
| `00-baseline-restore.csv` | Count | All ten products at their baseline stock. |
| `01-reception-valid.csv` | Reception | Three products by id: +10, +5, +8. The last has no reason. |
| `02-reception-valid.xlsx` | Reception | Same as 01 plus a fourth row by slug (+4). Same data, XLSX format. |
| `03-reception-by-slug.csv` | Reception | Two products by slug: +4, +2. |
| `04-reception-blank-quantity.csv` | Reception | One row with a quantity (+3), three rows with an empty quantity. |
| `05-count-valid.csv` | Count | Targets: product 725 to baseline+5, 739 to baseline-3, 748 to baseline+1. |
| `06-count-no-change.csv` | Count | Five products whose targets equal baseline stock. |
| `07-count-drift.csv` | Count | With a `current_stock` column: 725 stale (file says baseline+2), 739 matches, 748 blank. |
| `08-count-invalid-current-stock.csv` | Count | `current_stock` values `abc` and `1.5`, plus one valid row. |
| `09-mixed-errors.csv` | Either | Nine data rows: 2 valid (the first row and the first of the duplicated product) and 7 that fail: unknown slug, negative quantity, non-integer quantity, the second row of a duplicated product, blank product, text quantity, 201-character reason. |
| `10-semicolon-french-headers.csv` | Reception | `;` delimiter and French headers `produit;quantite;motif`. |
| `11-utf8-bom-accents.csv` | Reception | UTF-8 with BOM and accented reasons. |
| `12-quoted-fields.csv` | Reception | Quoted reasons with a comma, doubled quotes and a line break. |
| `13-wrong-type.txt` | Either | A `.txt` file. |
| `14-empty.csv` | Either | Zero bytes. |
| `15-headers-only.csv` | Either | A header row and no data. |
| `16-missing-quantity-column.csv` | Either | No `quantity` column. |
| `17-limit-2000-rows.csv` | Reception | Exactly 2,000 active products, +1 each. |
| `18-over-limit-2001-rows.csv` | Reception | 2,001 rows. |
| `19-count-valid.xlsx` | Count | XLSX with a `current_stock` column, 725 to baseline+5 and 739 to baseline+2. |

The 5 MiB size limit needs a file too large to keep in the repo. Create it when needed:

```bash
python3 -c "print('product,quantity,reason'); [print('725,1,x') for _ in range(700000)]" > /tmp/oversize.csv && ls -l /tmp/oversize.csv
```

Check that it is over 5,242,880 bytes (add more rows if not).

## Cases

Reason text is free (at most 200 characters). "Preview" is the review screen after **Review changes**.

### A. Single product stock (no file)

| ID | Steps | Expected |
| :-- | :-- | :-- |
| A1 | Open product 725, Stock tab. | Current quantity and movement history shown. |
| A2 | Record a reception of +5 with a reason. | New history row (type reception, +5), quantity up by 5. |
| A3 | Record a correction that would go below zero. | Refused with an error, nothing written. |
| A4 | On a zero-stock product, mark restocking, then out of stock. | The status pill switches both ways. |

### B. Export

| ID | Steps | Expected |
| :-- | :-- | :-- |
| B1 | Filter by a search term (for example `routeur`). Export, Count, XLSX. | Dialog shows the filter and the matching count. File has exactly the filtered products, dated filename `stock-count-YYYY-MM-DD-HHmm.xlsx`, `quantity` pre-filled with current stock. |
| B2 | Same filters, Reception, CSV. | `quantity` is empty on every row. Opens in Excel with accents intact and `;` splitting columns. |
| B3 | Apply a brand filter and a stock filter together. Export. | Only products matching both. Same ids and order as the list. |
| B4 | Clear the filters. Export. | All active products. Above 2,000 rows the dialog warns the file must be split before import. |
| B5 | Filters that match nothing. | Export is disabled with a "no matches" message. |
| B6 | Include withdrawn products (state filter) and export Count. | Withdrawn products have an empty `quantity` (needs a withdrawn product in the data). |
| B7 | Export, then open the file in a text editor. | Product names starting with `=`, `+`, `-` or `@` are prefixed with `'` (needs such a product). |

### C. Adjust stock, reception

| ID | Steps | Expected |
| :-- | :-- | :-- |
| C1 | Reception with `01-reception-valid.csv`, review, apply. **(needs baseline)** | Preview: 3 will apply. Result: 3 applied. Stock 725 20 to 30, 739 10 to 15, 748 16 to 24. Row 3 has no reason of its own, so it uses the reason typed in the form. |
| C2 | Reception with `02-reception-valid.xlsx`. | XLSX read. The slug row resolves to product 796. |
| C3 | Reception with `03-reception-by-slug.csv`. | Both slugs resolve. |
| C4 | Reception with `04-reception-blank-quantity.csv`. | Preview: 1 will apply, 3 unchanged ("Quantity left empty, not changed"). |
| C5 | Reception with `10-semicolon-french-headers.csv`. | Both rows apply. |
| C6 | Reception with `11-utf8-bom-accents.csv` and `12-quoted-fields.csv`. | Accents and the multi-line quoted reason are stored as written. |
| C7 | Review, then press **Back**. Change the reason. Review again. | The preview is recomputed. Apply is only offered for the current inputs. |
| C8 | Review, then close the dialog during the review. | Nothing written. Reopening starts from setup. |

### D. Adjust stock, count

| ID | Steps | Expected |
| :-- | :-- | :-- |
| D1 | Count with `05-count-valid.csv`. **(needs baseline)** | Preview shows the corrections (725 to baseline+5, 739 down 3, 748 up 1). After apply, stock equals the targets. The Stock tab shows correction movements. |
| D2 | Count with `06-count-no-change.csv`. **(needs baseline)** | 5 unchanged, "Stock already at this quantity", 0 will apply, a "Nothing to apply" notice and no Apply button. |
| D3 | Count with `19-count-valid.xlsx`. **(needs baseline)** | Reads as XLSX, 2 will apply. |

### E. Stale files (drift), count mode only

| ID | Steps | Expected |
| :-- | :-- | :-- |
| E1 | Count with `07-count-drift.csv`. **(needs baseline)** | 725 flagged "Exported at 22, now 20" and skipped. 739 applies. 748 (blank reference) applies, unflagged. |
| E2 | Same file, switch on **Apply these rows anyway**. | The preview re-runs: 725 now applies. |
| E3 | Apply E1 with the switch off. | 725 writes nothing and its stock is unchanged. The result notes rows skipped because stock changed. |
| E4 | Count with `08-count-invalid-current-stock.csv`. | `abc` and `1.5` rows fail with "Invalid current_stock value". The third row applies. |
| E5 | Real round trip: Export Count. Make a manual adjustment on one product. Import the untouched export. | That product is flagged as changed since export. Nothing is overwritten. |
| E6 | Preview a clean file, then change a product's stock manually, then Apply. | The result shows that row as skipped (stock changed) even though the preview said it would apply. |
| E7 | Reception mode with `07-count-drift.csv`. | No drift flags (reception adds to stock). |

### F. Errors and file validation

| ID | Steps | Expected |
| :-- | :-- | :-- |
| F1 | Either mode with `09-mixed-errors.csv`, review. | 2 will apply and 7 fail, each failure with its own message (unknown product, invalid quantity, duplicate product, missing product, invalid reason). **Download error file** works. Apply applies only the 2 valid rows. |
| F2 | Pick `13-wrong-type.txt`. | Rejected on the form: "Choose a CSV or XLSX file". Nothing sent. |
| F3 | Pick `14-empty.csv`. | Rejected: the file is empty. |
| F4 | Pick `15-headers-only.csv`. | Rejected: no data rows. |
| F5 | Pick `16-missing-quantity-column.csv`. | Rejected: required columns missing. |
| F6 | Pick the oversize file (see Files). | Rejected on the form: larger than 5 MB. |
| F7 | Stop the backend and press **Review changes**. | A retry screen that says nothing was written. After restarting the backend, **Retry preview** works. |
| F8 | Lose the connection after pressing **Apply** (stop the backend mid-request). | A message that the adjustment may have been applied. **Retry** reuses the same file and key, and nothing is applied twice. |

### G. Limits

| ID | Steps | Expected |
| :-- | :-- | :-- |
| G1 | Reception with `17-limit-2000-rows.csv`, review. | 2,000 rows accepted. The table scrolls and Apply stays visible. |
| G2 | Reception with `18-over-limit-2001-rows.csv`. | Rejected: more than 2,000 rows. |
| G3 | Apply G1 (this moves 2,000 products by +1). | Result of 2,000 applied. Completes without a timeout locally. Note the time. |

### H. Access and language

| ID | Steps | Expected |
| :-- | :-- | :-- |
| H1 | Log in as a non-direction role (comptoir). | No **Adjust stock** or **Export** button. |
| H2 | Switch the interface to French and repeat B1, C1, E1, F1. | All copy is French, with no raw keys. Dates and numbers formatted for French. |
| H3 | Light and dark theme through B1, C4, E1. | No unreadable text, nothing overflowing the dialog. |

### I. Ordering

| ID | Steps | Expected |
| :-- | :-- | :-- |
| I1 | Sort by name and by price. Page through the list, then export with the same filters. | Same product order in the list and the file. No product appears twice or goes missing across pages. Products with the same name or price are ordered newest first. |

## After testing

Restore the baseline with `files/00-baseline-restore.csv` (Count). The movements stay in each
product's history, because the ledger is append-only.
