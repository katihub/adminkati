/**
 * The two blocks of the home page's opening row, in row order: `principal` is the Banner
 * carousel, `promo` the Promo carousel beside it. Mirrors `EMPLACEMENTS`
 * (`src/vitrine/vitrine.dto.ts:65-66`) and the `bannieres_emplacement_connu` constraint
 * (`sql/vitrine.sql:139-142`) in nowtech-backend.
 */
export type EmplacementBanniere = "principal" | "promo"

/**
 * Mirrors `BanniereDetaillee` (`src/vitrine/vitrine.service.ts:30-41`) and `sql/vitrine.sql`
 * (table at l. 31, `emplacement` at l. 123) in nowtech-backend. The list comes grouped,
 * `principal` first then `promo`, each placement in its own `ordre`.
 *
 * THE PHONE VARIANT MAY BE ABSENT. `fichier_mobile`, both mobile dimensions and `url_mobile`
 * are then `null` together (`bannieres_mobile_complete`, l. 148-151), and the storefront crops
 * `large` around `focus` on a phone.
 */
export interface BanniereAdmin {
  id: number
  emplacement: EmplacementBanniere
  ordre: number
  active: boolean
  fichier_large: string
  largeur_large: number
  hauteur_large: number
  fichier_mobile: string | null
  largeur_mobile: number | null
  hauteur_mobile: number | null
  href: string
  libelle: string
  alt: string
  focus: number
  creee_le: string
  modifiee_le: string
  modifiee_par: string | null
  /** `stockage.urlPublique(fichier_*, "branding")` — already absolute. */
  url_large: string
  url_mobile: string | null
}

/**
 * Mirrors `CreerBanniereDto` (`src/vitrine/vitrine.dto.ts:84-117`) in nowtech-backend. The
 * files travel as multipart parts on `POST /vitrine/administration/bannieres`: `large` is
 * required, `mobile` optional. Without `emplacement` the banner is `principal`; without
 * `ordre` it lands at the end of its placement.
 */
export interface CreerBanniereInput {
  emplacement?: EmplacementBanniere
  href: string
  libelle: string
  alt: string
  focus?: number
  active?: boolean
  ordre?: number
}

/**
 * Mirrors `ModifierBanniereDto` (`src/vitrine/vitrine.dto.ts:119-147`): the same fields, all
 * optional, for `PATCH /vitrine/administration/bannieres/:id`. Changing `emplacement` moves the
 * banner to the end of the other carousel unless `ordre` is sent too.
 */
export type ModifierBanniereInput = Partial<CreerBanniereInput>

/**
 * Mirrors `ReordonnerBannieresDto` (`src/vitrine/vitrine.dto.ts:176-179`): every id of ONE
 * placement, first to last. An id from the other placement, a repeated id or a partial list
 * is refused (`vitrine.service.ts:553-599`).
 */
export interface ReordonnerBannieresInput {
  emplacement: EmplacementBanniere
  ids: number[]
}

/**
 * Route param for `POST /vitrine/administration/bannieres/:id/image/:variante`, which replaces
 * either artwork or adds the missing phone one (`vitrine.controller.ts:310`). Only `mobile`
 * can be removed, by `DELETE` on the same path (`vitrine.controller.ts:345`).
 */
export type VarianteBanniere = "large" | "mobile"

/** Mirrors `src/vitrine/vitrine.service.ts:537` (`DELETE` response — not a row) in nowtech-backend. */
export interface SuppressionBanniere {
  id: number
  supprimee: true
}

/**
 * A counter reduced to what the perimeter screens need: the key that team profiles
 * and orders store verbatim, and the label a human reads. Everything that shows a
 * `comptoir` takes this shape rather than the whole point-of-sale row.
 */
export interface Comptoir {
  cle: string
  libelle: string
}

/**
 * One number of a counter, in display order. Mirrors `TelephoneComptoir`
 * (`src/vitrine/vitrine.service.ts:97-100`) and `TelephoneComptoirDto`
 * (`src/vitrine/vitrine.dto.ts:240-261`) in nowtech-backend: `+237 XXX XX XX XX`, and `whatsapp`
 * only ever true on a mobile. The public route publishes the same list as
 * `phones: [{ number, whatsapp }]`, which the storefront and the shop assistant both read.
 */
export interface TelephonePointVente {
  numero: string
  whatsapp: boolean
}

/**
 * Mirrors `PointVenteDetaille` (`src/vitrine/vitrine.service.ts:108-125`) and `sql/vitrine.sql`
 * (table at l. 181, `libelle`/`telephones`/`carte` from l. 273) in nowtech-backend.
 * `latitude`/`longitude` are already numbers — the service converts Postgres `numeric` — and
 * are null together or not at all. The former `telephone`/`whatsapp` columns are no longer
 * returned: `telephones` replaced them.
 */
export interface PointVenteAdmin {
  id: number
  /** The value profiles, addresses and orders store as their `comptoir`. Immutable after creation. */
  cle: string
  /** What a customer reads; unique among the open counters of a city. */
  libelle: string
  ville: string
  quartier: string
  repere: string
  telephones: TelephonePointVente[]
  /** A Google Maps link over https, published as is. */
  carte: string | null
  horaires: string | null
  latitude: number | null
  longitude: number | null
  ordre: number
  active: boolean
  creee_le: string
  modifiee_le: string
  modifiee_par: string | null
}

/**
 * Mirrors `CreerPointVenteDto` (`src/vitrine/vitrine.dto.ts:362-441`). Sending the former
 * `telephone` or `whatsapp` is refused with a message naming `telephones`.
 */
export interface CreerPointVenteInput {
  cle: string
  libelle: string
  ville: string
  quartier: string
  repere: string
  telephones?: TelephonePointVente[]
  carte?: string
  horaires?: string
  latitude?: number
  longitude?: number
  active?: boolean
}

/**
 * Mirrors `ModifierPointVenteDto` (`src/vitrine/vitrine.dto.ts:457-517`): everything but `cle`,
 * `null` clears an optional field, and `telephones` replaces the whole list (`[]` removes every
 * number).
 */
export interface ModifierPointVenteInput {
  libelle?: string
  ville?: string
  quartier?: string
  repere?: string
  telephones?: TelephonePointVente[]
  carte?: string | null
  horaires?: string | null
  latitude?: number | null
  longitude?: number | null
  active?: boolean
}

/** Mirrors `src/vitrine/vitrine.service.ts:940` (`DELETE` response) in nowtech-backend. */
export interface SuppressionPointVente {
  id: number
  supprime: true
}
