export interface PageMeta {
  page: number
  page_size: number
  total: number
  total_pages: number
}

export interface PaginatedResponse<T> {
  items: T[]
  meta: PageMeta
}

export interface CvListQuery {
  page?: number
  pageSize?: number
  search?: string
  status?: string
}

export interface ResearchSessionListQuery extends CvListQuery {
  type?: 'quick' | 'custom'
  userCvId?: string
}
