import type { Categorie } from "../../app/types/api/taxonomie"
import { describe, expect, it } from "vitest"
import {
  buildCategoryTree,
  filterCategoryTree,
  getCategoryDescendantIds,
  sortCategoryTree,
} from "../../app/utils/category-tree"

function category(id: number, nom: string, parent_id: number | null, compte_total = 0): Categorie {
  return {
    id,
    nom,
    slug: nom.toLowerCase().replaceAll(" ", "-"),
    parent_id,
    niveau: parent_id === null ? 0 : 1,
    rayon: "tech",
    compte_total,
    masquee: false,
  }
}

const categories = [
  category(1, "Informatique", null, 20),
  category(2, "Accessoires", 1, 5),
  category(3, "Cables USB", 2, 2),
  category(4, "Audio", null, 9),
  category(5, "Casques", 4, 11),
  category(6, "Orpheline", 999, 1),
]

function names(nodes: ReturnType<typeof buildCategoryTree>): unknown[] {
  return nodes.map(node => [node.category.nom, names(node.children)])
}

describe("category tree utilities", () => {
  it("keeps an orphaned category visible at the root", () => {
    const tree = buildCategoryTree(categories)

    expect(tree.map(node => node.category.nom)).toContain("Orpheline")
  })

  it("identifies a category's complete descendant set for cycle-safe parent selection", () => {
    expect([...getCategoryDescendantIds(categories, 1)].sort((left, right) => left - right)).toEqual([2, 3])
  })

  it("retains the complete ancestor path when a leaf matches a filter", () => {
    const tree = buildCategoryTree(categories)
    const filtered = filterCategoryTree(tree, item => item.nom === "Cables USB")

    expect(names(filtered.nodes)).toEqual([["Informatique", [["Accessoires", [["Cables USB", []]]]]]])
    expect([...filtered.matchingIds]).toEqual([3])
  })

  it("sorts sibling groups without detaching their children", () => {
    const tree = buildCategoryTree(categories)
    const sorted = sortCategoryTree(tree, { key: "compte_total", direction: "desc" })

    expect(names(sorted)).toEqual([
      ["Informatique", [["Accessoires", [["Cables USB", []]]]]],
      ["Audio", [["Casques", []]]],
      ["Orpheline", []],
    ])
  })
})
