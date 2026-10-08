type QueryParams = object

const products = ["v1", "produits"] as const
const taxonomy = ["v1", "taxonomie"] as const
const orders = ["v1", "commandes"] as const
const quotes = ["v1", "devis"] as const
const customers = ["v1", "clients"] as const
const team = ["v1", "equipe", "membres"] as const
const catalogue = ["v1", "catalogue"] as const
const caisse = ["v1", "caisses"] as const
const banners = ["v1", "vitrine", "administration", "bannieres"] as const
const pointsOfSale = ["v1", "vitrine", "administration", "points-vente"] as const
const statistics = ["v1", "statistiques"] as const
const deliveryIntervals = ["v1", "catalogue", "administration", "delais-livraison"] as const
const assistant = ["v1", "assistant", "administration", "demandes"] as const

export const apiQueryKeys = {
  products: {
    all: products,
    list: (params: QueryParams = {}) => [...products, params] as const,
    detail: (id: number | null | undefined) => [...products, id] as const,
    inventory: (id: number | null | undefined) => [...products, "inventaire", id] as const,
    costs: (id: number | null | undefined) => [...products, "couts", id] as const,
  },
  taxonomy: { all: taxonomy },
  catalogue: {
    all: catalogue,
    state: [...catalogue, "etat"] as const,
    proposals: (params: QueryParams = {}) => [...catalogue, "administration", "propositions", params] as const,
    proposal: (id: number) => [...catalogue, "administration", "propositions", id] as const,
  },
  caisse: {
    all: caisse,
    list: (status?: string) => [...caisse, "liste", ...(status ? [status] : [])] as const,
    encours: [...caisse, "encours"] as const,
    detail: (id: string) => [...caisse, id] as const,
  },
  orders: {
    all: orders,
    list: (params: QueryParams = {}) => [...orders, "equipe", "annuaire", params] as const,
    detail: (reference: string | null | undefined) => [...orders, "detail", reference] as const,
  },
  quotes: {
    all: quotes,
    list: (status?: string) => [...quotes, "liste", ...(status ? [status] : [])] as const,
    detail: (reference: string | null | undefined) => [...quotes, "detail", reference] as const,
  },
  customers: {
    all: customers,
    list: (params: QueryParams = {}) => [...customers, "annuaire", params] as const,
    detail: (id: string | null | undefined) => [...customers, id] as const,
  },
  team: {
    all: team,
    list: (params: QueryParams = {}) => [...team, "annuaire", params] as const,
    detail: (id: string | null | undefined) => [...team, id] as const,
  },
  deliveryIntervals: { all: deliveryIntervals },
  banners: { all: banners },
  pointsOfSale: { all: pointsOfSale },
  statistics: {
    all: statistics,
    overview: (period?: string) => [...statistics, "apercu", ...(period ? [period] : [])] as const,
  },
  assistant: {
    all: assistant,
    list: (params: QueryParams = {}) => [...assistant, "liste", params] as const,
    detail: (id: string | null | undefined) => [...assistant, "detail", id] as const,
  },
} as const
