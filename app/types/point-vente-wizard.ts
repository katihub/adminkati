export const POINT_VENTE_WIZARD_STEPS = ["identity", "contact-info", "review"] as const

export type PointVenteWizardStep = (typeof POINT_VENTE_WIZARD_STEPS)[number]
