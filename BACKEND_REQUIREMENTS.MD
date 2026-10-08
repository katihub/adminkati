# Backend requirements — Order PDF export

> Written from `plans/2026-09-28-order-pdf-export.md`. The admin UI for this feature is being
> built now and calls the endpoint specified below; until this backend work lands, every export
> attempt correctly surfaces an error to the operator.

## Endpoint

```
GET /v1/commandes/:reference/export?document=<type>&locale=<fr|en>
```

- **`document`** (required): `recapitulatif` (order summary) | `facture` (customer invoice) |
  `bon-preparation` (packing slip). Anything else → `400`.
- **`locale`**: `fr` | `en`, default `fr`.
- **Success**: `200`, `Content-Type: application/pdf`,
  `Content-Disposition: attachment; filename="<reference>-<document>-<locale>.pdf"`.
- **Errors**: `404` unknown reference; `401`/`403` per the existing guards.

## Authorization

Same guard as the existing `@Get(':reference')` in `src/commandes/commandes.controller.ts` —
all four order roles (`direction`, `comptoir`, `preparation`, `livreur`) may export.

**The PDF must be built from `projeterCommandeEquipe(commande, appelant.roles)`** (the
projection already used at `commandes.service.ts:596,626,739`). Each role exports exactly what
it can already read on screen:

- `preparation` (and any role whose projection omits them) gets **no prices, no payment status,
  no totals, no customer contact** — those blocks are absent from the document, not blanked.
- The packing slip never carries prices for anyone.

## Audit

Every successful export appends one entry through the existing `JournalService.consigner`
(`src/commun/journal/journal.service.ts`, append-only `journal` table):

| Field | Value |
| :-- | :-- |
| `action` | `commande.exportee` |
| `cibleType` / `cibleId` | `commande` / the order reference |
| `acteurType` / `acteurId` / `acteurRole` | the calling team member and the role they acted under |
| `ip` / `agent` | from the request, as other entries do |
| `detail` | `{ "document": "<type>", "locale": "<fr|en>" }` |

If the journal write fails, follow the existing `consigner` convention (log loudly, per
`journal.service.ts:57-59`).

## Documents

Three branded, bilingual documents rendered from the projected order:

| Document | Content |
| :-- | :-- |
| `recapitulatif` | Shop header, reference, status, dates, customer + delivery block, lines table, totals when present |
| `facture` | Same body, invoice heading, payment state and remaining balance when present |
| `bon-preparation` | Reference, dates, lines with quantities (`quantite`, `quantiteRemise`, `statutLigne`), delivery address, courier — **no money at all** |

- French/English label dictionaries live in the backend (the backend renders the document).
- Shop identity (name/address) is static backend configuration — it is not order data.
- The invoice is a commercial document, **not** a certified tax invoice: tax breakdown, company
  registration, and customer email do not exist in the data model today.
- Amounts are integer XAF (no subdivision — see `prisma/schema.prisma` header).

## Suggested implementation

- `pdfkit` (+ `@types/pdfkit`) — streaming, no headless browser; its built-in Helvetica covers
  French accents.
- `src/commandes/export/commande-pdf.service.ts` — renders one PDF from (projected order,
  document type, locale).
- `src/commandes/export/commande-pdf-textes.ts` — the `fr`/`en` label dictionaries.
- `CommandesService.exporterPdf(reference, query, appelant, req)` — load, project, journal,
  render. Controller returns a `StreamableFile`.

## Tests

- `commande-pdf.service.spec.ts`: non-empty PDF bytes per document type; packing slip contains
  no price figures; financier blocks absent when the projection omits them; both locales render.
- Service spec: `journal.consigner` called once with `commande.exportee` and the
  `{ document, locale }` detail.

## Notes for integration

- The admin reaches this through the existing BFF catch-all (`server/api/v1/[...path].ts`),
  which proxies GET + query unchanged. Verify `Content-Type: application/pdf` and
  `Content-Disposition` survive `sendProxy` — that check is part of the admin walkthrough.
- The global throttler is a shared 10 rps ceiling; PDF rendering must not issue follow-up
  queries per line item (product images are explicitly out of scope).
