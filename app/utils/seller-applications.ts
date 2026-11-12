import type {
  SellerApplicationTab,
  SellerDocument,
  SellerFileRequirement,
  SellerReviewListItem,
} from "@/types/api/marketplace-moderation"

/**
 * Sorting and following seller applications (12 November 2026).
 * See plans/2026-11-12-candidatures-vendeurs-tri.md.
 */
export const SELLER_APPLICATION_TABS: readonly SellerApplicationTab[] = [
  "a_traiter",
  "attente_vendeur",
  "sans_piece",
  "valides",
  "refuses",
  "retires",
]

export const DEFAULT_SELLER_APPLICATION_TAB: SellerApplicationTab = "a_traiter"

export function parseSellerApplicationTab(value: string | null | undefined): SellerApplicationTab {
  return SELLER_APPLICATION_TABS.find(tab => tab === value) ?? DEFAULT_SELLER_APPLICATION_TAB
}

export function parsePage(value: string | null | undefined): number {
  const page = Number.parseInt(value ?? "", 10)
  return Number.isFinite(page) && page > 1 ? page : 1
}

const UNDECIDED = ["brouillon", "soumis", "en_verification"]

/** What the list card signals about an application. */
export function sellerApplicationBadges(seller: SellerReviewListItem) {
  return {
    /** The seller sent a document while the file awaited changes. */
    completed: seller.resoumis === true,
    /** An approved seller sent a new document: a renewal, not a new application. */
    renewal: Boolean(seller.approuveLe) && UNDECIDED.includes(seller.statutVerification),
  }
}

export interface SellerDocumentGroup {
  type: string
  /** The documents that count today: the latest one, or every photo of a multiple type. */
  current: SellerDocument[]
  /** Older versions replaced by a newer document of the same type. */
  previous: SellerDocument[]
  /** The current document was sent after the last refusal of a document of this type. */
  isNew: boolean
}

/**
 * Documents grouped by type, in the order of the required documents, then any other type.
 * Within a type, the most recent document is the one in force; older ones are kept as history.
 */
export function groupSellerDocuments(
  documents: readonly SellerDocument[],
  requirements: readonly SellerFileRequirement[] = [],
): SellerDocumentGroup[] {
  const order = requirements.map(requirement => requirement.type)
  const multiple = new Set(
    requirements.filter(requirement => requirement.multiple).map(requirement => requirement.type),
  )
  const types = [...new Set(documents.map(document => document.type))].sort((a, b) => {
    const ra = order.indexOf(a)
    const rb = order.indexOf(b)
    return (ra === -1 ? order.length : ra) - (rb === -1 ? order.length : rb) || a.localeCompare(b)
  })

  return types.map(type => {
    const ofType = documents
      .filter(document => document.type === type)
      .sort((a, b) => Date.parse(b.creeLe) - Date.parse(a.creeLe))
    const current = multiple.has(type) ? ofType : ofType.slice(0, 1)
    const previous = multiple.has(type) ? [] : ofType.slice(1)
    const lastRefusal = Math.max(
      ...ofType
        .filter(document => document.statut === "refuse" && document.decideLe)
        .map(document => Date.parse(document.decideLe!)),
      Number.NEGATIVE_INFINITY,
    )
    const latest = ofType[0]
    const isNew =
      Number.isFinite(lastRefusal) &&
      Boolean(latest) &&
      latest!.statut !== "refuse" &&
      Date.parse(latest!.creeLe) > lastRefusal
    return { type, current, previous, isNew }
  })
}

/** The applications around the open one, in the order of the list. */
export function neighbourApplications(ids: readonly string[], currentId: string | null) {
  const index = currentId ? ids.indexOf(currentId) : -1
  if (index === -1) return { previous: null, next: null }
  return { previous: ids[index - 1] ?? null, next: ids[index + 1] ?? null }
}

/** After a decision, the next file to open: the one below, else the one above, else none. */
export function applicationAfterDecision(ids: readonly string[], decidedId: string): string | null {
  const { previous, next } = neighbourApplications(ids, decidedId)
  return next ?? previous
}
