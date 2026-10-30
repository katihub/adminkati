/** BackendKati/src/marketplace/finance/finance-vendeur.service.ts:77 — lireComptesBoutique. */
export interface SellerFinanceSummary {
  boutique: { id: string; nom: string }
  soldes: { disponibleFcfa: number; geleFcfa: number }
  transactions: Array<{
    id: string
    type: string
    libelle: string
    creeLe: string
    sousCommandeId: string | null
    ecritures: Array<{ sens: string; compte: string; montantFcfa: number; libelle: string | null }>
  }>
  destinations: Array<{ id: string; type: string; expireLe: string | null }>
}
