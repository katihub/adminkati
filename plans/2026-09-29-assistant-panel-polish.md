# Assistant conversation panel polish

## Requirement

Three follow-up requests against the customer-request detail panel (`AssistantRequestDetail` and
its children), given directly rather than as an open design question:

1. Give conversation messages avatars: customer initials-from-email (image if ever provided, else
   letter "C"), a sparkle icon for the AI assistant, and a human agent's image-or-initials. Use
   `bg-background` for the conversation area's background.
2. Convert the "save as fiche" `Switch` toggle into an icon button next to Send, with a tooltip
   explaining what it does on hover.
3. In the header: move the status badge next to the title, put the reference code on its own line
   below the title, and remove the received-date line.

## Data-availability decision

The spec asks for image-or-initials for both the customer and the human agent. Checked the type
contract (`app/types/api/assistant.ts`) and the backend checkout at
`/Users/michaelnji/Projects/nvc/NowTech-backend-` (no `assistant` module exists there at all — this
feature's backend is ahead of what's checked out locally, so the frontend type is the only source
of truth right now, per that file's own header comment). Neither `DemandeAssistanceDetail` nor
`MessageConversationAssistance` nor `TeamMember`/`reponduPar` carries an avatar/image field, and
`MessageConversationAssistance` carries no identity at all for `equipe`-authored messages (only the
enum `auteur: "equipe"` — no id, name, or email per message). `reponduPar: { id, nom }` (name only,
no email) exists solely for the one closing "answer" event, not for in-thread `equipe` messages.

**Decision**: build the full image → initials → fallback chain as specified (so it's ready the
moment a backend field exists), wire it with whatever's actually available today, and use a
generic fallback icon for the one case with zero data (an in-thread `equipe` message). Flagged
here rather than blocking on it — a UI fallback choice, not a product decision that changes shape.

## Plan

- `app/utils/message-avatar.ts` — `initialsFromEmailOrName(email, name)`: initials from an email's
  local part (dot/underscore/hyphen/plus split, reusing the existing `getInitials`), else from a
  name, else `null`.
- `app/components/assistant/MessageAvatar.vue` — new component. Props: `kind` (the existing
  `AuteurMessageAssistance` enum), `email?`, `name?`, `image?`. Renders via shadcn
  `Avatar`/`AvatarImage`/`AvatarFallback`: image first if given, then sparkle icon (assistant) /
  initials / letter "C" (visiteur) / generic icon (equipe with no data).
- `Thread.vue` — wrap each message bubble (the standalone question, the in-loop messages, the final
  answer) in a flex row with the new avatar, avatar on the outer side matching the existing
  `self-start`/`self-end` alignment. `demande.courriel` for the customer, `demande.reponduPar?.nom`
  for the final answer's human avatar (no email available there).
- `RequestDetail.vue` — `bg-background` on the scrollable conversation container.
- `TooltipIconButton.vue` — add an optional `tooltip?: string` prop (falls back to `label`), so the
  hover text can be longer than the accessible name. Backward compatible — checked its only other
  caller (`BannerPhoneArtworkRow.vue`) doesn't set it.
- `Composer.vue` — replace the `Switch` + `Label` + hint paragraph with a `TooltipIconButton`
  (`ph:bookmark-simple`, `aria-pressed`, filled when active) sitting next to Send; reuses the
  existing `assistant.reply.saveAsFiche`/`saveAsFicheHint` i18n strings verbatim (label / tooltip).
  The fiche title/domain fields keep their own conditional block, now gated on
  `canSaveFiche && saveAsFiche` directly.
- `DetailHeader.vue` — title and status badge in one row; reference moves to its own line below;
  the received-`<time>` line is deleted (and its now-unused `formatDateCourte`/`locale` imports).

## Tests

- `test/unit/message-avatar.test.ts` — `initialsFromEmailOrName`: email-first, dotted-local-part
  splitting, name fallback, null when neither, null for an empty local part.
- `test/nuxt/message-avatar.test.ts` — `MessageAvatar.vue` mounted directly: sparkle for assistant
  regardless of name/email; customer initials from email; customer letter "C" fallback; human
  initials from email; human initials from name when no email; human generic-icon fallback when
  neither exists.
- `test/nuxt/assistant-workspace.test.ts` — existing `aria-checked` assertion on the fiche toggle
  updated to `aria-pressed` (toggle button, not a switch). No other existing assertion in this file
  depends on the DOM structure being reshuffled (header, thread bubbles) — all query by
  `data-testid`/`.text()`, order- and nesting-agnostic.

## Slug

`assistant-panel-polish`.
