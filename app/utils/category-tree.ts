import type { Categorie } from "@/types/api/taxonomie"

export interface CategoryTreeNode {
  category: Categorie
  children: CategoryTreeNode[]
}

export interface CategoryTreeSort {
  key: "nom" | "compte_total"
  direction: "asc" | "desc"
}

export interface FilteredCategoryTree {
  nodes: CategoryTreeNode[]
  matchingIds: Set<number>
}

export function buildCategoryTree(categories: Categorie[]): CategoryTreeNode[] {
  const nodesById = new Map<number, CategoryTreeNode>(
    categories.map(category => [category.id, { category, children: [] }]),
  )
  const roots: CategoryTreeNode[] = []

  for (const category of categories) {
    const node = nodesById.get(category.id)
    const parent = category.parent_id === null ? undefined : nodesById.get(category.parent_id)

    if (!node || !parent || parent.category.id === node.category.id) roots.push(node!)
    else parent.children.push(node)
  }

  return roots
}

export function getCategoryDescendantIds(categories: Categorie[], categoryId: number): Set<number> {
  const childrenByParentId = new Map<number, number[]>()

  for (const category of categories) {
    if (category.parent_id === null) continue
    const siblings = childrenByParentId.get(category.parent_id) ?? []
    siblings.push(category.id)
    childrenByParentId.set(category.parent_id, siblings)
  }

  const descendants = new Set<number>()
  const pending = [...(childrenByParentId.get(categoryId) ?? [])]

  while (pending.length > 0) {
    const id = pending.pop()
    if (id === undefined || descendants.has(id)) continue
    descendants.add(id)
    pending.push(...(childrenByParentId.get(id) ?? []))
  }

  return descendants
}

export function sortCategoryTree(nodes: CategoryTreeNode[], sort: CategoryTreeSort): CategoryTreeNode[] {
  const factor = sort.direction === "asc" ? 1 : -1

  return nodes
    .map(node => ({ ...node, children: sortCategoryTree(node.children, sort) }))
    .sort((left, right) => factor * compareCategoryNodes(left, right, sort.key))
}

export function filterCategoryTree(
  nodes: CategoryTreeNode[],
  matches: (category: Categorie) => boolean,
): FilteredCategoryTree {
  const matchingIds = new Set<number>()

  function filterNodes(currentNodes: CategoryTreeNode[]): CategoryTreeNode[] {
    return currentNodes.flatMap(node => {
      const children = filterNodes(node.children)
      const isMatch = matches(node.category)

      if (isMatch) matchingIds.add(node.category.id)
      if (!isMatch && children.length === 0) return []

      return [{ ...node, children }]
    })
  }

  return { nodes: filterNodes(nodes), matchingIds }
}

function compareCategoryNodes(left: CategoryTreeNode, right: CategoryTreeNode, key: CategoryTreeSort["key"]): number {
  if (key === "compte_total")
    return left.category.compte_total - right.category.compte_total || left.category.id - right.category.id

  return left.category.nom.localeCompare(right.category.nom, "fr") || left.category.id - right.category.id
}
