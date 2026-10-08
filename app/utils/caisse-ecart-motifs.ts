export interface CaisseEcartMotif {
  /**
   * Sent verbatim as `motif` to `POST /caisses/:id/ecart` — `caisse.service.ts`'s journal
   *  entry matches `non_explique` exactly to raise an alert, so these values are fixed, not
   *  free text (backend accepts any string up to 60 chars; this is a frontend vocabulary).
   */
  value: string
  labelKey: string
}

export const CAISSE_ECART_MOTIFS: CaisseEcartMotif[] = [
  { value: "caisse_manquante", labelKey: "caisse.discrepancy.motifs.caisse_manquante" },
  { value: "caisse_excedentaire", labelKey: "caisse.discrepancy.motifs.caisse_excedentaire" },
  { value: "erreur_rendu_monnaie", labelKey: "caisse.discrepancy.motifs.erreur_rendu_monnaie" },
  { value: "vol_suspecte", labelKey: "caisse.discrepancy.motifs.vol_suspecte" },
  { value: "erreur_saisie", labelKey: "caisse.discrepancy.motifs.erreur_saisie" },
  { value: "non_explique", labelKey: "caisse.discrepancy.motifs.non_explique" },
]
