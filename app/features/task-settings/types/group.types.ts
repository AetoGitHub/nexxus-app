/** Miembro embebido en el detalle de grupo. */
export interface CatalogueGroupMember {
  id: number
  username: string
}

/** Grupo de catálogo (GET /api/catalogues/groups/). */
export interface CatalogueGroup {
  id: number
  name: string
  color: string
  manager: number
  manager_name?: string
  created_by: number
  created_at: string
}

/** Detalle de grupo (GET /api/catalogues/groups/:id/). */
export interface CatalogueGroupDetail {
  id: number
  name: string
  color: string
  manager: number
  manager_name: string
  members: CatalogueGroupMember[]
  created_by: number
  created_at: string
  updated_at: string
}

export interface CreateCatalogueGroupPayload {
  name: string
  color: string
  manager: number
  members: number[]
}

export interface UpdateCatalogueGroupPayload {
  name: string
  color: string
  manager: number
  members: number[]
}

export interface GroupFormState {
  name: string
  /** Hex que espera el backend en create/update. */
  color: string
  manager: number | null
  members: number[]
}

export function createEmptyGroupForm(): GroupFormState {
  return {
    name: '',
    color: '#ef4444',
    manager: null,
    members: [],
  }
}

/** Prefill desde el listado (sin members). */
export function createGroupFormFromCatalogue(group: CatalogueGroup): GroupFormState {
  return {
    name: group.name,
    color: group.color,
    manager: group.manager,
    members: [],
  }
}

/** Prefill desde el detalle (incluye members, excluye al manager). */
export function createGroupFormFromDetail(detail: CatalogueGroupDetail): GroupFormState {
  return {
    name: detail.name,
    color: detail.color,
    manager: detail.manager,
    members: detail.members
      .map(member => member.id)
      .filter(id => id !== detail.manager),
  }
}

/** Manager + members del detail para labels del select (aunque no vengan en no_group). */
export function groupUsersFromDetail(detail: CatalogueGroupDetail): CatalogueGroupMember[] {
  const users = new Map<number, string>()
  if (detail.manager_name) {
    users.set(detail.manager, detail.manager_name)
  }
  for (const member of detail.members) {
    users.set(member.id, member.username)
  }
  return [...users.entries()].map(([id, username]) => ({ id, username }))
}
