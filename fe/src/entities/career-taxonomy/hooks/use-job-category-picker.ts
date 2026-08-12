import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'

import { getJobCategoryTree } from '@/entities/career-taxonomy/api/career-taxonomy-api'

export function useJobCategoryPicker(value: string | null | undefined, onChange: (ids: string[], label: string) => void) {
  const [open, setOpen] = useState(false)
  const [activeGroupCode, setActiveGroupCode] = useState<string | null>(null)
  const [internalCategoryId, setInternalCategoryId] = useState<string | null>(null)
  const [draftCategoryId, setDraftCategoryId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const treeQuery = useQuery({ queryKey: ['job-categories', 'it-tree'], queryFn: getJobCategoryTree })
  const groups = treeQuery.data ?? []
  const selectedCategoryId = value === undefined ? internalCategoryId : value
  const selectedCategory = groups.flatMap((group) => group.categories).find((category) => category.id === selectedCategoryId)
  const selectedGroup = groups.find((group) => group.categories.some((category) => category.id === selectedCategoryId))
  const selectedLabel = selectedCategory && selectedGroup ? `${selectedGroup.name} › ${selectedCategory.name}` : ''
  const normalizedQuery = query.trim().toLowerCase()
  const visibleGroups = useMemo(() => groups.map((group) => ({
    ...group,
    categories: group.categories.filter((category) => [category.name, category.code, group.name].join(' ').toLowerCase().includes(normalizedQuery)),
  })).filter((group) => !normalizedQuery || group.categories.length > 0), [groups, normalizedQuery])
  const activeGroup = visibleGroups.find((group) => group.code === activeGroupCode) ?? visibleGroups[0] ?? null

  return {
    open, setOpen, query, setQuery, selectedCategoryId, selectedLabel, visibleGroups,
    activeGroup, setActiveGroupCode, draftCategoryId, setDraftCategoryId,
    isLoading: treeQuery.isLoading,
    openPicker: () => { setDraftCategoryId(selectedCategoryId); setOpen(true) },
    choose: () => {
      const category = groups.flatMap((group) => group.categories).find((item) => item.id === draftCategoryId)
      const group = groups.find((item) => item.categories.some((candidate) => candidate.id === draftCategoryId))
      if (!category || !group) return
      setInternalCategoryId(category.id)
      onChange([category.id], `${group.name} › ${category.name}`)
      setOpen(false)
    },
    clear: () => { setInternalCategoryId(null); setDraftCategoryId(null); onChange([], ''); setOpen(false) },
  }
}
