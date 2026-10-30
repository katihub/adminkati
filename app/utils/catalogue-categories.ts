interface CategoryNode {
  id: string
  nom: string
  active: boolean
  sousCategories?: CategoryNode[]
}
export function catalogueCategoryOptions(
  nodes: CategoryNode[],
  leavesOnly = false,
  parent = "",
): Array<{ id: string; nom: string }> {
  return nodes.flatMap(node => {
    if (!node.active) return []
    const nom = parent ? `${parent} / ${node.nom}` : node.nom
    const children = node.sousCategories ?? []
    const current = leavesOnly && children.length ? [] : [{ id: node.id, nom }]
    return [...current, ...catalogueCategoryOptions(children, leavesOnly, nom)]
  })
}
