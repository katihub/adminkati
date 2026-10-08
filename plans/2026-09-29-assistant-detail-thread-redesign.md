# Assistant request detail — thread + timeline redesign

Slug: `assistant-detail-thread-redesign`. Follows on from `2026-09-13-assistant-customer-requests.md`,
which shipped the current card-stack layout this plan replaces. Implements **Option C** ("thread +
timeline") from the three conversation-UI proposals reviewed with the user
(https://claude.ai/artifact/2EiPknRM6bWgm8AmX91UZL).

## Requirement

Redesign `AssistantRequestDetail` (the wide detail panel of the customer-requests tab in
Operations) as one continuous conversation thread instead of a stack of cards, and move every
per-request action (open the customer's fiche, reply on WhatsApp, close the request) into a single
header menu. Status changes and the final answer's metadata render as inline system rows in the
thread, so the full history reads in one pass — this is what distinguishes Option C from the two
other reviewed proposals (a plain thread with contact behind an icon, and a thread with a persistent
contact rail).

## Current shape (read before touching anything)

`app/pages/operations.vue` → `CustomerRequestsWorkspace.vue` → `AssistantDetailPanel` (state
wrapper: empty/error/loading/content) → `AssistantRequestDetail` (orchestrator), which composes:

| File | Role today |
| :-- | :-- |
| `app/components/assistant/DetailHeader.vue` | Sticky header: back button, reference, status pill, received date, `#actions` slot |
| `app/components/assistant/ContactCard.vue` | Standalone card: name/phone/email + "open fiche" link |
| `RequestDetail.vue:64-71` | Inline `<section>` for `demande.question` |
| `app/components/assistant/Conversation.vue` | Standalone card: chat bubbles from `demande.conversation.messages` |
| `app/components/assistant/AnswerCard.vue` | Standalone card: `demande.reponse` + who/when answered + fiche caption |
| `app/components/assistant/ReplyForm.vue` | Standalone card: textarea, fiche switch+fields, WhatsApp button, send |
| `app/components/assistant/CloseAction.vue` | `#actions`-slotted button + confirm `AlertDialog` |

Data model is fixed by `app/types/api/assistant.ts:56-62` (`DemandeAssistanceDetail`) — no backend
change in scope.

## Target shape

| File | New role |
| :-- | :-- |
| `DetailHeader.vue` (rewritten) | Compact identity bar: back button, name (opens contact popover) or "Visiteur anonyme", reference, status pill, kebab `DropdownMenu` with every action, owns the close confirm `AlertDialog` |
| `ContactCard.vue` → `ContactPopover.vue` (renamed) | Same phone/email/no-contact markup, dropped card chrome, rendered inside a `Popover` |
| `Conversation.vue` → `Thread.vue` (renamed) | The merged timeline: received row → question bubble → conversation bubbles → answered row → answer bubble → fiche caption |
| `AnswerCard.vue` | **Deleted** — logic absorbed into `Thread.vue` |
| `RequestDetail.vue:64-71` inline question section | **Deleted** — absorbed into `Thread.vue` |
| `CloseAction.vue` | **Deleted** — its `open` ref / `AlertDialog` / `confirm()` move into `DetailHeader.vue` |
| `ReplyForm.vue` → `Composer.vue` (renamed) | Sticky bottom composer: textarea + send, fiche switch+fields kept, WhatsApp button removed |
| `RequestDetail.vue` | Same mutation orchestration (`sendReply`/`closeRequest`/`actionError`), now wires `DetailHeader` + `Thread` + `Composer` |

## Reuse

- `formatDateCourte` (`@/utils/dates`) — same helper `AnswerCard.vue:4` and `Conversation.vue:4`
  already call, reused for the new system rows.
- `ASSISTANT_REQUEST_STATUS_TONE`, `whatsappLink` (`@/utils/assistant-requests`, `@/utils/whatsapp`)
  — unchanged.
- `useReponseDemande` / `useClotureDemande` (`@/composables/useReponseDemande`) — unchanged, stay
  owned by `RequestDetail.vue`.
- `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator`,
  `DropdownMenuTrigger` (`@/components/ui/dropdown-menu`) + `PhDotsThree` from `@phosphor-icons/vue`
  — same shape as `app/components/points-of-sale/RowMenu.vue:1-54`, the canonical header/row-menu
  pattern in this repo.
- `Popover`, `PopoverTrigger`, `PopoverContent` (`@/components/ui/popover`) — existing shadcn-vue
  primitive, first use in the assistant feature.
- `AlertDialog*` (`@/components/ui/alert-dialog`) — the same components `CloseAction.vue:3`
  already uses, just relocated.
- `Textarea`, `Switch`, `Input`, `Label`, `Button` (`@/components/ui/*`) — unchanged.
- `NuxtLinkLocale` target `{ name: 'users', query: { id: clientId } }` — same target
  `ContactCard.vue:23` already links to.
- `demande.nom ?? t('assistant.list.anonymous')` — the exact fallback `ListItem.vue:44` already
  uses for a nameless visitor; reused so the header never shows a blank identity.

## Data contracts

None. Every field used (`reference`, `statut`, `question`, `nom`, `telephone`, `courriel`,
`clientId`, `creeLe`, `reponse`, `reponduLe`, `reponduPar`, `ficheCle`, `conversation`) already
exists on `DemandeAssistanceDetail`. No new endpoint, no new type, no change to
`useReponseDemande.ts` or `useDemandesAssistance.ts`.

## States

- Loading / empty / error — unchanged, still owned by `DetailPanel.vue` (not touched).
- Purged conversation (`conversation === null`) — unchanged message (`assistant-conversation-expired`),
  now rendered by `Thread.vue` instead of `Conversation.vue`.
- Empty conversation (`messages.length === 0`) — unchanged message, same component move.
- No contact at all (`nom`/`telephone`/`courriel`/`clientId` all absent) — the popover trigger still
  renders (the header always needs an identity label, and falls back to "Visiteur anonyme"), opening
  it shows today's "no contact" line unchanged.
- Closed (`statut === 'close'`) — `Composer` is replaced by the existing `closedNotice` paragraph,
  exactly as today, owned by `RequestDetail.vue`. `Thread.vue` does not need to know about "closed",
  only about whether `reponse` exists.
- Each menu item's own visibility is a `v-if`, not a disabled state, matching the codebase's existing
  pattern of hiding rather than disabling an absent affordance (e.g. `ContactCard.vue`'s
  `v-if="demande.clientId"`): fiche link needs `clientId`, WhatsApp needs a resolvable number, close
  needs `statut !== 'close'`.

## Tasks

Ordered by dependency — the header's menu and the thread's merge are independent of each other, the
composer depends on nothing in this list, and the orchestrator wiring depends on all three.

### 1. Header — identity, contact popover, actions menu

**What**: Rewrite `DetailHeader.vue`. Kebab `DropdownMenu` (trigger: `PhDotsThree`, testid
`assistant-detail-menu-trigger`) replaces the `#actions` slot, containing:
- `DropdownMenuItem` "Voir la fiche client" (`ph:user-circle`, `NuxtLinkLocale` as-child,
  testid `assistant-detail-menu-fiche`) — `v-if="demande.clientId"`.
- `DropdownMenuItem` "Répondre via WhatsApp" (`ph:whatsapp-logo`, `<a>` as-child, `target="_blank"
  rel="noopener noreferrer"`, testid `assistant-detail-menu-whatsapp`) — `v-if` on
  `whatsappLink(demande.telephone, demande.reponse ?? "")` resolving.
- `DropdownMenuSeparator`, then `DropdownMenuItem` "Clore la demande" (`variant="destructive"`,
  `ph:archive`, testid `assistant-detail-menu-close`) — `v-if="demande.statut !== 'close'"`,
  `@select.prevent="open = true"` (the `.prevent` matters — see Risks).

Move `CloseAction.vue`'s `open` ref, `AlertDialog`, and confirm copy into `DetailHeader.vue`,
rendered as a sibling of the `DropdownMenu` (not nested inside `DropdownMenuContent`). Delete
`CloseAction.vue`. `DetailHeader.vue` now emits `close` (was: `RequestDetail.vue` passing
`AssistantCloseAction` into the `#actions` slot with a `@confirm` handler).

Name/identity: replace the plain `demande.reference` heading with a name button
(`demande.nom ?? t('assistant.list.anonymous')`, testid `assistant-detail-contact-trigger`) that
toggles a `Popover`; reference moves to a muted `mono` subtext next to it. Rename `ContactCard.vue`
→ `ContactPopover.vue`, drop its `<section class="rounded-3xl bg-card ...">` chrome and heading
(the popover frame replaces it), keep its phone/email/no-contact markup and testids
(`assistant-detail-phone`, `-email`, `-customer-link`, `-no-contact`) verbatim, rendered inside
`PopoverContent` (testid `assistant-detail-contact-panel`).

**Where**: `app/components/assistant/DetailHeader.vue`; `git mv
app/components/assistant/ContactCard.vue app/components/assistant/ContactPopover.vue`; delete
`app/components/assistant/CloseAction.vue`.

**Done when**: `bunx vitest run test/nuxt/assistant-workspace.test.ts` passes with the "closes a
request only after confirmation" case updated to click `assistant-detail-menu-trigger` then
`assistant-detail-menu-close` before the existing `assistant-close-confirm` step, and the
contact/customer-link assertions updated to click `assistant-detail-contact-trigger` first (see
Tests below for the exact rewrites).

### 2. Thread — merge question, conversation, and answer into one timeline

**What**: Rewrite `Conversation.vue` into `Thread.vue`. Renders, in order:
1. A system row "Demande reçue · {date}" (new, via `formatDateCourte(demande.creeLe, locale)`).
2. A visitor bubble for `demande.question`, testid `assistant-detail-question` kept on the text node.
3. `conversation.messages` sorted by `rang`, unchanged bubble-tone logic and testid
   `assistant-conversation-message` (both purged-`null` and empty-array states unchanged).
4. Only if `demande.reponse`: a system row reusing `AnswerCard.vue`'s existing `answeredLine`
   computed ("Répondue par {nom}, le {date}" / "Le {date}"), then an outlined answer bubble
   (testid `assistant-detail-answer-text`), then — only if `demande.ficheCle` — the existing fiche
   caption (testid `assistant-detail-fiche`) under it.

Delete `AnswerCard.vue` and `RequestDetail.vue:64-71`'s inline question `<section>` — both are fully
absorbed into `Thread.vue`.

**Where**: `git mv app/components/assistant/Conversation.vue app/components/assistant/Thread.vue`
(rewrite); delete `app/components/assistant/AnswerCard.vue`; edit `RequestDetail.vue`.

**Done when**: `bunx vitest run test/nuxt/assistant-workspace.test.ts` passes for "opens the
request…" (question text still found under `assistant-detail-question`), "says the conversation
expired…", and "sends a plain reply…" (`assistant-detail-answer-text` resolves after the POST).

### 3. Composer — bottom-pinned reply bar, WhatsApp moved out

**What**: Rewrite `ReplyForm.vue` into `Composer.vue`: single-row auto-growing `Textarea` + icon-only
send `Button` in a sticky bottom bar; counter and too-short hint keep their computeds and testids
(`assistant-reply-counter`, `assistant-reply-text`, `assistant-reply-send`), moved to a condensed
line under the bar. "Enregistrer comme fiche" `Switch` + conditional title/domain `Input`s keep their
testids, restyled into the composer's footer. Remove the WhatsApp `Button`/`<a>` block
(current `ReplyForm.vue:157-175`) and the `whatsappLink` import / `whatsappHref` computed — that
action now lives in the header menu (Task 1).

**Where**: `git mv app/components/assistant/ReplyForm.vue app/components/assistant/Composer.vue`
(rewrite).

**Done when**: `bunx vitest run test/nuxt/assistant-workspace.test.ts` passes for "sends a plain
reply…", "withholds the fiche switch…", "lets direction save the reply as a fiche…"; the two
WhatsApp tests are rewritten per Tests below.

### 4. Orchestrator wiring

**What**: Update `RequestDetail.vue`: render `AssistantDetailHeader` (now emitting `@close` instead
of using the `#actions` slot), `AssistantThread` (replacing the question section +
`AssistantConversation` + `AssistantAnswerCard`), and `AssistantComposer` (replacing
`AssistantReplyForm`) in that order. Root layout becomes a flex column: header stays `sticky top-0`,
the thread is the sole scrolling region (`flex-1 overflow-y-auto`), the composer is `sticky
bottom-0`; the `mx-auto max-w-4xl` centering moves to the thread only, so header and composer span
full width.

**Where**: `app/components/assistant/RequestDetail.vue`.

**Done when**: `bun run dev` → Operations → "Demandes clients" tab renders correctly for a
`nouvelle`, a `repondue`, and a `close` request (manual check — the mockup's three fixtures cover
these). `bunx vitest run test/nuxt/assistant-workspace.test.ts` passes end to end.

## Tests

`test/nuxt/assistant-workspace.test.ts` is the only test file covering this surface (confirmed — no
other `*assistant*` test exists besides `test/unit/assistant-requests.test.ts`, which covers the
pure functions in `utils/assistant-requests.ts` and is untouched). Every assertion is updated in
place; no new test file, matching this feature's existing one-integration-test precedent:

- **"opens the request named by `?demande=`…"**: add `await wrapper.get("[data-testid='assistant-detail-contact-trigger']").trigger('click')` before the `assistant-detail-customer-link` / `-phone` / `-email` assertions.
- **"says the conversation expired…"**: same click, before asserting `assistant-detail-customer-link` is absent (fixture has `clientId: null`).
- **"opens WhatsApp in a new tab…" / "disables WhatsApp…"**: click `assistant-detail-menu-trigger`, then assert on `assistant-detail-menu-whatsapp` (presence/absence + `href`) instead of `assistant-reply-whatsapp`; drop the `setValue` step on the draft (the header menu link no longer reads it — see Open Questions).
- **"closes a request only after confirmation…"**: click `assistant-detail-menu-trigger`, then `assistant-detail-menu-close`, before the existing `assistant-close-confirm` click.
- Every other case in the file only touches `assistant-detail-question`, `assistant-conversation-message`, `assistant-detail-answer-text`, `assistant-reply-*` — these testids are preserved verbatim, so those assertions need no change.

## Risks

- **`AlertDialog` opened from a closing `DropdownMenu`.** Both are teleported/portalled overlays;
  opening the dialog in the same tick the dropdown closes can lose focus or flicker. Mitigation:
  `@select.prevent` on the "Clore la demande" item (Reka UI's documented pattern for a menu item that
  opens a dialog) so the dropdown's own close/focus-return doesn't race the dialog. This class of bug
  rarely reproduces in `happy-dom`, so verify it once in the real browser during Task 1, not just via
  the test suite.
- **Losing the always-visible contact card** is a real workflow change for staff who reference
  phone/email while typing a reply — they now open a popover that does not stay visible alongside the
  composer by default. This is Option C's own deliberate trade-off (Option B's persistent rail exists
  precisely for teams that need this), not a bug; flagging so the user can veto it before Task 1
  lands rather than after.
- **Dropping the composer's live-draft WhatsApp preview** narrows today's behavior slightly — see
  Open Question 1.

## Open questions

1. **Does the header's WhatsApp menu item preview the unsent draft, or only the sent `reponse`?**
   **Recommendation: only `reponse`** — `whatsappLink(demande.telephone, demande.reponse ?? "")`.
   A header menu action depending on ephemeral, unsaved composer state would require lifting the
   `draft` ref out of `Composer.vue` into `RequestDetail.vue` for a marginal benefit. Drops today's
   "preview what I'm about to send" fallback (see Risks).
2. **Should a `conversation.messages[0]` that echoes `demande.question` be de-duplicated?**
   **Recommendation: no.** The current UI already shows both as separate sections with the same
   overlap risk — this redesign changes presentation only, not this pre-existing data behavior.
   De-duplicating would mean guessing at a text-equality rule the backend does not guarantee.
3. **Is there a "closed at" timestamp for a system row when `statut === 'close'`?**
   **No** — `DemandeAssistanceDetail` has no such field. **Recommendation: don't add a synthetic row**
   for it; keep today's `closedNotice` paragraph where the composer would be. The header's status pill
   already says "close"; an undated row would add noise, not information.
