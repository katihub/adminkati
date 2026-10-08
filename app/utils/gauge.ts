export interface ArcGeometry {
  d: string
  angle: number
  indefini: boolean
}

const DEGREES_PAR_POINT = 3.6
const ANGLE_DEPART = -90

function pointSurCercle(angle: number, rayon: number) {
  const radians = (angle * Math.PI) / 180
  return {
    x: Number((Math.cos(radians) * rayon).toFixed(3)),
    y: Number((Math.sin(radians) * rayon).toFixed(3)),
  }
}

function arcPath(angle: number, rayon: number) {
  const debut = pointSurCercle(ANGLE_DEPART, rayon)
  const fin = pointSurCercle(ANGLE_DEPART + angle, rayon)

  if (angle === 360) {
    const oppose = { x: -debut.x, y: -debut.y }
    return `M ${debut.x} ${debut.y} A ${rayon} ${rayon} 0 1 1 ${oppose.x} ${oppose.y} A ${rayon} ${rayon} 0 1 1 ${debut.x} ${debut.y}`
  }

  return `M ${debut.x} ${debut.y} A ${rayon} ${rayon} 0 ${angle > 180 ? 1 : 0} 1 ${fin.x} ${fin.y}`
}

export function scoreToArc(score: number, rayon: number): ArcGeometry {
  if (Number.isNaN(score)) return { d: "", angle: 0, indefini: true }

  const normalized = Math.min(100, Math.max(0, score))
  const angle = normalized * DEGREES_PAR_POINT
  return {
    d: arcPath(angle, Math.max(0, rayon)),
    angle,
    indefini: false,
  }
}
