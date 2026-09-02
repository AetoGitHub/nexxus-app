/** Superficie elevada compartida por la card de tabla y las cards sobre la tabla */
export const LIST_SURFACE_CARD_CLASS
  = 'border border-slate-200/70 bg-white shadow-sm dark:border-white/10 dark:bg-elevated dark:shadow-none'

/** Card contenedora: ocupa el alto restante del viewport para que el scroll viva dentro de la tabla */
export const LIST_TABLE_CARD_CLASS = `flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl ${LIST_SURFACE_CARD_CLASS} max-sm:shrink-0 max-sm:flex-none sm:min-h-0`

/** Viewport de scroll dentro de la card */
export const LIST_TABLE_INNER_CLASS
  = 'relative min-h-0 flex-1 max-sm:h-[min(600px,85dvh)] max-sm:min-h-0 max-sm:flex-none max-sm:overflow-hidden sm:min-h-0'

/** Root de UTable: scroll vertical propio, separadores de fila y scroll horizontal en móvil */
export const LIST_TABLE_UI_CLASS
  = 'min-h-0 h-full w-full overflow-y-auto max-sm:overflow-x-auto max-sm:[&_table]:min-w-2xl [&_tbody]:divide-slate-100 dark:[&_tbody]:divide-white/6'
