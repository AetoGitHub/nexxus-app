/**
 * Handler de `@input` para campos de nombre. Corrige el valor del `<input>` en el sitio
 * conservando el cursor: solo con el estado reactivo, al editar a mitad del texto el cursor
 * saltaría al final y una letra sobrescrita por su mayúscula se quedaría mostrando.
 */
export function normalizeNameInput(event: Event): void {
  const input = event.target
  if (!(input instanceof HTMLInputElement)) {
    return
  }

  const normalized = toNameCase(input.value)
  if (normalized === input.value) {
    return
  }

  const { selectionStart, selectionEnd } = input
  input.value = normalized
  input.setSelectionRange(selectionStart, selectionEnd)
}

/**
 * Formato de nombres propios: inicial de cada palabra en mayúscula y el resto en minúscula
 * (`"jUAN carlos"` -> `"Juan Carlos"`, `"o'brien-lópez"` -> `"O'Brien-López"`).
 * No recorta espacios, para poder usarse mientras el usuario escribe.
 */
export function toNameCase(value: string): string {
  return value
    .toLocaleLowerCase('es')
    .replace(/(^|[\s'’-])(\p{L})/gu, (_match, separator: string, letter: string) =>
      separator + letter.toLocaleUpperCase('es'))
}
