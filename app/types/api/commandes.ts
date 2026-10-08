/** Mirrors `prisma/schema.prisma:354-367` in the backend. */
export type StatutCommande =
  | "soumise"
  | "confirmee"
  | "refusee"
  | "en_preparation"
  | "prete_au_retrait"
  | "en_remise"
  | "retour_ouvert"
  | "annulation_demandee"
  | "annulee"
  | "close"

/** Mirrors `commandes.dto.ts:95-121` in the backend. */
export interface ListerCommandesEquipeQuery {
  statut?: StatutCommande
  q?: string
  tri?: "recent" | "ancien" | "montant-croissant" | "montant-decroissant"
  /**
   * The counters to keep, by key. Repeatable — `?comptoir=Akwa&comptoir=Centre-ville`
   * is how the backend reads several — and absent keeps every order, the home
   * deliveries that belong to no counter included.
   */
  comptoir?: string[]
  page?: number
  taille?: number
  clientId?: string
}

/** Mirrors `commandes.service.ts:605-694` in the backend. */
export interface CommandeAnnuairePage {
  total: number
  page: number
  taille: number
  pages: number
  elements: CommandeAnnuaireItem[]
}

/** Mirrors `prisma/schema.prisma:381-387` in the backend. */
export type StatutPaiement = "en_attente" | "paye" | "rembourse"

/** Mirrors `prisma/schema.prisma:397-409` in the backend. */
export type MotifCloture =
  | "livree"
  | "livree_partielle"
  | "retiree"
  | "sans_preuve"
  | "echec_livraison"
  | "expiree_retrait"

/** Mirrors `prisma/schema.prisma:411-418` in the backend. */
export type ModePaiementSouhaite = "especes_comptoir" | "especes_livraison" | "mobile_livraison" | "mobile_plateforme"

/** Mirrors `prisma/schema.prisma:180-186` in the backend. */
export type ModeRemise = "retrait" | "domicile" | "agence"

/** Mirrors `prisma/schema.prisma:423-433` in the backend. */
export type StatutLigneCommande =
  | "commandee"
  | "preparee"
  | "chargee"
  | "presentee"
  | "acceptee"
  | "refusee"
  | "manquante"

/** Mirrors `commandes.reponse.ts:127-156` (`projeterCommandeEquipe`) in the backend. */
export interface CommandeLigneEquipe {
  id: string
  rang: number
  produitId: number
  slug: string
  nomCapture: string
  quantite: number
  quantiteRemise: number
  statutLigne: StatutLigneCommande
  motifEcart: string | null
  /** Financier-only (`direction`/`comptoir`) — absent entirely, not `null`, for `preparation`. */
  prixCapture?: number
  /** Financier-only (`direction`/`comptoir`) — absent entirely, not `null`, for `preparation`. */
  prixFerme?: number | null
}

/** Mirrors `commandes.reponse.ts:127-156` (`projeterCommandeEquipe`) in the backend. */
export interface CommandeListItem {
  id: string
  reference: string
  statut: StatutCommande
  modeRemise: ModeRemise
  modePaiementSouhaite: ModePaiementSouhaite
  comptoir: string | null
  creeLe: string
  closeLe: string | null
  ligneCount: number
  lignes: CommandeLigneEquipe[]
  /** Financier-only (`direction`/`comptoir`) — absent entirely, not `null`, for `preparation`. */
  totalEstimeTtc?: number
  /** Financier-only (`direction`/`comptoir`) — absent entirely, not `null`, for `preparation`. */
  totalFermeTtc?: number | null
  /** Financier-only (`direction`/`comptoir`) — absent entirely, not `null`, for `preparation`. */
  totalFacturableTtc?: number | null
  /** Financier-only (`direction`/`comptoir`) — absent entirely, not `null`, for `preparation`. */
  resteAPayer?: number
  /** Financier-only (`direction`/`comptoir`) — absent entirely, not `null`, for `preparation`. */
  statutPaiement?: StatutPaiement
  /** Financier-only (`direction`/`comptoir`) — absent entirely, not `null`, for `preparation`. */
  clientNom?: string | null
  /** Financier-only (`direction`/`comptoir`) — absent entirely, not `null`, for `preparation`. */
  clientTelephone?: string | null

  /**
   * Did the CUSTOMER confirm they received it. Not a claim the shop can make
   * on its own behalf: the backend refuses `livree`/`retiree` without it, and
   * refuses `sans_preuve`/`echec_livraison` once it is set. An operator who
   * cannot see this flag picks a closure motive blind.
   */
  confirmeParClient: boolean
  motifCloture: MotifCloture | null
  /** The courier this order was handed to, `null` until the counter names one. */
  livreur: CommandeLivreur | null
}

/** Mirrors the `livreur` relation selected in `commandes.reponse.ts`. */
export interface CommandeLivreur {
  id: string
  nom: string
  telephone: string | null
}

/**
 * Mirrors `projeterCommandeAnnuaire` (`commandes.reponse.ts:158-189`) in the backend.
 *
 * NOT `Omit<CommandeListItem, "lignes">`: the annuaire projection never carries
 * `confirmeParClient`, `motifCloture`, or `livreur` at all — those are detail-only
 * fields on `CommandeListItem`, and claiming them here let callers read `undefined`
 * as if it were meaningful.
 */
export interface CommandeAnnuaireItem {
  id: string
  reference: string
  statut: StatutCommande
  modeRemise: ModeRemise
  modePaiementSouhaite: ModePaiementSouhaite
  comptoir: string | null
  creeLe: string
  closeLe: string | null
  ligneCount: number
  /** Financier-only (`direction`/`comptoir`) — absent entirely, not `null`, for `preparation`. */
  totalEstimeTtc?: number
  /** Financier-only (`direction`/`comptoir`) — absent entirely, not `null`, for `preparation`. */
  totalFermeTtc?: number | null
  /** Financier-only (`direction`/`comptoir`) — absent entirely, not `null`, for `preparation`. */
  totalFacturableTtc?: number | null
  /** Financier-only (`direction`/`comptoir`) — absent entirely, not `null`, for `preparation`. */
  resteAPayer?: number
  /** Financier-only (`direction`/`comptoir`) — absent entirely, not `null`, for `preparation`. */
  statutPaiement?: StatutPaiement
  /** Financier-only (`direction`/`comptoir`) — absent entirely, not `null`, for `preparation`. */
  clientNom?: string | null
  /** Financier-only (`direction`/`comptoir`) — absent entirely, not `null`, for `preparation`. */
  clientTelephone?: string | null
}

/**
 * Mirrors `projeterCommandeEquipe` in the backend.
 *
 * NO LONGER THE SAME SHAPE AS THE LIST, and the comment that said it was went
 * stale the day the projection grew. The detail carries what only a single
 * order can afford to send: when it was received, the address it goes to, the
 * number to call at the door, when the courier was named.
 */
export interface CommandeDetail extends CommandeListItem {
  recuLe: string | null
  momentPaiement: MomentPaiement
  adresseFigee: AdresseFigee | null
  telephoneLivraison: string | null
  livreurAffecteLe: string | null
}

/** The delivery address, copied onto the order so archiving the original cannot lose it. */
export interface AdresseFigee {
  mode?: string
  ville?: string
  quartier?: string | null
  repere?: string | null
}

/** Mirrors `MomentPaiement` in the backend schema. */
export type MomentPaiement = "maintenant" | "a_la_livraison"

/** Mirrors `src/commandes/commandes.controller.ts:45-53` and `src/commandes/commandes.service.ts:200-218` in the backend. */
export interface ConfirmOrderResult {
  id: string
  reference: string
  statut: StatutCommande
}

/** Mirrors `src/commandes/commandes.dto.ts:63-76` in the backend. */
export interface AdvanceOrderInput {
  vers: StatutCommande
  motif?: string
  motifCloture?: MotifCloture
  /**
   * Required to move a `domicile` order into `en_remise`: the backend answers
   * 400 without it. The goods change hands there, and whoever takes them is
   * the only one who will then read, collect on, or close that order.
   */
  livreurId?: string
}

/** Mirrors `AffecterLivreurDto` — assign or correct a courier without changing state. */
export interface AssignLivreurInput {
  livreurId: string
}

/** Mirrors `src/commandes/commandes.controller.ts:76-84` and `src/commandes/commandes.service.ts:447-474` in the backend. */
export interface AdvanceOrderResult {
  id: string
  reference: string
  statut: StatutCommande
}

/** Mirrors `src/caisse/caisse.dto.ts:1-26` in the backend. */
export type MoyenEncaissement = "especes" | "mobile_money" | "virement"

/** Mirrors `src/caisse/caisse.dto.ts:1-26` in the backend. */
export type LieuEncaissement = "comptoir" | "porte"

/** Mirrors `src/caisse/caisse.dto.ts:1-26` in the backend. */
export interface CollectPaymentInput {
  montant: number
  moyen: MoyenEncaissement
  lieu: LieuEncaissement
  note?: string
}

/** Mirrors `prisma/schema.prisma:578-610` and `src/caisse/caisse.service.ts:121-126` in the backend. */
export interface Encaissement {
  id: string
  commandeId: string
  montant: number
  moyen: MoyenEncaissement
  lieu: LieuEncaissement
  encaissePar: string
  remiseCaisseId: string | null
  note: string | null
  creeLe: string
}

/** Mirrors `src/caisse/caisse.service.ts:121-126` in the backend. */
export interface CollectPaymentResult {
  encaissement: Encaissement
  resteAPayer: number
  statutPaiement: Exclude<StatutPaiement, "rembourse">
  caisseId: string | null
}

/** Specified in `BACKEND_REQUIREMENTS.MD` until the backend export endpoint lands. */
export type ExportDocument = "recapitulatif" | "facture" | "bon-preparation"

/** Specified in `BACKEND_REQUIREMENTS.MD` until the backend export endpoint lands. */
export type ExportLocale = "fr" | "en"
