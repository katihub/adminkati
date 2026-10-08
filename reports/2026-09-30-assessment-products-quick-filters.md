# Products quick-filter investigation

## Question

Why do the product quick-filter buttons appear not to work?

## Method

- Inspected `ListQuickFilters.vue`, `ListPanel.vue`, `pages/products.vue`, `product-list.ts`, and `useProduits.ts` to trace the emitted filter through store state and the product-list query.
- Ran `bunx vitest run test/nuxt/products-list-panel.test.ts` — 13 tests passed.
- Ran the page-level stock-pill regression with coverage disabled to avoid concurrent Vitest coverage runs — 1 test passed. It selects “In stock”, observes `stock: "en-stock"` and `etat: "actifs"` in store/query state, then observes the filtered product after the request settles.

## Findings

The component emits the selected filter, the list panel translates it to the expected filter values, and the page updates the shared store and query. The current component and page-level tests do not reproduce a broken interaction.

No production code was changed because the reported failure could not be reproduced from the supplied component and repository tests.

## Recommendation and limits

The investigation did not use the user's live session or a live backend. To locate a runtime-only problem, the next useful detail is which pill was clicked and what happened: whether the active style changed, whether the rows/count changed, or whether the request failed. A browser network response or console error would also distinguish a UI issue from a backend/query issue.
