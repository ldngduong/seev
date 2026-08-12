import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useBilling } from '@/features/billing/hooks/use-billing'

import { getSeniorityLevels } from '@/entities/career-taxonomy/api/career-taxonomy-api'
import {
  createCustomCvResearch,
  createQuickCvResearch,
  listUserCvs,
  MAX_CV_PAGE_SIZE,
} from '@/entities/cv/api/cv-api'

export type ResearchMode = 'quick' | 'custom'

export function useResearchCvPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const billing = useBilling()
  const [searchParams] = useSearchParams()
  const [mode, setMode] = useState<ResearchMode | null>(null)
  const [selectedCvId, setSelectedCvId] = useState('')
  const [selectedCategoryId, setSelectedCategoryIdValue] = useState('')
  const [seniorityLevelId, setSeniorityLevelId] = useState('')
  const [locations, setLocations] = useState<string[]>([])
  const cvsQuery = useQuery({
    queryKey: ['user-cvs', { page: 1, status: 'ready', purpose: 'research' }],
    queryFn: () => listUserCvs({ page: 1, pageSize: MAX_CV_PAGE_SIZE, status: 'ready' }),
  })
  const seniorityQuery = useQuery({
    queryKey: ['seniority-levels', selectedCategoryId],
    queryFn: () => getSeniorityLevels(selectedCategoryId),
    enabled: Boolean(selectedCategoryId),
  })
  const handleCreated = (session: { id: string }) => { void queryClient.invalidateQueries({ queryKey: ['billing', 'account'] }); void queryClient.invalidateQueries({ queryKey: ['dashboard', 'me'] }); void navigate(`/research-history/${session.id}`) }
  const quickMutation = useMutation({ mutationFn: createQuickCvResearch, onSuccess: handleCreated })
  const customMutation = useMutation({ mutationFn: createCustomCvResearch, onSuccess: handleCreated })

  useEffect(() => {
    const cvId = searchParams.get('cvId')
    if (cvId) setSelectedCvId(cvId)
  }, [searchParams])

  const setSelectedCategoryId = (value: string) => {
    setSelectedCategoryIdValue(value)
    setSeniorityLevelId('')
  }
  const submit = () => {
    if (mode === 'quick') return quickMutation.mutate(selectedCvId)
    if (mode === 'custom') customMutation.mutate({
      userCvId: selectedCvId,
      jobCategoryId: selectedCategoryId || undefined,
      seniorityLevelId: seniorityLevelId || undefined,
      locations: locations.length ? locations : undefined,
    })
  }
  const serviceCode = mode === 'quick' ? 'quick_research' : 'manual_research'
  const price = billing.products.find((product) => product.code === serviceCode)?.price_credits ?? null
  const hasEnoughCredits = price !== null && billing.balance !== null ? BigInt(billing.balance) >= BigInt(price) : true

  return {
    mode, setMode, selectedCvId, setSelectedCvId, selectedCategoryId,
    setSelectedCategoryId, seniorityLevelId, setSeniorityLevelId,
    locations, setLocations, cvs: cvsQuery.data?.items ?? [],
    seniorityLevels: seniorityQuery.data ?? [],
    isCvsLoading: cvsQuery.isLoading,
    isSeniorityLoading: seniorityQuery.isLoading,
    isSubmitting: quickMutation.isPending || customMutation.isPending,
    isError: quickMutation.isError || customMutation.isError,
    hasCustomTarget: Boolean(selectedCategoryId && seniorityLevelId),
    balance: billing.balance,
    price,
    hasEnoughCredits,
    submit,
  }
}
