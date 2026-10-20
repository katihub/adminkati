## What I built

Moved the existing language control into the shared authenticated admin header so it is visible across admin pages, and removed the duplicate control from the profile menu. The shared `LanguageSwitcher` remains unchanged, preserving its locale routing and `NT-LANG` persistence behavior.

## Plan coverage

| Plan item | Status | Where |
| :-- | :-- | :-- |
| Put the existing language control in the shared admin header | Done | `app/components/admin/AdminHeader.vue` |
| Remove the duplicate control from the profile menu | Done | `app/components/admin/AdminProfileMenu.vue` |
| Verify route/query preservation and `NT-LANG` persistence | Partial | `test/nuxt/language-switcher.test.ts` |

## Deviations

The locale-switch test reaches the handler and resolves the expected target (`/fr/produits?search=phone&page=2`), but the test router remains on `/products`; the navigation assertion therefore fails. No route or persistence implementation was changed because this task reuses the established switcher behavior.

## Tests

- `bunx.cmd vitest run test/nuxt/admin-shell.test.ts test/nuxt/admin-profile-menu.test.ts test/nuxt/language-switcher.test.ts --reporter=dot` — 10 passed, 1 failed. The shell and profile tests pass; the locale-switch route assertion fails as described above.
- `bun.cmd run lint -- app/components/admin/AdminHeader.vue app/components/admin/AdminProfileMenu.vue` — passed.
- `bunx.cmd oxfmt --check app/components/admin/AdminHeader.vue app/components/admin/AdminProfileMenu.vue` — passed.
- `bun.cmd run i18n:check` — passed.
- `bun.cmd run fallow` — passed with existing project warnings about missing generated Nuxt config/dependencies and inherited CSS token drift.
- `bun.cmd run typecheck` — started, but did not produce a completion result during this handoff.

## Not done

The locale-switch component test's route assertion remains unresolved. Test runs also reported blocked external font/icon/analytics fetches in this environment.

## Notes for the reviewer

Only the shared header and profile menu implementation files were changed for this feature. The plan and tests were supplied before implementation and were left intact.
