export type TaskSettingsSectionId =
  | 'projects'
  | 'groups'
  | 'nexxtep'
  | 'videoCalls'
  | 'notifications'
  | 'general'

export type TaskSettingsProjectTab = 'all' | 'mine'

export interface TaskSettingsNavItem {
  id: TaskSettingsSectionId
  labelKey: string
  icon: string
}

export interface ProjectFormState {
  name: string
  color: string
  members: number[]
  responsible: number | null
}

export function createEmptyProjectForm(): ProjectFormState {
  return {
    name: '',
    color: 'red',
    members: [],
    responsible: null,
  }
}

/** Prefill del formulario de proyecto desde el listado de empresa. */
export function createProjectFormFromEnterprise(project: {
  name: string
  color: string
  members: { id: number }[]
  responsible?: number | null
}): ProjectFormState {
  return {
    name: project.name,
    color: project.color,
    members: project.members.map(member => member.id),
    responsible: project.responsible ?? null,
  }
}
