/** Mirrors `src/catalogue/administration.service.ts:375-388` in NowTech-backend-. */
export interface Rayon {
  id: string
  slug: string
  nom: string
  nom_court: string | null
  compte_total: number
  /**
   * OPTIONNELLE PARCE QUE LA LECTURE NE LA RENVOIE PAS. Le backend l'accepte en
   * création et en modification (`CreerRayonDto`/`ModifierRayonDto`) et la
   * stocke, mais `select id, slug, nom, nom_court, compte_total from
   * nowtech.rayons` (`administration.service.ts:792`) l'omet : l'écriture part,
   * la relecture revient sans. Le champ reste déclaré pour le jour où la
   * projection la joindra — et pour que les réponses de POST/PATCH, qui font
   * `select *`, ne soient pas tronquées par le type.
   */
  accroche?: string | null
}

/** Mirrors `src/catalogue/administration.service.ts:381-383` in NowTech-backend-. */
export interface Categorie {
  id: number
  nom: string
  slug: string
  parent_id: number | null
  niveau: number
  rayon: string | null
  compte_total: number
  masquee: boolean
}

/** Mirrors `src/catalogue/administration.service.ts:384-386` in NowTech-backend-. */
export interface Marque {
  nom: string
  slug: string
  nombre_produits: number
}

/** Mirrors `src/catalogue/administration.service.ts:375-388` in NowTech-backend-. */
export interface TaxonomieResponse {
  rayons: Rayon[]
  categories: Categorie[]
  marques: Marque[]
}

/** Mirrors `src/catalogue/administration.dto.ts:172-195` in NowTech-backend-. */
export interface CategoriePatchInput {
  nom?: string
  slug?: string
  parent_id?: number | null
  rayon_id?: string | null
  masquee?: boolean
}

/** Mirrors `src/catalogue/administration.dto.ts:197-206` in NowTech-backend-. */
export interface CategorieCreateInput {
  nom: string
  slug: string
  parent_id?: number
  rayon_id?: string
}

/** Mirrors `src/catalogue/administration.dto.ts:215-232` in NowTech-backend-. */
export interface RayonCreateInput {
  id: string
  slug: string
  nom: string
  nom_court: string
  /** `@IsOptional() @IsString() @Length(0, 300)` — la phrase d'en-tête du rayon en vitrine. */
  accroche?: string
}

/** Mirrors `src/catalogue/administration.service.ts:592-616` in NowTech-backend-. */
export interface CategorieDeleteResult {
  id: number
  supprimee: true
}

/** Mirrors `src/catalogue/administration.service.ts:649-663` in NowTech-backend-. */
export interface RayonDeleteResult {
  id: string
  categories: number
}

/** Mirrors `src/catalogue/administration.dto.ts:197-206` in NowTech-backend-. */
export interface RayonPatchInput {
  nom?: string
  nom_court?: string
  accroche?: string | null
}

/** Mirrors `src/catalogue/administration.service.ts:489-493` in NowTech-backend-. */
export interface RecalculTaxonomieResult {
  categories: number
  rayons: number
  marques: number
}
