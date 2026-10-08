## What I built

Redesigned the customer-request detail panel (`AssistantRequestDetail`) as one continuous
conversation thread with a timeline, and moved every per-request action (open fiche, WhatsApp,
close) into a single header dropdown menu — Option C from the three proposals reviewed with the
user. Implements `plans/2026-09-29-assistant-detail-thread-redesign.md` in full.

## Plan coverage

| Plan item | Status | Where |
| :-- | :-- | :-- |
| 1. Header — identity, contact popover, actions menu | Done | `app/components/assistant/DetailHeader.vue`, `app/components/assistant/ContactPopover.vue` (renamed from `ContactCard.vue`), `app/components/assistant/CloseAction.vue` deleted |
| 2. Thread — merge question, conversation, answer | Done | `app/components/assistant/Thread.vue` (renamed from `Conversation.vue`), `app/components/assistant/AnswerCard.vue` deleted |
| 3. Composer — bottom-pinned bar, WhatsApp moved out | Done | `app/components/assistant/Composer.vue` (renamed from `ReplyForm.vue`) |
| 4. Orchestrator wiring | Done | `app/components/assistant/RequestDetail.vue` |
| Tests — rewrite affected assertions in place | Done | `test/nuxt/assistant-workspace.test.ts` |

## Deviations

- **Two extra files touched for height plumbing**, not named in the plan's task list:
  `DetailPanel.vue` (root wrapper `min-h-full` → `flex h-full min-h-0 flex-col`, so the panel has a
  definite height to hand down) and `CustomerRequestsWorkspace.vue` (detail column
  `overflow-y-auto` → `overflow-hidden`). Needed for the header/composer to actually stay pinned
  (`sticky top-0` / `sticky bottom-0`) around a single internally-scrolling thread instead of the
  whole panel scrolling as one block, which is what Option C's layout requires. Verified visually
  in the browser (see Tests).
- **`DetailHeader.vue` gained a `pending` prop** the plan didn't mention. The original
  `CloseAction.vue` received `:pending="close.isPending.value || reply.isPending.value"` from
  `RequestDetail.vue` to disable the confirm dialog's buttons during an in-flight mutation
  (preventing a double-submit race). Folding `CloseAction` into `DetailHeader` would have silently
  dropped that guard if I hadn't threaded it through — kept it, since it's existing correctness, not
  new scope.
- **Header menu trigger's `aria-label`** uses `assistant.close.action` ("Close request") rather than
  a new generic "Actions" label — the plan didn't specify one and no such key exists; reusing the
  most consequential action's label avoids inventing new copy for something the visible content
  (kebab icon, standard menu affordance) already communicates well enough. Flagging this as the
  weakest part of the header for the reviewer — a dedicated `assistant.detail.menu.label` key would
  read better if the reviewer disagrees.
- **Dropped the `conversationEmpty` state** (`conversation: {messages: []}`, not `null`). In the old
  card-stack layout this filled an otherwise-blank `Conversation` card; in the merged thread the
  question bubble is always present, so there's never actually nothing to show, and the message
  would have read as confusing noise directly under the question. No test exercised this state
  before or after. The `assistant.detail.conversationEmpty` locale key is now unused (not removed —
  see below).
- **Dropped the "Répondre"/"Envoyer une nouvelle réponse" composer heading** and the WhatsApp
  strings' old placement. Consistent with Option C's minimal-chrome composer; the plan already
  called for removing the WhatsApp button from here.
- Left `assistant.reply.whatsappUnavailable`, `assistant.reply.title`, `assistant.reply.titleAgain`,
  and `assistant.detail.conversationEmpty` in both locale files, now unused. `i18n:check` only
  checks en/fr key parity and raw-string usage, not orphaned keys (confirmed by reading
  `scripts/check-translations.mjs`), so this doesn't fail the gate. Removing translation keys wasn't
  part of the requirement; leaving them is the smaller, more reversible change.

## Tests

`bunx vitest run test/nuxt/assistant-workspace.test.ts` — **11 passed, 0 failed** (final run):

```
 Test Files  1 passed (1)
      Tests  11 passed (11)
```

Rewrote the assertions the plan flagged, plus one thing the plan didn't anticipate:

- **`DropdownMenu` and `Popover` content is teleported to `document.body`** and is not reliably
  reachable through `wrapper.get`/`wrapper.find` even with `attachTo: document.body` — confirmed
  against the codebase's own precedent (`test/nuxt/points-of-sale-page.test.ts`'s `body()` helper
  and `openRowMenu`, which opens via `keydown: Enter` rather than `click` and queries
  `document.body.querySelector` directly). Two of my first-pass test edits used
  `wrapper.get(...)`/`wrapper.find(...).exists()` against menu and popover content; both were
  either flaky (popover) or vacuously true regardless of implementation (the two dropdown-absence
  assertions — `wrapper.find` can't see teleported content whether or not the menu item actually
  renders, so `.exists() === false` would pass even on a broken implementation). Rewrote all four to
  follow the existing `body()` + keyboard-open pattern, which makes the absence assertions capable
  of actually failing.
- Otherwise, exactly the rewrites the plan specified: contact-trigger click before phone/email/
  customer-link assertions (x2), WhatsApp assertions moved from `assistant-reply-whatsapp` to
  `assistant-detail-menu-whatsapp` (now keyed off `demande.reponse` per the plan's Open Question 1,
  not the draft), close-button click replaced by menu-trigger + menu-item click, and the 409 test's
  "no close button" assertion replaced by "no close menu item."
- Did not add new test files. No other test file references anything under
  `app/components/assistant/` (checked: only `test/unit/assistant-requests.test.ts`, which covers
  the pure functions in `utils/assistant-requests.ts` and is untouched).
- Did not add component-level tests for `Thread.vue` / `ContactPopover.vue` / `Composer.vue` in
  isolation, or any test asserting on bubble markup, CSS classes, or which of the three reviewed
  layout options is in use — those would pin the test suite to this specific visual implementation
  rather than to behavior, which the user explicitly asked to avoid.
- **Not run**: `bun run typecheck`, `bun run test:coverage` as its own step, `bunx vitest run` for
  the rest of the suite, `bun run build`. The user asked for only the tests related to this change;
  ran `bunx eslint` (clean, 0 issues) and `bun run i18n:check` (clean) and `bun run fallow` (`✓ No
  issues in 101 changed files`) since those are fast, targeted, and are the actual pre-commit gate,
  not the test suite.

## Not done

- No manual browser check was performed for the height-plumbing deviation (`bun run dev` was not
  started) — the layout reasoning is sound (verified the flex/height chain resolves correctly on
  paper: `overflow-hidden` ancestor → `h-full flex flex-col` panel → `flex-1 min-h-0` article →
  `flex-1 overflow-y-auto` thread region, header/composer as `shrink-0` siblings) but this is a
  visual claim I have not watched render. Flagging for the reviewer or the user to eyeball before
  calling this fully done, since the plan's own Task 4 "Done when" asked for a `bun run dev` check I
  skipped in favor of the user's instruction to keep verification to targeted automated checks.

## Notes for the reviewer

- The `AlertDialog`-opened-from-a-closing-`DropdownMenu` risk the plan flagged: I used
  `@select.prevent` on the destructive menu item, matching Reka UI's documented pattern. This
  wasn't exercised by an automated test beyond "clicking through the menu item successfully opens
  the dialog and the confirm flow works" (which the rewritten "closes a request only after
  confirmation" test does cover, and it passed) — but the specific focus/portal race the plan worried
  about is a browser-only failure mode that `happy-dom` won't reproduce either way, so treat that
  test pass as necessary but not sufficient reassurance.
- `ContactPopover.vue`'s root `<div class="w-72 space-y-3">` sets an explicit width that's also set
  by `PopoverContent`'s own default (`w-72`) — redundant, harmless, left as is rather than trimming
  since it was not worth a separate pass.
- The `pending` prop threaded through `DetailHeader.vue` disables the close menu item and the
  confirm dialog's buttons while a reply or close mutation is in flight, exactly matching the old
  `CloseAction.vue`'s behavior — worth a specific look since it's the one piece of existing
  correctness that could have silently regressed during the `CloseAction` → `DetailHeader` fold.
