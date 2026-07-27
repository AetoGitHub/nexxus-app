export type TaskSettingsSectionId =
  | 'themes'
  | 'groups'
  | 'nexxtep'
  | 'videoCalls'
  | 'notifications'
  | 'general'

export type TaskSettingsThemeTab = 'all' | 'mine'

export interface TaskSettingsNavItem {
  id: TaskSettingsSectionId
  labelKey: string
  icon: string
}

export interface ThemeFormState {
  name: string
  color: string
  members: number[]
}

export function createEmptyThemeForm(): ThemeFormState {
  return {
    name: '',
    color: 'red',
    members: [],
  }
}

/** Prefill del formulario de tema desde el listado de proyectos. */
export function createThemeFormFromProject(project: {
  name: string
  color: string
  members: { id: number }[]
}): ThemeFormState {
  return {
    name: project.name,
    color: project.color,
    members: project.members.map(member => member.id),
  }
}
