export interface JobCategory {
  id: string
  code: string
  name: string
  description: string | null
  display_order: number
}

export interface JobCategoryGroup {
  code: string
  name: string
  display_order: number
  categories: JobCategory[]
}

export interface JobCategorySearchResult extends JobCategory {
  group: { code: string; name: string }
}

export interface SeniorityLevel {
  id: string
  code: string
  track: 'entry' | 'ic' | 'senior_ic' | 'technical_leadership' | 'people_management'
  name: string
  displayName: string
  description: string | null
  displayOrder: number
  rankInTrack: number
  experienceMin: number | null
  experienceMax: number | null
  isActive: boolean
}
