/** The sidebar sections of the KatiHub AI panel, in display order. Settings is pinned to the bottom. */
export const AI_PANEL_SECTIONS = ["suggestions", "conversations", "settings"] as const

export type AiPanelSection = (typeof AI_PANEL_SECTIONS)[number]
