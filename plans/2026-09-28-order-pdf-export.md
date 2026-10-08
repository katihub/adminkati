# Order PDF export

## Goal

From the full order detail view, any order role can export the selected order as a PDF — order
summary, customer invoice, or packing slip — in French or English, chosen per export. Every
export is audited in the backend's append-only journal.

Approved scope adjustment: **the backend contract is specified in
[`BACKEND_REQUIREMENTS.MD`](../BACKEND_REQUIREMENTS.MD); this plan builds only the admin UI.**
The UI calls the endpoint and surfaces a clean error until the backend lands.

## Data contract

New endpoint (backend to build, spec in BACKEND_REQUIREMENTS.MD):

```
GET /api/v1/commandes/:reference/export?document=recapitulatif|facture|bon-preparation&locale=fr|en
```

- 200 `application/pdf`, `Content-Disposition: attachment; filename="<ref>-<doc>-<locale>.pdf"`.
- 400 unknown document; 401/403 per guards; 404 unknown reference.
- Backend journals `commande.exportee` per export and projects per caller role.

## Decisions and reuse

- Generation is backend-side (pdfkit), never in the browser: only the backend can journal the
  export, and `projeterCommandeEquipe` decides what each role may see.
- The export control is **always visible** on a loaded order — beside the `v-if="hasActions"`
  block in `DetailPanel.vue`'s `#actions` slot, not inside it, not in `OrdersActionBar`
  (status transitions only), not in the list panels (no line/customer data there anyway).
- Dialog reuses the `PaymentDialog.vue` shape: `Dialog` + `Select` components, `apiErrorText`
  for failures, `defineModel<boolean>("open")`.
- Download is a client-side blob fetch (`$fetch` with `responseType: "blob"`) turned into an
  object-URL anchor click, so a backend error body can be read and shown in the dialog instead
  of navigating away.
- Language select defaults to the active UI locale.
- Until the backend ships, any export attempt shows the dialog error state. That is correct
  behavior, not a gap in this plan.

## Tasks

### 1. Types — `app/types/api/commandes.ts`

Add `ExportDocument = "recapitulatif" | "facture" | "bon-preparation"` and
`ExportDocumentLocale = "fr" | "en"` with the file-and-line citation convention this file uses
(point at `BACKEND_REQUIREMENTS.MD` until the backend code exists).
**Done when:** `bun run typecheck` accepts the new exports.

### 2. Export URL helper — `app/utils/order-export.ts`

`orderExportUrl(reference, document, locale)` →
`/api/v1/commandes/<encoded ref>/export?document=…&locale=…`, and
`orderExportFilename(reference, document, locale)` → `<ref>-<doc>-<locale>.pdf`.
**Done when:** `test/unit/order-export.test.ts` passes (encoding, filename shape).

### 3. Export dialog — `app/components/orders/ExportDialog.vue`

- Props: `reference: string`. Model: `open`.
- Fields: document select (three options, translated labels), language select (fr/en, default
  `useI18n().locale`).
- Confirm: `$fetch<Blob>(orderExportUrl(...), { responseType: "blob" })`, then create an object
  URL, click a temporary anchor with `orderExportFilename(...)` as `download`, revoke the URL.
- Busy state on confirm; failure → `apiErrorText(error, t)` in a `role="alert"` line, dialog
  stays open; success → dialog closes.
**Done when:** `test/nuxt/orders-export-dialog.test.ts` passes.

### 4. Detail header button — `app/components/orders/DetailPanel.vue`

Add an outline `Export…` button (`ph:file-pdf`) **outside** the `v-if="hasActions"` div in the
`#actions` template, opening `ExportDialog`.
**Done when:** `test/nuxt/orders-detail-workspace.test.ts` shows the trigger on a closed order
(no transitions, nothing to collect), and the dialog opens from it.

### 5. i18n — `i18n/locales/orders/en.json`, `fr.json`

`orders.export.*`: `trigger`, `title`, `description`, `document`, `documents.{recapitulatif,
facture,bon-preparation}`, `language`, `languages.{fr,en}`, `cancel`, `confirm`,
`downloading`, `failed` (fallback handled by `apiErrorText`).
**Done when:** `bun run i18n:check` passes.

## Tests

- `test/unit/order-export.test.ts` — URL encoding and filename shape.
- `test/nuxt/orders-export-dialog.test.ts` — lists three documents; language defaults to the UI
  locale; confirm requests the expected URL (mock `$fetch`); error body becomes the inline
  error and the dialog stays open; success closes it.
- `test/nuxt/orders-detail-workspace.test.ts` — export trigger visible when the order has no
  available actions.

## States

Loading: confirm button busy. Error: translated inline message, dialog stays open. Empty:
impossible (dialog only exists on a loaded order). Backend absent: same error path.

## Risks

- **`sendProxy` binary passthrough** — verified live once the backend exists; if
  `Content-Disposition` does not survive the BFF, the filename falls back to
  `orderExportFilename`, which the UI always sets anyway.
- **`$fetch` blob typing under happy-dom** — the nuxt test mocks `$fetch`; the assertion is on
  the requested URL, not real bytes.

## Out of scope

Backend implementation (spec only, in BACKEND_REQUIREMENTS.MD), list/bulk export, quotes
export, emailing, audit viewer.
