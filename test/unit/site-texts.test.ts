import { describe, expect, it } from "vitest"
import {
  emailToForm,
  faqToForm,
  formToEmail,
  formToFaq,
  formToPage,
  pageChanges,
  pageToForm,
  richSegments,
  siteTextCodec,
  textToParagraphs,
} from "../../app/utils/site-texts"

const PAGE = {
  titre: "CGV",
  intro: "Les règles.",
  sections: [
    { titre: "Prix", paragraphes: ["Premier.", "Second."], puces: ["a", "b"] },
    { cle: "acheter", titre: "Acheter", paragraphes: [], blocs: [{ titre: "B", texte: "T" }] },
  ],
}

describe("site texts form", () => {
  it("round-trips a page through the editing form without losing anything", () => {
    expect(formToPage(pageToForm(PAGE))).toEqual(PAGE)
  })

  it("splits paragraphs on blank lines and drops empty ones", () => {
    expect(textToParagraphs("Un.\n\n\nDeux\nsuite.\n  \n")).toEqual(["Un.", "Deux\nsuite."])
  })

  it("reads only bold and links, never HTML", () => {
    expect(richSegments("Voir **ici** et [la page](/cgv) <b>x</b>")).toEqual([
      { kind: "text", text: "Voir " },
      { kind: "bold", text: "ici" },
      { kind: "text", text: " et " },
      { kind: "link", text: "la page", href: "/cgv" },
      { kind: "text", text: " <b>x</b>" },
    ])
  })

  it("lists what a draft changes against the live version", () => {
    const draft = {
      ...PAGE,
      sections: [
        { ...PAGE.sections[0]!, paragraphes: ["Changé."] },
        PAGE.sections[1]!,
        { titre: "Nouveau", paragraphes: ["x"] },
      ],
    }
    expect(pageChanges(draft, PAGE)).toEqual({
      header: false,
      sections: [
        { title: "Prix", change: "changed" },
        { title: "Nouveau", change: "added" },
      ],
    })
    expect(pageChanges({ ...PAGE, titre: "CGV 2", sections: [PAGE.sections[0]!] }, PAGE)).toEqual({
      header: true,
      sections: [{ title: "Acheter", change: "removed" }],
    })
  })
})

describe("site texts converters", () => {
  it("edits an e-mail as subject, paragraphs and an optional button", () => {
    const email = { sujet: "Commande {reference}", paragraphes: ["Bonjour.", "Merci."], bouton: "Voir" }
    expect(emailToForm(email)).toEqual({
      sujet: "Commande {reference}",
      paragraphes: "Bonjour.\n\nMerci.",
      bouton: "Voir",
    })
    expect(formToEmail(emailToForm(email))).toEqual(email)
    expect(formToEmail({ sujet: " S ", paragraphes: "Un.", bouton: "  " })).toEqual({
      sujet: "S",
      paragraphes: ["Un."],
    })
    expect(emailToForm(null)).toEqual({ sujet: "", paragraphes: "", bouton: "" })
  })

  it("keeps the FAQ structure and drops an empty linked sheet", () => {
    const faq = {
      titre: "FAQ",
      intro: "x",
      rubriques: [{ id: "r", titre: "R", questions: [{ id: "q", question: " Q ", reponse: "A", fiche: " " }] }],
    }
    expect(formToFaq(faqToForm(faq))).toEqual({
      titre: "FAQ",
      intro: "x",
      rubriques: [{ id: "r", titre: "R", questions: [{ id: "q", question: "Q", reponse: "A" }] }],
    })
    expect(
      siteTextCodec("courriel").fromForm(siteTextCodec("courriel").toForm({ sujet: "S", paragraphes: ["P"] })),
    ).toEqual({ sujet: "S", paragraphes: ["P"] })
  })
})
