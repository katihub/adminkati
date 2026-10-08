import type { BanniereAdmin } from "@/types/api/vitrine"
import type { BannerStatusFilter } from "@/types/content"

export interface BannerFilterCriteria {
  status: BannerStatusFilter
  search: string
}

/**
 * Case-insensitive substring match via `toLocaleLowerCase()` on both sides. No accent
 * folding — "Bannière" will not match a search for "banniere". If that turns out to
 * matter, it is a one-line change here and nowhere else.
 */
export function filterBanners(banners: BanniereAdmin[], { status, search }: BannerFilterCriteria): BanniereAdmin[] {
  const term = search.trim().toLocaleLowerCase()

  return banners.filter(banner => {
    if (status === "active" && !banner.active) return false
    if (status === "inactive" && banner.active) return false
    return !term || banner.libelle.toLocaleLowerCase().includes(term)
  })
}
