function round(value: number) {
  return Number(value.toFixed(3))
}

function point(x: number, y: number) {
  return `${round(x)} ${round(y)}`
}

export function sparklineEndpoint(
  valeurs: readonly number[],
  largeur: number,
  hauteur: number,
): { x: number; y: number } | null {
  if (valeurs.length === 0) return null
  if (valeurs.length === 1 || Math.min(...valeurs) === Math.max(...valeurs))
    return { x: valeurs.length === 1 ? largeur / 2 : largeur, y: hauteur / 2 }

  const minimum = Math.min(...valeurs)
  const amplitude = Math.max(...valeurs) - minimum
  const dernier = valeurs[valeurs.length - 1] ?? minimum
  return {
    x: largeur,
    y: hauteur - ((dernier - minimum) / amplitude) * hauteur,
  }
}

export function sparklinePath(valeurs: readonly number[], largeur: number, hauteur: number): string | null {
  if (valeurs.length === 0) return null

  const midY = hauteur / 2
  if (valeurs.length === 1) return `M ${point(largeur / 2 - 2, midY)} L ${point(largeur / 2 + 2, midY)}`

  const minimum = Math.min(...valeurs)
  const maximum = Math.max(...valeurs)
  if (minimum === maximum) return `M ${point(0, midY)} L ${point(largeur, midY)}`

  const amplitude = maximum - minimum
  const lastIndex = valeurs.length - 1
  const points = valeurs.map((valeur, index) => {
    const x = (index / lastIndex) * largeur
    const y = hauteur - ((valeur - minimum) / amplitude) * hauteur
    return point(x, y)
  })

  return `M ${points.join(" L ")}`
}
