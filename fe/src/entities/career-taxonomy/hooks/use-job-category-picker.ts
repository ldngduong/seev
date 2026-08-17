import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'

import { getJobCategoryTree } from '@/entities/career-taxonomy/api/career-taxonomy-api'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'

export function useJobCategoryPicker(
  value: string | null | undefined,
  onChange: (ids: string[], label: string) => void,
  options?: { allowGroup?: boolean },
) {
  const { allowGroup = false } = options ?? {}
  const [open, setOpen] = useState(false)
  const [activeGroupCode, setActiveGroupCode] = useState<string | null>(null)
  const [internalValue, setInternalValue] = useState<string | null>(null)
  const [draftCategoryId, setDraftCategoryId] = useState<string | null>(null)
  const [draftGroupCode, setDraftGroupCode] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const treeQuery = useQuery({
    queryKey: ['job-categories', 'it-tree'],
    queryFn: getJobCategoryTree,
  })
  const groups = treeQuery.data ?? []
  const selectedValue = value === undefined ? internalValue : value
  const isGroupValue = (candidate: string | null | undefined) =>
    Boolean(candidate && groups.some((group) => group.code === candidate))
  const selectedGroupByValue = groups.find(
    (group) => group.code === selectedValue,
  )
  const selectedCategory = isGroupValue(selectedValue)
    ? null
    : groups
        .flatMap((group) => group.categories)
        .find((category) => category.id === selectedValue)
  const selectedGroup =
    selectedGroupByValue ??
    groups.find((group) =>
      group.categories.some((category) => category.id === selectedValue),
    )
  const selectedLabel = selectedGroupByValue
    ? selectedGroupByValue.name
    : selectedCategory && selectedGroup
      ? `${selectedGroup.name} › ${selectedCategory.name}`
      : ''
  const normalizedQuery = useDebouncedValue(query.trim().toLowerCase(), 200)
  const visibleGroups = useMemo(
    () =>
      groups
        .map((group) => ({
          ...group,
          categories: group.categories.filter((category) =>
            [category.name, category.code, group.name]
              .join(' ')
              .toLowerCase()
              .includes(normalizedQuery),
          ),
        }))
        .filter((group) => !normalizedQuery || group.categories.length > 0),
    [groups, normalizedQuery],
  )
  const activeGroup =
    visibleGroups.find((group) => group.code === activeGroupCode) ??
    visibleGroups[0] ??
    null

  return {
    open,
    setOpen,
    query,
    setQuery,
    selectedCategoryId: selectedValue,
    selectedLabel,
    visibleGroups,
    activeGroup,
    setActiveGroupCode,
    draftCategoryId,
    setDraftCategoryId,
    draftGroupCode,
    setDraftGroupCode,
    allowGroup,
    isLoading: treeQuery.isLoading,
    openPicker: () => {
      setDraftCategoryId(isGroupValue(selectedValue) ? null : selectedValue)
      setDraftGroupCode(isGroupValue(selectedValue) ? selectedValue : null)
      setOpen(true)
    },
    choose: () => {
      if (allowGroup && draftGroupCode) {
        const group = groups.find((item) => item.code === draftGroupCode)
        if (!group) return
        setInternalValue(group.code)
        onChange([group.code], group.name)
        setOpen(false)
        return
      }
      const category = groups
        .flatMap((group) => group.categories)
        .find((item) => item.id === draftCategoryId)
      const group = groups.find((item) =>
        item.categories.some((candidate) => candidate.id === draftCategoryId),
      )
      if (!category || !group) return
      setInternalValue(category.id)
      onChange([category.id], `${group.name} › ${category.name}`)
      setOpen(false)
    },
    clear: () => {
      setInternalValue(null)
      setDraftCategoryId(null)
      setDraftGroupCode(null)
      onChange([], '')
      setOpen(false)
    },
  }
}