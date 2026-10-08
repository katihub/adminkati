import type { BanniereAdmin, EmplacementBanniere } from "@/types/api/vitrine"

export type ArtworkIssue = "largeNotLandscape" | "mobileNotNarrower"

export interface Dimensions {
  width: number
  height: number
}

/**
 * Mirrors `verifierPieces` (`src/vitrine/vitrine.service.ts:246-260` in nowtech-backend)
 * exactly, including its two boundary operators (`<=`, `>=`) — a client check that drifts from
 * those would silently accept pairs the server then rejects:
 *
 * - a `principal` artwork is wider than tall. `promo` takes any format, so a square or portrait
 *   visual is only an issue in the main carousel;
 * - a mobile artwork is narrower than the large one, in either placement.
 *
 * A missing side yields no issue for its own rule; whether an artwork is required at all is a
 * separate field-level check, not this one's job.
 */
function largeArtworkIssue(emplacement: EmplacementBanniere, large: Dimensions | null): ArtworkIssue | null {
  return emplacement === "principal" && large && large.width <= large.height ? "largeNotLandscape" : null
}

function mobileArtworkIssue(large: Dimensions | null, mobile: Dimensions | null): ArtworkIssue | null {
  return large && mobile && mobile.width >= large.width ? "mobileNotNarrower" : null
}

export function validateBannerArtwork(
  emplacement: EmplacementBanniere,
  large: Dimensions | null,
  mobile: Dimensions | null,
): ArtworkIssue[] {
  return [largeArtworkIssue(emplacement, large), mobileArtworkIssue(large, mobile)].filter(
    (issue): issue is ArtworkIssue => issue !== null,
  )
}

/**
 * The stored size of a banner's phone artwork, or `null` when it has none: the four mobile
 * columns are `null` together, so one missing dimension means no variant at all.
 */
export function storedMobileDimensions(
  banner: Pick<BanniereAdmin, "largeur_mobile" | "hauteur_mobile">,
): Dimensions | null {
  return banner.largeur_mobile !== null && banner.hauteur_mobile !== null
    ? { width: banner.largeur_mobile, height: banner.hauteur_mobile }
    : null
}

/**
 * Where a banner shows. Anything but `promo` reads as `principal`, the backend's default: a row
 * read from a backend that predates placements then still lands in the carousel it was in.
 */
export function bannerEmplacement(banner: Pick<BanniereAdmin, "emplacement">): EmplacementBanniere {
  return banner.emplacement === "promo" ? "promo" : "principal"
}

/**
 * The frame a banner's large artwork is cropped to: the main carousel is a wide strip, a promo
 * artwork is closer to 16:10. The list card, the panel and the form all use it, so the crop
 * chosen while editing is the one shown everywhere else.
 */
export function bannerFrameClass(emplacement: EmplacementBanniere): string {
  return emplacement === "promo" ? "aspect-[16/10] w-full" : "aspect-[21/9] w-full"
}
