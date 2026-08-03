import type { TaskView } from '~/features/tasks/types/task.types'

/** Puntos de esfuerzo por complejidad de tarea. */
export const EFFORT_POINTS = {
  quick: 1,
  normal: 3,
  complex: 8,
} as const

export type SignatureFrequency = 'weekly' | 'biweekly' | 'monthly'
export type SignatureWeekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday'

export interface TaskSettingsGeneralState {
  urgentDueDateRequired: boolean
  projectRequired: boolean
  assigneeRequired: boolean
  typeRoleAuto: boolean
  typeManual: boolean
  typeRecurring: boolean
  typeModuleTrigger: boolean
  defaultView: TaskView
  capacity: number
  weeklyReportEnabled: boolean
  signatureFrequency: SignatureFrequency
  signatureWeekday: SignatureWeekday
  signatureHour: string
}

export interface GeneralMockUser {
  id: string
  name: string
  departmentKey: string
  color: string
  requiresSignature: boolean
}

export interface GeneralPendingSignature {
  id: string
  userId: string
  weekLabel: string
}

export function createDefaultGeneralSettings(): TaskSettingsGeneralState {
  return {
    urgentDueDateRequired: true,
    projectRequired: false,
    assigneeRequired: false,
    typeRoleAuto: true,
    typeManual: true,
    typeRecurring: true,
    typeModuleTrigger: true,
    defaultView: 'list',
    capacity: 20,
    weeklyReportEnabled: true,
    signatureFrequency: 'weekly',
    signatureWeekday: 'monday',
    signatureHour: '09:00',
  }
}

/** Usuarios mock para firma semanal (UI sin backend). */
export function createMockSignatureUsers(): GeneralMockUser[] {
  return [
    {
      id: 'u1',
      name: 'Carlos López',
      departmentKey: 'taskSettings.general.departments.operations',
      color: '#28ceab',
      requiresSignature: true,
    },
    {
      id: 'u2',
      name: 'Ana Lozano',
      departmentKey: 'taskSettings.general.departments.operations',
      color: '#4c6ef5',
      requiresSignature: true,
    },
    {
      id: 'u3',
      name: 'María Garza',
      departmentKey: 'taskSettings.general.departments.commercial',
      color: '#a78bfa',
      requiresSignature: true,
    },
    {
      id: 'u4',
      name: 'Jorge Leal',
      departmentKey: 'taskSettings.general.departments.finance',
      color: '#ca8a04',
      requiresSignature: false,
    },
  ]
}

export function createMockPendingSignatures(): GeneralPendingSignature[] {
  return [
    { id: 'ps1', userId: 'u3', weekLabel: '2026-08-03 → 2026-08-07' },
    { id: 'ps2', userId: 'u2', weekLabel: '2026-08-03 → 2026-08-07' },
  ]
}

/** Ejemplos visuales de capacidad según puntos máximos. */
export function buildCapacityExamples(capacity: number) {
  const capped = Math.min(Math.max(capacity, 5), 100)
  const quickOnly = capped
  const normalCount = Math.floor(capped / EFFORT_POINTS.normal)
  const quickAfterNormal = capped - normalCount * EFFORT_POINTS.normal
  const complexCount = Math.floor(capped / EFFORT_POINTS.complex)
  const afterComplex = capped - complexCount * EFFORT_POINTS.complex
  const mixNormal = Math.floor(afterComplex / EFFORT_POINTS.normal)
  const mixQuick = afterComplex - mixNormal * EFFORT_POINTS.normal

  return {
    quickOnly,
    normalCount,
    quickAfterNormal,
    complexCount,
    mixNormal,
    mixQuick,
  }
}
