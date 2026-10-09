import type { ApiPeopleResponse } from '~/features/dashboard/types/dashboard-api.types'

type TranslateFn = (key: string) => string

type ExcelCell = string | number | null | { value: string, fontWeight: 'bold' }

/**
 * Rendimiento individual a Excel, con las filas que ya están cargadas en la tabla (no hay endpoint).
 * Una columna por cada columna de la tabla; los porcentajes van como número de 0 a 100 y lo que no tiene datos, vacío.
 * La librería se carga al exportar para no sumarla al peso inicial de la pantalla.
 */
export async function exportPeopleToExcel(response: ApiPeopleResponse, t: TranslateFn): Promise<void> {
  const { default: writeExcelFile } = await import('write-excel-file/browser')

  const headers = [
    '#',
    t('dashboard.individual.columns.collaborator'),
    'TCT (%)',
    'IUR (%)',
    'TC (%)',
    t('dashboard.individual.columns.completed'),
    'TPR (h)',
    `${t('dashboard.individual.columns.weightedLoad')} (%)`,
    `${t('dashboard.individual.excelColumns.pointsDone')}`,
    `${t('dashboard.individual.excelColumns.points')}`,
    `${t('dashboard.individual.columns.pendingLoad')} (pts)`,
    t('dashboard.individual.excelColumns.capacity'),
    `${t('dashboard.individual.columns.pendingLoad')} (%)`,
    t('dashboard.individual.excelColumns.pendingStatus'),
    t('dashboard.individual.excelColumns.quick'),
    t('dashboard.individual.excelColumns.normal'),
    t('dashboard.individual.excelColumns.complex'),
    `${t('dashboard.individual.columns.trend')} (pp)`,
  ]

  const header: ExcelCell[] = headers.map(value => ({ value, fontWeight: 'bold' as const }))

  const rows: ExcelCell[][] = response.people.map(person => [
    person.position,
    person.name,
    person.tct,
    person.iur,
    person.tc,
    `${person.completed}/${person.total}`,
    person.tpr,
    person.weighted_load.percentage,
    person.weighted_load.points_done,
    person.weighted_load.points,
    person.pending_load.points,
    person.pending_load.capacity,
    person.pending_load.percentage,
    t(`dashboard.individual.pendingState.${person.pending_load.status}`),
    person.distribution.quick,
    person.distribution.normal,
    person.distribution.complex,
    person.trend.delta,
  ])

  const columns = headers.map((_, index) => ({ width: index === 1 ? 28 : 16 }))
  const fileName = `rendimiento-individual-${response.period}-${response.start}.xlsx`

  await writeExcelFile([header, ...rows], { columns, sheet: t('dashboard.individual.title') }).toFile(fileName)
}
