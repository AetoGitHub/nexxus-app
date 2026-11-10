export type ConfigurationSectionId = 'organization' | 'company' | 'user' | 'permissions'

export interface ConfigurationNavItem {
  id: ConfigurationSectionId
  labelKey: string
  icon: string
}
