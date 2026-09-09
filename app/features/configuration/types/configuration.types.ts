export type ConfigurationSectionId = 'organization' | 'company' | 'user'

export interface ConfigurationNavItem {
  id: ConfigurationSectionId
  labelKey: string
  icon: string
}
