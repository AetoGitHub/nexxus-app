const MIRRORED_PROPERTIES = [
  'direction',
  'boxSizing',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'borderStyle',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'fontStyle',
  'fontVariant',
  'fontWeight',
  'fontStretch',
  'fontSize',
  'fontSizeAdjust',
  'lineHeight',
  'fontFamily',
  'textAlign',
  'textTransform',
  'textIndent',
  'letterSpacing',
  'wordSpacing',
  'tabSize',
] as const

export interface CaretCoordinates {
  /** Distancia desde el borde superior del textarea (sin descontar el scroll). */
  top: number
  /** Distancia desde el borde izquierdo del textarea (sin descontar el scroll). */
  left: number
  /** Alto de una línea. */
  height: number
}

/**
 * Posición del carácter `position` dentro de un textarea, medida con un espejo invisible que copia su tipografía y
 * su ancho. Sirve para abrir un menú junto al cursor.
 */
export function getCaretCoordinates(textarea: HTMLTextAreaElement, position: number): CaretCoordinates {
  const computed = getComputedStyle(textarea)
  const mirror = document.createElement('div')
  const style = mirror.style

  for (const property of MIRRORED_PROPERTIES) {
    style[property] = computed[property]
  }
  // Mismo ancho de texto que el textarea: sin la barra de scroll vertical, que le quita espacio.
  const borders = Number.parseFloat(computed.borderLeftWidth) + Number.parseFloat(computed.borderRightWidth)
  const scrollbar = Math.max(0, textarea.offsetWidth - textarea.clientWidth - borders)
  style.width = `${textarea.offsetWidth - scrollbar}px`
  style.position = 'absolute'
  style.visibility = 'hidden'
  style.top = '0'
  style.left = '-9999px'
  style.overflow = 'hidden'
  style.whiteSpace = 'pre-wrap'
  style.overflowWrap = 'break-word'

  mirror.textContent = textarea.value.slice(0, position)
  const marker = document.createElement('span')
  // El resto del texto (o un punto) mantiene el salto de línea tal como lo haría el textarea.
  marker.textContent = textarea.value.slice(position) || '.'
  mirror.appendChild(marker)
  document.body.appendChild(mirror)

  const lineHeight = Number.parseFloat(computed.lineHeight)
  const coordinates: CaretCoordinates = {
    top: marker.offsetTop + Number.parseFloat(computed.borderTopWidth),
    left: marker.offsetLeft + Number.parseFloat(computed.borderLeftWidth),
    height: Number.isFinite(lineHeight) ? lineHeight : Number.parseFloat(computed.fontSize) * 1.4,
  }

  document.body.removeChild(mirror)
  return coordinates
}
