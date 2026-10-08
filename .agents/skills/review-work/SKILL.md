---
name: review-work
description: >-
  Review a completed implementation against the plan it was built from. Use when the user supplies
  a walkthrough and a plan and asks for a review, or invokes /review-work. First audits whether the
  implementation actually respects the plan, then reviews security, logic and correctness,
  performance, UI/UX, tests, and code quality, reporting every finding ordered MAJOR, MEDIUM,
  MINOR, INT. Reports findings — it does not apply fixes unless asked.
---

# Review Work

A walkthrough is the author's account of what they built. It is a claim, not evidence. This review
checks the claim against the code, then reviews the code on its own terms.

Two phases, in order:

1. **Plan fidelity** — does the implementation do what the plan said, and does the walkthrough describe what the code actually does?
2. **Quality** — six axes, each with its own bar.

**Report findings. Do not fix them unless the user asks.** A review that silently rewrites the code
being reviewed is not a review.

---

## Step 0 — Gather evidence

Three inputs:

1. **The plan** — what was supposed to be built.
2. **The walkthrough** — what the author says they built.
3. **The code** — what is actually there. This is the only authority.

Get the real diff before reading anything else, so the walkthrough cannot frame your reading:

```bash
rtk git status
rtk git diff main...HEAD          # or the stated base branch
rtk git log --oneline main..HEAD
```

If plan or walkthrough is missing, say which and ask. Reviewing an implementation against a plan
you were never given is guesswork dressed as rigour — though you can still run the Step 2 quality
review, and should offer that.

Read the diff in full before forming any opinion. Then read the surrounding files: a diff shows
what changed, not what broke. A correct-looking hunk that violates an invariant established
elsewhere in the file is invisible in a diff view.

---

## Step 1 — Plan fidelity

Walk the plan item by item. Every item gets one verdict, backed by a file reference:

| Verdict | Meaning |
| :-- | :-- |
| **DONE** | Implemented as planned. |
| **PARTIAL** | Started, but the plan's stated "done when" is not met. |
| **MISSING** | Not implemented, not mentioned. |
| **DEVIATED** | Implemented differently from the plan. |
| **EXTRA** | In the diff, not in the plan. |

DEVIATED and EXTRA are not automatically faults. A deviation the author explains and justifies in
the walkthrough is often the right call — the plan was written with less information than the
implementation had. What matters is whether it was **acknowledged**. Score it on that:

- Deviation, explained in the walkthrough, sound reasoning → note it, no finding.
- Deviation, explained, questionable reasoning → MEDIUM.
- Deviation, unexplained → MEDIUM, or MAJOR if it changes the feature's contract or security posture.
- Extra scope, unexplained → MINOR to MEDIUM depending on blast radius.

Then audit the walkthrough itself against the diff. Any claim the code contradicts — "added
validation on the endpoint" where no validation exists, "all tests pass" where they do not — is
**MAJOR**. An inaccurate walkthrough is worse than no walkthrough: it directs future reviewers away
from the very place the bug lives.

Run the tests yourself. Do not accept a passing claim on trust:

```bash
rtk vitest run
```

---

## Step 2 — Quality review

Six axes. Work through all six even when one produces nothing — a clean axis is a result worth
reporting.

### Security

- **Input trust** — every value crossing a boundary (request body, query param, route param, header, cookie, file upload, third-party response) validated before use, in schema and in type.
- **Injection** — SQL/NoSQL built by concatenation; command execution built from user input; template injection; unsanitized HTML reaching `v-html` or `innerHTML`.
- **Authn/authz** — every new endpoint and route guarded. Object-level checks present: can user A pass user B's ID and get B's data? Missing ownership checks are the most commonly shipped vulnerability class.
- **Server vs. client enforcement** — any check that exists only in the UI is not a check. Confirm the server enforces it independently.
- **Secrets** — no keys, tokens, or credentials in source, in client bundles, in logs, or in error responses.
- **SSRF** — user-supplied URLs fetched server-side without an allowlist.
- **Data exposure** — API responses over-returning; internal IDs, password hashes, or PII leaking through a serializer that was not narrowed.
- **Dependencies** — new packages: are they needed, maintained, and reputable?
- **Errors** — stack traces or internal paths reaching the client.
- **Rate limiting** — on anything expensive, on anything authenticating, on anything sending mail or SMS.

### Logic and correctness

- **Boundaries** — off-by-one, `<` vs `<=`, inclusive/exclusive ranges, empty collections, single-element collections.
- **Null and undefined** — optional chaining hiding a genuine bug rather than handling one; `??` vs `||` where `0` or `""` is a legitimate value.
- **Async** — unawaited promises; unhandled rejections; race conditions between concurrent writes; `Promise.all` where one rejection should not lose the rest.
- **Error paths** — every `catch` either handles or rethrows. A swallowed error is a defect. Failures surface to the user, not just to the console.
- **State** — Vue reactivity actually tracked (destructuring a reactive object breaks it); stale closures; derived state stored where it should be computed.
- **Types** — `any` and `as` casts hiding real mismatches; type assertions asserting something untrue.
- **Dates, money, locale** — timezone assumptions; floating-point arithmetic on currency; string comparison used for ordering.
- **Idempotency** — retries and double submits safe.
- **Dead code** — unreachable branches, unused exports, code the plan superseded.

### Performance

Report a performance finding only where the cost is real and reachable — a hot path, a large
collection, a per-render allocation. Micro-optimisation of cold code is noise, and reporting it
teaches the author to distrust the review.

- **N+1** — queries or requests inside a loop.
- **Render cost** — unmemoized expensive computation; new object/array/function identities passed as props each render; missing or unstable `:key`.
- **Data volume** — unbounded lists without pagination or virtualization; whole tables fetched to compute a count.
- **Bundle** — heavy dependency imported for one function; a library imported wholesale where a submodule would do; something client-side that could be server-only.
- **Waterfalls** — sequential awaits that are independent and could be concurrent.
- **Caching** — recomputed on every call with no memo; cached with no invalidation path.
- **Robustness under load** — behaviour when the backing service is slow or down: does the UI hang, or degrade?

### UI/UX

- **States** — every async surface has loading, empty, and error states, and each is designed rather than a bare string. Loading does not cause layout shift.
- **Feedback** — every action acknowledges: pending, success, failure. Destructive actions confirm. Nothing fails silently.
- **Error copy** — states what happened and what to do next. Never a raw exception or an error code alone.
- **Forms** — validation timing sane (not shrieking on first keystroke); errors adjacent to their field; submit disabled while in flight; the form survives a failed submit with input intact.
- **Keyboard and focus** — reachable and operable by keyboard; visible focus ring; focus trapped in modals and restored on close; `Esc` closes.
- **Accessibility** — labels on every control; icon-only buttons have accessible names; contrast meets AA; meaning never carried by colour alone; heading order sensible; live regions for async updates.
- **Responsive** — works at the project's breakpoints; nothing overflows horizontally; hit targets ~44px on touch.
- **Consistency** — uses existing components and design tokens rather than one-off values. A hand-rolled variant of an existing component is a finding.
- **Dark mode** — where the project supports it, every new surface is correct in both themes.
- **Was it thought through?** — is this the simplest interaction that serves the requirement, or a UI that pushes the implementation's complexity onto the user?

### Tests

Both directions matter. Missing tests and worthless tests are both findings.

**Missing:**
- The core behaviour the change exists to deliver.
- Every branch of non-trivial logic.
- Boundaries and error paths, not just the happy path.
- Any bug fixed in this change — a fix without a regression test invites the bug back.

**Worthless — flag for deletion:**
- Tests asserting the framework works, or that a mock returns what it was told to return.
- Tests asserting implementation details, which break on any refactor while catching no defect.
- Snapshot tests over volatile output that will be blind-updated forever.
- Duplicates covering ground an existing test already holds.
- Tests with no meaningful assertion, or that pass whatever the code does.
- Skipped or commented-out tests. Delete or fix — never leave them.

**And:**
- Tests actually run and pass. Verify; do not take the walkthrough's word.
- Names state the behaviour under test, not the function name.
- No inter-test order dependencies or shared mutable state.

### Code quality

- **DRY, with judgment** — genuine duplicated logic is a finding. Two things that merely look alike and change for different reasons are not; premature abstraction is its own defect. Note which one you are looking at.
- **Comments** — delete comments restating the code, commented-out code, changelog narration ("changed this to fix the bug"), and stale comments contradicting current behaviour. Keep comments explaining *why* a non-obvious choice was made. A long comment explaining confusing code is usually a sign the code should be clearer.
- **Naming** — names say what the thing is or does. No `data2`, `handleClick2`, `tmp`, `flag`.
- **Function size and altitude** — a function doing four things needs to be four functions. Mixed abstraction levels in one body are hard to read.
- **Consistency with the codebase** — matches surrounding idiom, file layout, import order, and naming. New code that is stylistically foreign is a maintenance tax even when it is individually better.
- **Leftovers** — `console.log`, debug branches, `TODO` with no owner or issue, unused imports and variables.
- **Types** — exported surfaces typed; no `any` where a real type is knowable.

---

## Step 3 — Verify before reporting

Every finding must survive this before it goes in the report:

1. **Point at the code.** `file.ts:42`. A finding without a location cannot be acted on.
2. **State a concrete failure.** Specific inputs or state → specific wrong outcome. If you cannot construct one, it is not a finding — it is a preference, and belongs in INT or nowhere.
3. **Confirm it is not already handled** somewhere the diff does not show. Read the surrounding code, the middleware, the parent component, the base class.
4. **Try to refute it.** Argue the author's side. Findings that do not survive that argument are cut.

Precision beats volume. A short review where every item is real gets acted on. A long one padded
with speculation gets skimmed and dismissed, and the real findings go down with it.

---

## Severity

Order the report **MAJOR → MEDIUM → MINOR → INT**.

**MAJOR** — must be fixed before merge.
Exploitable vulnerability, missing authorization, data loss or corruption, a core requirement
broken, a walkthrough claim the code contradicts, tests failing, a crash on a reachable path.

**MEDIUM** — should be fixed before merge; ship without only as a deliberate, recorded decision.
Bug on a non-primary path, missing error handling, missing test for core behaviour, unexplained
plan deviation, real performance problem on a reachable path, missing empty/error state, an
accessibility barrier.

**MINOR** — fix now if cheap, otherwise track.
Naming, small duplication, stale or noise comments, an inconsistency with codebase convention, a
low-value test worth deleting, a nit in copy.

**INT** *(informational)* — no action required.
Observations, context for the reader, future considerations, praise worth recording, and things
deliberately out of scope. Nothing here blocks anything.

When a finding sits between two levels, state why you placed it where you did. Reviews lose their
authority when severity looks arbitrary.

---

## Output template

```markdown
# Review — <feature / branch / PR>

## Verdict
<Two or three sentences: is this mergeable, and what stands in the way.>

- MAJOR: n · MEDIUM: n · MINOR: n · INT: n
- Tests: <command run> → <pass/fail, counts>

## Plan fidelity

| Plan item | Verdict | Evidence |
| :-- | :-- | :-- |
| ... | DONE | `app/pages/x.vue:12` |

**Walkthrough accuracy:** <accurate, or the specific claims the code contradicts.>

## Findings

### MAJOR

**1. <One-line claim>**
- Where: `path/file.ts:42`
- Axis: Security
- Problem: <what is wrong>
- Failure: <concrete inputs/state → wrong outcome>
- Fix: <the specific change>

### MEDIUM
...

### MINOR
...

### INT
...

## Clean axes
<Axes reviewed that produced no findings, named explicitly.>
```

---

## Hard rules

- **The code is the authority.** The walkthrough is a claim to be checked against it.
- **Run the tests.** Never report a test status you did not observe.
- **Every finding carries a location and a concrete failure.** No location, no finding.
- **Report; do not fix**, unless the user asks. If the user asks for fixes, apply them and re-report each finding as fixed / skipped / no change needed.
- **Cover all six axes.** Say so explicitly when an axis is clean.
- **Do not pad.** A speculative finding costs more credibility than the real one next to it earns.
- **Review the code, never the author.** Findings describe code.
