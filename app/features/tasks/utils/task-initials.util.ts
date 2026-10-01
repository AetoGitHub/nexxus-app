/** Iniciales de una persona (máx. 2): primeras letras de sus dos primeras palabras. */
export function personInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0).toLocaleUpperCase())
    .join('')
}
