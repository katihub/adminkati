# Backend endpoint message localization audit

**Date:** 2026-10-01  
**Question:** Do backend endpoint messages follow the admin panel's active English/French locale, and what implementation options are available?

## Summary

The current behavior does not consistently match the panel's active locale. The admin BFF does not pass a locale to the backend, and the backend has no general request-locale localization mechanism: most endpoint error prose is hard-coded in French. Several UI paths display those strings verbatim; other paths replace backend detail with a translated, status-only headline. Authentication failures are a positive exception at the admin BFF boundary: it returns stable reason codes and the UI translates them.

The stock-import API already demonstrates a better contract in part: it returns stable error codes that the panel maps into both locales. However, it also returns French `message` details, which the panel displays verbatim and includes in its CSV export.

## Method and scope

Reviewed the Nuxt i18n configuration, API BFF and its header allowlist, shared API error utilities and consumers, authentication error handling, stock-import API types/UI/locales/tests, and the backend source at `/Users/michaelnji/Projects/nvc/NowTech-backend-`: bootstrap/configuration, modules, DTO validation, representative controllers/services, stock import/export, and locale-specific PDF export. The backend worktree was already dirty; no files in either repository were changed by this audit, and findings describe the inspected working-tree snapshot. No live API calls or tests were run.

## Findings

### 1. The selected UI locale is not part of the normal backend request contract

- The UI supports `en` and `fr`; English is the default, and French is also persisted using `NT-LANG` (`nuxt.config.ts`, i18n configuration).
- `useApiFetch()` and `useApiWrite()` call the BFF without adding an explicit locale (`app/composables/useApi.ts`).
- The BFF forwards requests through an explicit metadata allowlist (`server/utils/proxy-headers.ts`), which currently includes content type, idempotency key, user agent, and filename—but no language/locale header. Its unit test asserts this allowlist (`test/unit/proxy-headers.test.ts`).
- The catch-all BFF handler passes the backend response through `sendProxy` (`server/api/v1/[...path].ts`); it does not translate response bodies.
- The backend's `src/main.ts` sets a global `ValidationPipe` but no locale middleware or custom exception filter; `src/app.module.ts` has no localization module/provider, and `package.json` has no i18n dependency. A source search found no `Accept-Language` handling.

Consequently, the backend cannot know whether the panel is currently displaying English or French. Relying on a browser's `Accept-Language` alone would also be insufficient: the panel has an explicit language switch and persisted selection that may differ from the browser preference.

### 2. Shared API error handling mixes localized and backend-language text

- `toApiError()` maps HTTP status/reason values to local translation keys, but also extracts a string `data.message` (`app/utils/api-error.ts`).
- `apiErrorText()` prefers that backend string over the translated key. Many form, toast, and mutation paths use this helper, so a French backend message can be displayed while the UI is English (and vice versa if backend language changes).
- `ApiErrorCard.vue` does the opposite: it renders only the translated status/reason key and ignores the extracted detail. This avoids raw backend text, but may discard actionable domain guidance. The same error can therefore produce different information depending on which component catches it.
- The generic English/French status catalog is present in `i18n/locales/errors/{en,fr}.json`, but a status headline is not a substitute for endpoint-specific instructions.
- `AGENTS.md` records the deliberate policy that French backend error details are preserved because the general backend has no stable error-code contract. Backend inspection confirms there is no *system-wide* code contract, but the blanket rationale is incomplete: stock import, stock export, and database-constraint errors already expose machine-readable identifiers (see below). That policy conflicts with the requested language guarantee and should be revisited once a response contract is chosen. The implementation does not always match the wording “preserved beneath translated status headlines”: `apiErrorText()` returns the backend message alone.

### 3. Stock import exposes the clearest, directly fixable message case

- The typed response explicitly documents `LigneResultatImport.message` as a French detail (`app/types/api/stock-import.ts`). The same API contract already includes stable `code_erreur` values.
- Row headlines are already translated by code in both `i18n/locales/products/en.json` and `fr.json` through `stockImportRowHeadlineKey()` and `StockImportResultRow.vue`.
- The raw detail is still rendered directly in the row, in rejected-request errors (`StockImportResultRow.vue`, `StockImportRequestError.vue`), and exported into the stock-import CSV (`app/utils/stock-import-files.ts`).
- Existing unit tests confirm the classifier retains backend `message` strings, including French examples (`test/unit/stock-import-errors.test.ts`).

This means code-based translation is already partially implemented for stock import; the unlocalized detail is an additional text surface, not a lack of all error classification.

### 4. Authentication is already locale-neutral at the API boundary

The login endpoint returns a stable `reason` such as `invalid_credentials`, `not_team`, or `deactivated`, rather than a prose message (`server/api/auth/login.post.ts`). `app/utils/api-error.ts` maps those reasons to translated keys. This is a useful model for errors where the app owns the user-facing wording.

### 5. Not every backend string should be translated

The audit found backend-originated conversation text in the assistant feature (`MessageConversationAssistance.texte`, rendered in `assistant/Thread.vue`). Product names, user/customer-entered text, and conversation content are data, not admin-interface copy; translating them automatically could alter meaning. The language policy should target system-generated messages and instructions, not arbitrary domain/user content.

### 6. Backend error prose is predominantly French literals; locale handling is endpoint-specific

- Runtime services and DTOs construct French human-readable errors across auth, access control, team validation, orders, cash management, catalogue, vitrine, inventory, delivery intervals, and other domains. Examples include `src/auth/auth.service.ts` (429/401/503 messages), `src/commun/garde/garde-appelant.ts` (authentication/authorization refusals), `src/equipe/equipe.dto.ts` (class-validator messages), `src/caisse/caisse.service.ts` (business refusals with structured fields), and `src/commandes/commandes.service.ts` (order conflicts with structured fields). No request locale is consulted at these throw sites.
- Nest's standard exception serialization is used: the bootstrap installs a global `ValidationPipe` (`src/main.ts`) but no application exception filter. DTO validation can therefore return message arrays, while service exceptions commonly return a French `message` string and sometimes additional domain fields. There is no shared translation layer normalizing these shapes.
- Some machine-readable identifiers do exist. `src/catalogue/stock-import.dto.ts` explicitly documents stable codes “made to be translated” and says `message` is a French detail, not a value to parse. The service emits those codes alongside French strings for request errors and per-row results. `src/catalogue/stock-export.service.ts` returns `code_erreur: export_trop_volumineux` and `maximum` alongside a French message. `src/commun/contraintes.ts` maps known database constraints to useful French messages and returns the constraint name as `contrainte`; that name is machine-readable but is an internal database identifier rather than a deliberately designed public error code.
- The backend does support `fr`/`en` for one explicit output: `ExporterCommandePdfDto.locale` (`src/commandes/commandes.dto.ts`) selects translated PDF labels in `src/commandes/export/commande-pdf.service.ts`. It defaults to French and only affects the generated PDF; it does not localize API JSON errors or other response messages.

This confirms the issue is not just a missing header in the panel: backend endpoint responses themselves are currently French-only for most human-readable errors. The backend has useful code-based exceptions to that pattern, but not a general convention.

## Options

| Option | Contract and work | Benefits | Costs / risks |
| --- | --- | --- | --- |
| **A. Backend content negotiation** | Send the active panel locale (restricted to `en`/`fr`) on BFF-to-backend requests; backend returns localized prose for every applicable endpoint/message. | The literal API `message` is in the requested language; useful when the backend response is also consumed outside this panel. | Requires backend changes and translation ownership across endpoints, including nested/batch messages. Must cover both SSR and browser requests, define fallback behavior, and consider locale-aware caching. A browser preference is not a safe substitute for the active panel locale. |
| **B. Stable codes + panel translations** | Backend returns stable error/message codes and interpolation parameters; the panel maps them to its existing i18n catalogs. Treat prose `message` as non-authoritative or omit it from user-facing UI. | The rendered UI always follows the active locale; no parsing of French strings; works naturally with existing status/reason translations and the stock-import code mapping. | Backend must supply stable codes for all actionable cases. Each consuming UI must maintain translations; arbitrary free-form text cannot be translated this way. The raw API `message` itself would not be localized. |
| **C. Hybrid contract** | Stable code + parameters are authoritative for UI rendering; optionally also send a validated locale so the backend can localize human-readable `message` fields for API consumers/logging or endpoint-specific output. | Combines reliable UI localization with a useful localized API response where required; supports gradual migration. | Two representations need consistency rules. Without a clear rule, callers may again display the fallback prose instead of the translated code. |

**Not recommended:** translating by matching or parsing existing French strings in the panel. Wording changes, validator output, and dynamic values make this brittle; validation arrays and technical exceptions also need different handling.

## Recommendation

The stated requirement is that backend-returned information follow the panel locale. Taken literally, the API's human-readable `message` fields themselves must be localized; changing only the UI would not satisfy that contract. Keep machine codes locale-neutral as well:

- Implement **Option C as a combined contract**: carry the active, validated `en`/`fr` locale through the BFF so backend `message` fields are localized, while adding stable `code` and interpolation parameters as the locale-independent contract. Keep the code authoritative for UI logic and allow the panel to use its own i18n wording; the localized backend `message` remains useful for API consumers and diagnostics. This fits the explicit stock-import contract and extends it consistently to other actionable errors.
- If project scope requires the smallest change and only the rendered admin UI matters, **Option B** can be an incremental first phase: translate stable backend codes in the panel, starting with stock import/export, and add codes to general error cases over time. It does not meet a strict requirement that the backend JSON prose itself be localized.

For stock import, the row/request `message` fields and CSV export must follow the same rule: translate from `code_erreur` plus parameters in the panel, or localize the backend message using the negotiated locale. A panel-only translation fixes the rendered UI but does not make the literal backend response localized. Keep user-authored/domain text unchanged.

## Scope limits / follow-up needed

- The backend has many hand-written endpoint messages; this audit established the broad French-only pattern and sampled representative modules, but it did not extract a line-by-line catalog of every message or every route's success/error payload.
- The backend worktree already contained modified and untracked files when inspected. No changes were made; findings describe that working-tree snapshot and should be compared with the intended branch state before implementation.
- The audit was static: no live API calls or tests were run. Before implementation, inventory all user-visible system-generated strings, including nested response records and validation errors, then add contract tests for both `en` and `fr` at the BFF/backend boundary and UI consumers.
