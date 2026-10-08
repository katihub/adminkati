# Image credits

Every committed image in this directory is recorded here — photographer, source URL and the
date it was downloaded. Add a row when you add a file; the attribution is the reason this
file exists.

## `login-showcase.jpg`

The photograph behind the login page's showcase panel (`app/components/auth/ShowcasePanel.vue`).

| | |
| :-- | :-- |
| Photographer | Sarah Dorweiler ([@sarahdorweiler](https://unsplash.com/@sarahdorweiler)) |
| Source | <https://unsplash.com/photos/KcufLkTXYy4> |
| Downloaded | 2026-08-31 |
| Licence | [Unsplash Licence](https://unsplash.com/license) — free for commercial use, no permission needed, attribution requested but not required |
| Dimensions | 2400 × 3600 (portrait, 2:3) |
| Size | 583 KB |

Attribution is not required by the licence. It is recorded anyway because the photographer
asked for it and because a committed binary with no provenance is a liability later.

### Why this one

It is checked against every constraint in NVC-13:

- **Portrait, 2:3** — taller than the required 4:5, so the panel (~56vw × 100vh, which crops
  to roughly 1:1 on a 1920×1080 screen) never has to upscale.
- **2400 × 3600** — clears the 1600 × 2000 floor, which covers a 2× crop at a 1440px-tall
  viewport.
- **583 KB** — well under the 2 MB cap. Served through `@nuxt/image`'s IPX provider, which
  handles delivery sizing and WebP conversion, so the committed file only has to be the
  source of truth.
- **No identifiable faces**, so no model-release or GDPR exposure on a committed asset.
- **No readable text.** The papers on the desk are out of focus; checked at full resolution.
- **No third-party logos or brand marks.**

The subject — a plant in a pot on a pale table — is deliberately close to the mockup's own.

### Why `public/`, not `app/assets/img/`

`AGENTS.md` documents `app/assets/` as holding `css/` and `lottie/`, and `public/` as served
at `/` verbatim. `public/logo.avif` is the existing precedent for a committed binary image,
and IPX optimises `public/` with zero configuration.

Committing the file rather than hotlinking also sidesteps CSP entirely: `nuxt-security`
defaults to `img-src 'self' data:`, and both the file and IPX's `/_ipx/…` output are
same-origin.

### It is decorative

The image ships with `alt=""`. Describing a stock photograph adds noise for screen-reader
users without telling them anything about the page. The showcase panel's headline and body
carry the meaning.

Brightness played no part in the choice. Decision 10.5 puts a `bg-black/30` scrim under a
`bg-black/45` glass card, which guarantees the card's text contrast arithmetically over *any*
image — worst case, a pure-white photograph, still measures 6.1:1. That is what makes the
choice purely aesthetic.
