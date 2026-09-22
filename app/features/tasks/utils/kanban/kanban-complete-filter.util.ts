/** Convierte un Date local a YYYY-MM-DD (mismo formato que espera date_from/date_to). */
function toDateInputString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Domingo a sábado de la semana que contiene `reference` (hora local del navegador). */
export function currentWeekRange(reference: Date = new Date()): { date_from: string, date_to: string } {
  const start = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate())
  start.setDate(start.getDate() - start.getDay())
  const end = new Date(start)
  end.setDate(start.getDate() + 6)

  return {
    date_from: toDateInputString(start),
    date_to: toDateInputString(end),
  }
}
