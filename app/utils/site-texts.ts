import type { EmailContent, FaqContent, PageContent, PageSection, SiteTextType } from "@/types/api/site-texts"

/** Paragraphs are edited as one text, separated by a blank line. */
export function paragraphsToText(paragraphs: readonly string[] | undefined) {
  return (paragraphs ?? []).join("\n\n")
}

export function textToParagraphs(text: string) {
  return text
    .split(/\n\s*\n/)
    .map(paragraph => paragraph.trim())
    .filter(Boolean)
}

/** Bullets are edited one per line. */
export function linesToList(text: string) {
  return text
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
}

export interface PageForm {
  titre: string
  accroche: string
  intro: string
  sections: Array<{
    cle?: string
    titre: string
    paragraphes: string
    puces: string
    blocs: Array<{ titre: string; texte: string }>
  }>
}

export function pageToForm(page: PageContent | null | undefined): PageForm {
  return {
    titre: page?.titre ?? "",
    accroche: page?.accroche ?? "",
    intro: page?.intro ?? "",
    sections: (page?.sections ?? []).map(section => ({
      ...(section.cle ? { cle: section.cle } : {}),
      titre: section.titre,
      paragraphes: paragraphsToText(section.paragraphes),
      puces: (section.puces ?? []).join("\n"),
      blocs: (section.blocs ?? []).map(bloc => ({ ...bloc })),
    })),
  }
}

export function formToPage(form: PageForm): PageContent {
  return {
    titre: form.titre.trim(),
    ...(form.accroche.trim() ? { accroche: form.accroche.trim() } : {}),
    intro: form.intro.trim(),
    sections: form.sections.map(section => {
      const puces = linesToList(section.puces)
      const blocs = section.blocs.map(bloc => ({ titre: bloc.titre.trim(), texte: bloc.texte.trim() }))
      return {
        ...(section.cle ? { cle: section.cle } : {}),
        titre: section.titre.trim(),
        paragraphes: textToParagraphs(section.paragraphes),
        ...(puces.length ? { puces } : {}),
        ...(blocs.length ? { blocs } : {}),
      }
    }),
  }
}

export type RichSegment = { kind: "text" | "bold"; text: string } | { kind: "link"; text: string; href: string }

const MARKUP = /\*\*([^*\n]+)\*\*|\[([^\]\n]+)\]\(([^)\s]+)\)/g

/** The two markups a writer may use: **bold** and [label](/page). Everything else stays plain text. */
export function richSegments(text: string): RichSegment[] {
  const segments: RichSegment[] = []
  let last = 0
  for (const match of text.matchAll(MARKUP)) {
    if (match.index > last) segments.push({ kind: "text", text: text.slice(last, match.index) })
    if (match[1]) segments.push({ kind: "bold", text: match[1] })
    else segments.push({ kind: "link", text: match[2]!, href: match[3]! })
    last = match.index + match[0].length
  }
  if (last < text.length) segments.push({ kind: "text", text: text.slice(last) })
  return segments
}

export type SectionChange = { title: string; change: "added" | "changed" | "removed" }

const sameSection = (a: PageSection, b: PageSection) => JSON.stringify(a) === JSON.stringify(b)

/** What a draft changes against the live version, section by section (matched by position). */
export function pageChanges(draft: PageContent, live: PageContent | null | undefined) {
  if (!live) return { header: false, sections: draft.sections.map(s => ({ title: s.titre, change: "added" as const })) }
  const header =
    draft.titre !== live.titre || draft.intro !== live.intro || (draft.accroche ?? "") !== (live.accroche ?? "")
  const sections: SectionChange[] = []
  const count = Math.max(draft.sections.length, live.sections.length)
  for (let i = 0; i < count; i += 1) {
    const now = draft.sections[i]
    const before = live.sections[i]
    if (now && !before) sections.push({ title: now.titre, change: "added" })
    else if (!now && before) sections.push({ title: before.titre, change: "removed" })
    else if (now && before && !sameSection(now, before)) sections.push({ title: now.titre, change: "changed" })
  }
  return { header, sections }
}

export interface EmailForm {
  sujet: string
  paragraphes: string
  bouton: string
}

export function emailToForm(email: EmailContent | null | undefined): EmailForm {
  return { sujet: email?.sujet ?? "", paragraphes: paragraphsToText(email?.paragraphes), bouton: email?.bouton ?? "" }
}

export function formToEmail(form: EmailForm): EmailContent {
  return {
    sujet: form.sujet.trim(),
    paragraphes: textToParagraphs(form.paragraphes),
    ...(form.bouton.trim() ? { bouton: form.bouton.trim() } : {}),
  }
}

/** The FAQ is edited as it is stored: titles and answers are plain strings already. */
export function faqToForm(faq: FaqContent | null | undefined): FaqContent {
  return structuredClone(faq ?? { titre: "", intro: "", rubriques: [] })
}

export function formToFaq(form: FaqContent): FaqContent {
  return {
    titre: form.titre.trim(),
    intro: form.intro.trim(),
    rubriques: form.rubriques.map(rubrique => ({
      id: rubrique.id.trim(),
      titre: rubrique.titre.trim(),
      questions: rubrique.questions.map(question => ({
        id: question.id.trim(),
        question: question.question.trim(),
        reponse: question.reponse.trim(),
        ...(question.fiche?.trim() ? { fiche: question.fiche.trim() } : {}),
      })),
    })),
  }
}

/** One converter per text type, so the draft editor stays the same for all of them. */
export function siteTextCodec(type: SiteTextType) {
  if (type === "courriel")
    return {
      toForm: (v: unknown) => emailToForm(v as EmailContent),
      fromForm: (f: unknown) => formToEmail(f as EmailForm),
    }
  if (type === "faq")
    return { toForm: (v: unknown) => faqToForm(v as FaqContent), fromForm: (f: unknown) => formToFaq(f as FaqContent) }
  return { toForm: (v: unknown) => pageToForm(v as PageContent), fromForm: (f: unknown) => formToPage(f as PageForm) }
}
