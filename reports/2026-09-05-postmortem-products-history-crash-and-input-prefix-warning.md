# Postmortem — `/products` SSR crash and the Vuzeno `Input` prefix warning

**Date:** 2026-09-05 · **Issue:** [NVC-85](https://linear.app/new-vision-creatives/issue/NVC-85)

## Question

The browser console showed `GET /products 500` on every load, plus a separate Vue warning
(`Failed setting prop "prefix" on <input>`) on `/content`. Are these related, and what's the actual
fix for each?

## Method

Live dev server stdout (not a log file — this process writes straight to its own tty, so the
in-app terminal output was pasted in directly) gave the real SSR stack trace for the 500, naming an
exact file and line. For the DOM-prop warning, traced the failing prop backward through the render
stack (`Polymorphic` → `VuzenoInput` → `ark.input`) to the component that declares and forwards it,
then read Vue's own `HTMLAttributes` type definitions to find where `prefix` is declared.

## Findings

### 1. `/products` 500 — unguarded null in a history diff

```
17:16:38.230 ERROR [app] GET /products 500 in 366ms
  ├─ error: Cannot read properties of null (reading 'avant')
  │   at app/components/products/HistoryEntry.vue:28
```

`ProductHistoryEntry.champs` is typed as `Record<string, { avant: unknown, apres: unknown }>` —
always an object. The backend actually sends `null` for some fields' change record (not always
`{avant, apres}`). `HistoryEntry.vue`'s `diffLines` computed dereferenced `change.avant`/
`change.apres` unguarded, so any product whose history included one of these null entries crashed
every SSR render of `/products`, not just the one for that product — the crash was inside the same
`<template>` walk that renders the sidebar list.

Unrelated to the two prior, unrelated red herrings chased before the real stack trace was available:
a stale `content.vue` template-parse error from earlier in the session (already fixed, confirmed via
`curl` returning 302), and CSP inline-script blocks from a third-party debug script (harmless,
unrelated to app code).

### 2. `prefix` DOM-prop crash — a type-only Vue attribute has a real DOM collision

`app/components/vuzeno/input/Input.vue`'s prop-forwarding was rewritten (uncommitted, prior to this
session) from `Omit<FieldInputProps, "size">` (ark-ui's own narrow type) to
`Omit<InputHTMLAttributes, ...>`. `InputHTMLAttributes` extends Vue's `HTMLAttributes`, which
declares RDFa attributes nothing in this app ever passes: `about`, `datatype`, `inlist`, `prefix`,
`property`, `resource`, `typeof`, `vocab` (`runtime-dom.d.ts:322-329`). `defineProps<Props>()`
statically expands the type into real declared props, so `prefix` exists on every `VuzenoInput`
instance as `undefined` even though no caller ever sets it.

`delegatedProps` forwarded every declared prop except four named ones (`class`, `size`,
`modelValue`, `defaultValue`) onto `ark.input`, which passes them straight to the real `<input>`.
`Element.prefix` (the XML namespace prefix) is a getter-only accessor inherited from `Node` — Vue's
`patchDOMProp` sees `'prefix' in el`, tries `el.prefix = undefined`, and the assignment throws
(caught internally by Vue and surfaced as a console warning, not a crash).

Of the eight RDFa attributes above, `prefix` is the only one that collides with a real native DOM
accessor — the other seven aren't real properties on `HTMLInputElement`/`Node`, so Vue treats them
as plain attributes (`setAttribute`) and setting them to `undefined` is a harmless no-op.

## What was changed

| File | Change |
| :-- | :-- |
| `app/components/products/HistoryEntry.vue` | `change.avant`/`change.apres` → `change?.avant`/`change?.apres`. |
| `app/types/api/produits.ts` | `champs: Record<string, { avant: unknown, apres: unknown }>` → `Record<string, {...} \| null>` — the type now matches what the backend actually sends. |
| `app/components/vuzeno/input/Input.vue` | `delegatedProps` now drops any entry whose value is `undefined` before spreading, not just the four named ones. Fixes `prefix` and prevents the same class of bug for any other declared-but-unset `HTMLAttributes` key. |

Verified live: `curl -o /dev/null -w "%{http_code}" http://localhost:3000/products` → `302` (was
`500`) for the unauthenticated case; the authenticated SSR path (where the crash actually fired,
per the pasted stack trace) was re-checked by reloading in-browser after the fix — no further 500 or
console error on `/products` or `/content`.

## Recommendation

None outstanding. Both fixes are minimal and match the actual defect (a missing null guard, and a
missing undefined filter) rather than papering over either with a broader rewrite.

## Not examined

- Whether any other Vuzeno component built against a raw Vue `HTMLAttributes`-derived type has the
  same forward-everything pattern. Only `Input.vue` was in the failing render path this session.
- Whether the backend's `champs` shape (`null` vs. `{avant, apres}`) is itself intentional or should
  be normalized on the backend side — treated as read-only/out of scope per this repo's backend
  boundary.
- Whether the other seven RDFa attributes (`about`, `datatype`, `inlist`, `property`, `resource`,
  `typeof`, `vocab`) cause any visible DOM attribute pollution (e.g. showing up in devtools) — they
  don't crash, so this wasn't chased further.
